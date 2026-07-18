-- ============================================================
-- HOTFIX: "record v_coupon is not assigned yet" on checkout
-- ------------------------------------------------------------
-- Cause: when the customer checks out WITHOUT a coupon code,
-- v_coupon (a %ROWTYPE record) is never populated, but the
-- final INSERT still references v_coupon.code inside a CASE
-- expression. Postgres must resolve v_coupon's row type to
-- plan that INSERT, and fails because it was never assigned.
--
-- Fix: capture the coupon code into a plain TEXT variable
-- (v_coupon_code_used) instead of reading it back from the
-- record at insert time.
--
-- Safe to run: this is CREATE OR REPLACE, no data is touched,
-- no need to drop anything first.
-- ============================================================

create or replace function public.create_order_secure(
  p_customer_name    text,
  p_customer_phone   text,
  p_shipping_address text,
  p_payment_method   text,
  p_coupon_code      text,
  p_items            jsonb,
  p_client_token     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_qty int;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_items_out jsonb := '[]'::jsonb;
  v_coupon record;
  v_coupon_code_used text := null;   -- <<< NEW: plain text, safe when no coupon used
  v_order_id uuid;
  v_order_ref text;
  v_status text;
  v_recent_count int;
  v_rows_updated int;
  v_has_physical boolean := false;
begin
  ------------------------------------------------------------------
  -- أ) بيانات العميل الأساسية
  ------------------------------------------------------------------
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'برجاء إدخال اسم العميل بشكل صحيح' using errcode = 'P0001';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) < 8 then
    raise exception 'برجاء إدخال رقم هاتف صالح للتواصل عبر الواتساب' using errcode = 'P0001';
  end if;

  ------------------------------------------------------------------
  -- ب) Rate limiting: امنع أكتر من 5 طلبات لنفس المتصفح كل 10 دقايق
  ------------------------------------------------------------------
  if p_client_token is null or length(trim(p_client_token)) = 0 then
    raise exception 'missing_client_token';
  end if;

  select count(*) into v_recent_count
  from public.order_rate_limit
  where client_token = p_client_token and created_at > now() - interval '10 minutes';

  if v_recent_count >= 5 then
    raise exception 'تم إرسال عدد كبير من الطلبات، برجاء الانتظار قليلاً والمحاولة مرة أخرى' using errcode = 'P0001';
  end if;

  ------------------------------------------------------------------
  -- ج) تحقق من عناصر الطلب
  ------------------------------------------------------------------
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة' using errcode = 'P0001';
  end if;

  ------------------------------------------------------------------
  -- د) احسب السعر الحقيقي من جدول products وخصم المخزون بشكل ذري
  ------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'qty')::int, 0);
    if v_qty <= 0 then
      raise exception 'invalid_quantity' using errcode = 'P0001';
    end if;

    select id, name, price, stock, product_type
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found then
      raise exception 'أحد المنتجات لم يعد متاحًا بالنظام' using errcode = 'P0001';
    end if;

    if coalesce(v_product.product_type, 'physical') <> 'digital' then
      v_has_physical := true;
      update public.products
      set stock = stock - v_qty
      where id = v_product.id and stock >= v_qty;

      get diagnostics v_rows_updated = row_count;
      if v_rows_updated = 0 then
        raise exception 'عذرًا، الكمية المطلوبة من "%" غير متوفرة حاليًا', v_product.name using errcode = 'P0001';
      end if;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    v_items_out := v_items_out || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'qty', v_qty,
      'product_type', coalesce(v_product.product_type, 'physical')
    ));
  end loop;

  if v_has_physical and (p_shipping_address is null or length(trim(p_shipping_address)) = 0) then
    raise exception 'برجاء كتابة عنوان الشحن والتوصيل' using errcode = 'P0001';
  end if;

  ------------------------------------------------------------------
  -- هـ) تحقق من الكوبون واحسب الخصم من بيانات السيرفر الحقيقية
  ------------------------------------------------------------------
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons where lower(code) = lower(trim(p_coupon_code));

    if not found then
      raise exception 'كود الخصم غير صحيح' using errcode = 'P0001';
    end if;
    if not v_coupon.active then
      raise exception 'كود الخصم غير مفعّل' using errcode = 'P0001';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      raise exception 'كود الخصم منتهي الصلاحية' using errcode = 'P0001';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'تم استنفاد عدد مرات استخدام هذا الكود' using errcode = 'P0001';
    end if;
    if v_coupon.min_order is not null and v_subtotal < v_coupon.min_order then
      raise exception 'قيمة الطلب أقل من الحد الأدنى المطلوب لتفعيل الكود' using errcode = 'P0001';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := v_subtotal * (v_coupon.discount_value / 100.0);
    else
      v_discount := v_coupon.discount_value;
    end if;
    if v_discount > v_subtotal then v_discount := v_subtotal; end if;

    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;

    v_coupon_code_used := v_coupon.code;   -- <<< capture into plain text now, while it's safe
  end if;

  v_total := greatest(v_subtotal - v_discount, 0);

  ------------------------------------------------------------------
  -- و) رقم مرجع فريد + إنشاء الطلب
  ------------------------------------------------------------------
  v_order_ref := 'DLT-' || to_char(now(), 'YYMMDD') || '-' ||
                 upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));

  v_status := case when p_payment_method = 'bank_transfer' then 'pending_payment' else 'pending' end;

  insert into public.orders (
    order_ref, items, subtotal, discount, total, coupon_code, payment_method, status,
    customer_name, customer_phone, shipping_address
  ) values (
    v_order_ref, v_items_out, v_subtotal, v_discount, v_total,
    v_coupon_code_used,                -- <<< FIXED: no more v_coupon.code here
    p_payment_method, v_status,
    trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_shipping_address,'')),'')
  ) returning id into v_order_id;

  insert into public.order_rate_limit (client_token) values (p_client_token);

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_ref', v_order_ref,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_total
  );
end;
$$;

grant execute on function public.create_order_secure(text, text, text, text, text, jsonb, text) to anon, authenticated;
