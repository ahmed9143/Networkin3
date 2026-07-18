-- ============================================================
--  Delta IT Solutions — ملف قاعدة البيانات النهائي الموحّد
--  (يحل محل الثلاث ملفات القديمة: COMPLETE + supabase.sql + SECURITY-PATCH)
-- ============================================================
--  ⚠️ من دلوقتي فيه ملف واحد بس هو مصدر الحقيقة: هذا الملف.
--  احذف الثلاث ملفات القديمة من مشروعك ولا تشغّلهم تاني أبدًا،
--  لأنهم كانوا فيهم نسختين متعارضتين من نفس الدالة create_order_secure
--  بتوقيعات (parameters) مختلفة، وده كان ممكن يسبب تضارب صامت.
--
--  آمن للتشغيل على:
--  ✅ مشروع جديد من الصفر
--  ✅ مشروع شغال عليه أي نسخة قديمة من الملفات التلاتة
--  كله IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE، فمفيش
--  فقدان بيانات لو شغّلته فوق مشروع شغال بالفعل.
--
--  إزاي تشغّله:
--  1) Supabase Dashboard > SQL Editor > New query
--  2) الصق الملف كامل من أول سطر لآخر سطر > Run
--  3) لو أول مرة: Authentication > Users > Add user (إيميل/باسورد الأدمن)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) الأقسام (Categories)
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '📦',
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;
drop policy if exists "Public read categories" on public.categories;
drop policy if exists "Auth manage categories" on public.categories;

create policy "Public read categories" on public.categories for select using (true);
create policy "Auth manage categories" on public.categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 2) المنتجات (Products)
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  brand text,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2),
  stock int default 0,
  featured boolean default false,
  is_bestseller boolean default false,
  image_url text,
  images jsonb default '[]'::jsonb,
  product_type text not null default 'physical', -- 'physical' | 'digital'
  digital_file_path text,
  digital_file_path_2 text,
  created_at timestamptz default now()
);

-- إضافة أعمدة بأمان لو الجدول كان موجود قبل كده من نسخة أقدم
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists old_price numeric(12,2);
alter table public.products add column if not exists is_bestseller boolean default false;
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists product_type text not null default 'physical';
alter table public.products add column if not exists digital_file_path text;
alter table public.products add column if not exists digital_file_path_2 text;

-- أعمدة مواصفات دقيقة لمساعد اختيار الكاميرا وفلتر البصمة (بدل التخمين من النص)
alter table public.products add column if not exists installation_type text; -- 'indoor' | 'outdoor' | 'both' (للكاميرات)
alter table public.products add column if not exists connection_type text;   -- 'ip' | 'analog' (للكاميرات وأجهزة التسجيل)
alter table public.products add column if not exists channels int;          -- عدد القنوات (لأجهزة NVR/DVR فقط)
alter table public.products add column if not exists bio_type text;         -- 'fingerprint' | 'face' | 'card' | 'face_finger' (لأجهزة البصمة)
alter table public.products add column if not exists bio_use text;          -- 'attendance' | 'access' | 'both' (لأجهزة البصمة)

alter table public.products enable row level security;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Auth manage products" on public.products;

create policy "Public read products" on public.products for select using (true);
-- ملحوظة أمنية: السياسة دي الوحيدة اللي بتسمح بأي insert/update/delete،
-- وبتشترط auth.role()='authenticated'، يعني زائر anon مينفعش يعدّل/يمسح
-- أي منتج أو يغيّر السعر أو المخزون مباشرة من الفرونت إند تحت أي ظرف،
-- ده غير محتاج لأي policy إضافية لأن غياب أي policy لـ anon = رفض تلقائي.
create policy "Auth manage products" on public.products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_name on public.products (name);
create index if not exists idx_products_featured on public.products (featured) where featured = true;
create index if not exists idx_products_stock on public.products (stock) where stock < 5;
create index if not exists idx_products_installation_type on public.products (installation_type);
create index if not exists idx_products_connection_type on public.products (connection_type);
create index if not exists idx_products_bio_type on public.products (bio_type);

-- ============================================================
-- 3) الكوبونات (Coupons)
-- ============================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null default 'percent',
  discount_value numeric(12,2) not null,
  min_order numeric(12,2) default 0,
  usage_limit int,
  used_count int default 0,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.coupons enable row level security;
drop policy if exists "Public read coupons" on public.coupons;
drop policy if exists "Auth manage coupons" on public.coupons;

create policy "Public read coupons" on public.coupons for select using (true);
create policy "Auth manage coupons" on public.coupons for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- ملحوظة: مفيش policy تسمح لـ anon يعدّل used_count مباشرة. التحديث بيحصل
-- فقط جوه دالة create_order_secure (security definer) تحت.

-- ============================================================
-- 4) الطلبات (Orders)
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique,
  customer_name text,
  customer_phone text,
  shipping_address text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) default 0,
  total numeric(12,2) not null default 0,
  coupon_code text,
  payment_method text default 'whatsapp_cod', -- 'whatsapp_cod' | 'bank_transfer'
  status text default 'pending', -- pending | pending_payment | confirmed | shipped | completed | cancelled
  download_ready boolean default false,
  digital_link text, -- JSON: [{"name":"...","url":"..."}]
  created_at timestamptz default now()
);

alter table public.orders add column if not exists order_ref text;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists download_ready boolean default false;
alter table public.orders add column if not exists digital_link text;
-- unique index منفصل عشان لو الجدول كان موجود قبل كده بدون order_ref
create unique index if not exists idx_orders_order_ref_unique on public.orders (order_ref) where order_ref is not null;

alter table public.orders enable row level security;

-- ------------------------------------------------------------
-- 🔒 التغيير الأمني الأهم: لا توجد أي policy تسمح بـ INSERT مباشر
-- من anon على جدول orders. الطريقة الوحيدة لإنشاء طلب هي عن طريق
-- دالة create_order_secure تحت (SECURITY DEFINER)، اللي بتتخطى RLS
-- من جوّها وبتحسب كل حاجة من بيانات السيرفر الحقيقية.
-- ------------------------------------------------------------
drop policy if exists "Public can create orders" on public.orders;
drop policy if exists "Auth read orders" on public.orders;
drop policy if exists "Auth manage orders" on public.orders;
drop policy if exists "Auth delete orders" on public.orders;

create policy "Auth read orders" on public.orders for select
  using (auth.role() = 'authenticated');
create policy "Auth manage orders" on public.orders for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth delete orders" on public.orders for delete
  using (auth.role() = 'authenticated');

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ============================================================
-- 5) Rate limiting لمنع سبام الطلبات (بدون أي policy = مقفول تمامًا)
-- ============================================================
create table if not exists public.order_rate_limit (
  id uuid primary key default gen_random_uuid(),
  client_token text not null,
  created_at timestamptz default now()
);
alter table public.order_rate_limit enable row level security;
create index if not exists idx_order_rate_limit_token_time
  on public.order_rate_limit (client_token, created_at desc);

-- تنظيف تلقائي بسيط: احتفظ فقط بسجلات آخر يوم (تشغيل يدوي اختياري،
-- أو تقدر تعمله Cron job من Supabase لاحقًا لو حبيت)
-- delete from public.order_rate_limit where created_at < now() - interval '1 day';

-- ============================================================
-- 6) طلبات المقايسة (Quote Requests)
-- ============================================================
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  facility_type text,
  coverage_metrics text,
  details text not null,
  status text default 'new', -- new | contacted | quoted | closed
  created_at timestamptz default now()
);
alter table public.quote_requests add column if not exists facility_type text;
alter table public.quote_requests add column if not exists coverage_metrics text;

alter table public.quote_requests enable row level security;
drop policy if exists "Public can create quote requests" on public.quote_requests;
drop policy if exists "Auth read quote requests" on public.quote_requests;
drop policy if exists "Auth manage quote requests" on public.quote_requests;
drop policy if exists "Auth delete quote requests" on public.quote_requests;

create policy "Public can create quote requests" on public.quote_requests
  for insert with check (true);
create policy "Auth read quote requests" on public.quote_requests
  for select using (auth.role() = 'authenticated');
create policy "Auth manage quote requests" on public.quote_requests
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth delete quote requests" on public.quote_requests
  for delete using (auth.role() = 'authenticated');

create index if not exists idx_quote_requests_status on public.quote_requests (status);
create index if not exists idx_quote_requests_created_at on public.quote_requests (created_at desc);

-- ============================================================
-- 7) ملفات التنزيلات العامة (Downloads)
-- ============================================================
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'عام',
  file_path text not null,
  file_size_label text,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.downloads enable row level security;
drop policy if exists "Public read downloads" on public.downloads;
drop policy if exists "Auth manage downloads" on public.downloads;

create policy "Public read downloads" on public.downloads for select using (true);
create policy "Auth manage downloads" on public.downloads for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_downloads_category on public.downloads (category);

-- ============================================================
-- 8) Storage Buckets
-- ============================================================
insert into storage.buckets (id, name, public) values ('products','products', true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('digital-products','digital-products', false)
  on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public) values ('public-downloads','public-downloads', true)
  on conflict (id) do update set public = true;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Auth upload product images" on storage.objects;
drop policy if exists "Auth update product images" on storage.objects;
drop policy if exists "Auth delete product images" on storage.objects;
create policy "Public read product images" on storage.objects for select using (bucket_id = 'products');
create policy "Auth upload product images" on storage.objects for insert
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
create policy "Auth update product images" on storage.objects for update
  using (bucket_id = 'products' and auth.role() = 'authenticated')
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
create policy "Auth delete product images" on storage.objects for delete
  using (bucket_id = 'products' and auth.role() = 'authenticated');

drop policy if exists "Auth read digital files" on storage.objects;
drop policy if exists "Auth upload digital files" on storage.objects;
drop policy if exists "Auth update digital files" on storage.objects;
drop policy if exists "Auth delete digital files" on storage.objects;
create policy "Auth read digital files" on storage.objects for select
  using (bucket_id = 'digital-products' and auth.role() = 'authenticated');
create policy "Auth upload digital files" on storage.objects for insert
  with check (bucket_id = 'digital-products' and auth.role() = 'authenticated');
create policy "Auth update digital files" on storage.objects for update
  using (bucket_id = 'digital-products' and auth.role() = 'authenticated')
  with check (bucket_id = 'digital-products' and auth.role() = 'authenticated');
create policy "Auth delete digital files" on storage.objects for delete
  using (bucket_id = 'digital-products' and auth.role() = 'authenticated');

drop policy if exists "Public read download files" on storage.objects;
drop policy if exists "Auth upload download files" on storage.objects;
drop policy if exists "Auth update download files" on storage.objects;
drop policy if exists "Auth delete download files" on storage.objects;
create policy "Public read download files" on storage.objects for select using (bucket_id = 'public-downloads');
create policy "Auth upload download files" on storage.objects for insert
  with check (bucket_id = 'public-downloads' and auth.role() = 'authenticated');
create policy "Auth update download files" on storage.objects for update
  using (bucket_id = 'public-downloads' and auth.role() = 'authenticated')
  with check (bucket_id = 'public-downloads' and auth.role() = 'authenticated');
create policy "Auth delete download files" on storage.objects for delete
  using (bucket_id = 'public-downloads' and auth.role() = 'authenticated');

-- ============================================================
-- 9) تنظيف: احذف كل النسخ القديمة المتعارضة من الدوال
-- ============================================================
drop function if exists public.create_order_secure(jsonb, text, text, text);
drop function if exists public.create_order_secure(text, text, text, text, text, jsonb);
drop function if exists public.decrement_stock(uuid, int);

-- ============================================================
-- 10) decrement_stock — بقيت للاستخدام اليدوي من الأدمن فقط
--     (تصحيح مخزون يدوي)، مش جزء من مسار إنشاء الطلب العام
-- ============================================================
create function public.decrement_stock(p_id uuid, qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set stock = greatest(stock - qty, 0) where id = p_id;
end;
$$;
revoke all on function public.decrement_stock(uuid, int) from public, anon;
grant execute on function public.decrement_stock(uuid, int) to authenticated;

-- ============================================================
-- 11) 🔐 الدالة الأساسية: إنشاء طلب آمن بالكامل من السيرفر
--     نسخة موحّدة نهائية تجمع بين: حساب السعر الحقيقي من السيرفر +
--     خصم مخزون ذري + فحص كوبون حقيقي + بيانات عميل + rate limiting
-- ============================================================
create or replace function public.create_order_secure(
  p_customer_name    text,
  p_customer_phone   text,
  p_shipping_address text,          -- ممكن تبقى null لو الطلب كله منتجات رقمية
  p_payment_method   text,          -- 'whatsapp_cod' | 'bank_transfer'
  p_coupon_code      text,          -- ممكن تبقى null
  p_items            jsonb,         -- [{"product_id":"uuid","qty":2}, ...]
  p_client_token     text           -- معرّف عشوائي ثابت من متصفح العميل (لـ rate limiting فقط)
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
    case when p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then v_coupon.code else null end,
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

-- ============================================================
-- 12) تتبع الطلب (بيانات محدودة فقط، آمن للعرض العام)
-- ============================================================
create or replace function public.get_order_status(p_ref text)
returns table(
  order_ref text, status text, total numeric, items jsonb,
  download_ready boolean, digital_link text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select o.order_ref, o.status, o.total, o.items, o.download_ready, o.digital_link, o.created_at
  from public.orders o
  where o.order_ref = p_ref
  limit 1;
end;
$$;
grant execute on function public.get_order_status(text) to anon, authenticated;

-- ============================================================
-- 13) تحديث حالة الطلب من الأدمن + إرجاع/خصم المخزون تلقائيًا
--     عند الإلغاء/إعادة التنشيط (يستخدمها admin.html بدل التحديث المباشر)
-- ============================================================
create or replace function public.update_order_status_secure(
  target_order_id uuid,
  new_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_items jsonb;
  v_item record;
begin
  select status, items into v_current_status, v_items from public.orders where id = target_order_id;
  if not found then
    raise exception 'الطلب غير موجود' using errcode = 'P0001';
  end if;

  if new_status = 'cancelled' and v_current_status <> 'cancelled' then
    for v_item in select * from jsonb_to_recordset(v_items) as x(product_id uuid, qty int, product_type text)
    loop
      if coalesce(v_item.product_type,'physical') <> 'digital' then
        update public.products set stock = stock + v_item.qty where id = v_item.product_id;
      end if;
    end loop;
  elsif v_current_status = 'cancelled' and new_status <> 'cancelled' then
    for v_item in select * from jsonb_to_recordset(v_items) as x(product_id uuid, qty int, product_type text)
    loop
      if coalesce(v_item.product_type,'physical') <> 'digital' then
        update public.products set stock = greatest(stock - v_item.qty, 0) where id = v_item.product_id;
      end if;
    end loop;
  end if;

  update public.orders set status = new_status where id = target_order_id;
  return true;
end;
$$;

revoke all on function public.update_order_status_secure(uuid, text) from public, anon;
grant execute on function public.update_order_status_secure(uuid, text) to authenticated;

-- ============================================================
-- 14) فهارس إضافية لأداء أفضل مع نمو البيانات (Large Scale)
-- ============================================================
create index if not exists idx_orders_customer_phone on public.orders (customer_phone);
create index if not exists idx_coupons_code on public.coupons (lower(code));

-- ============================================================
--  ✅ تم بنجاح — النظام دلوقتي:
--  - دالة create_order_secure واحدة فقط بدون تعارض توقيعات
--  - كل الأسعار/الخصومات/المخزون بتتحسب وتتخصم من السيرفر فقط
--  - عمود order_ref فريد، تتبع الطلب شغال، وأدمن قادر يلغي/يعيد
--    تنشيط الطلب مع إرجاع/خصم المخزون تلقائيًا وبأمان
--  - Rate limiting بسيط ضد سبام الطلبات
--
--  ⚠️ الخطوة التالية إجبارية: لازم تعدّل index.html و admin.html
--  عشان يستخدموا الدالة الجديدة بدل الـ insert المباشر القديم -
--  التعديلات دي موجودة في نفس الرد.
-- ============================================================

-- ============================================================
-- 15) Camera Selection Assistant — أعمدة إضافية للمنتجات
--     (مساعد اختيار الكاميرا: ترشيح حسب الميزات + أولوية الأدمن)
--     ⚠️ نفّذ هذا الجزء لو مش مُنفذ عندك بالفعل
-- ============================================================
alter table public.products add column if not exists tags jsonb default '[]'::jsonb;
-- القيم المدعومة داخل tags (Array of text): 'full_color','ir_night','audio','ai_detection','face_recognition'
alter table public.products add column if not exists recommendation_priority int default 0;
-- رقم أعلى = أولوية أعلى في الترشيح (يتحكم فيه الأدمن فقط من لوحة التحكم)
create index if not exists idx_products_recommendation_priority on public.products (recommendation_priority desc);
