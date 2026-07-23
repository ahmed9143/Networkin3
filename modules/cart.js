/* cart.js — cart, wishlist, coupons, checkout (WhatsApp COD / bank transfer), order lookup. */

function addToCart(id, btn){
  cart[id] = (cart[id] || 0) + 1;
  saveCartAndRefresh();
  const original = btn.innerHTML;
  btn.style.background = '#1fae6b'; btn.innerHTML = '✓ أضيف للسلة';
  setTimeout(()=>{ btn.style.background=''; btn.innerHTML=original; }, 900);
}
function changeQty(id, delta){
  if(cart[id]){ cart[id]+=delta; if(cart[id]<=0) delete cart[id]; saveCartAndRefresh(); }
}
function removeFromCart(id){ delete cart[id]; saveCartAndRefresh(); }
function saveCartAndRefresh(){ localStorage.setItem('it_pro_cart', JSON.stringify(cart)); updateCartUI(); }

/* ---------------- Wishlist ---------------- */
function isInWishlist(id){ return wishlist.includes(String(id)); }

function toggleWishlist(id){
  id = String(id);
  const idx = wishlist.indexOf(id);
  if(idx > -1){ wishlist.splice(idx,1); } else { wishlist.push(id); }
  localStorage.setItem('it_pro_wishlist', JSON.stringify(wishlist));
  const nowWished = isInWishlist(id);
  document.querySelectorAll(`.wish-btn[data-id="${id}"]`).forEach(btn=>{
    btn.classList.toggle('active', nowWished);
    btn.innerHTML = nowWished ? '♥' : '♡';
  });
  updateWishlistUI();
}

function updateWishlistUI(){
  const badge = document.getElementById('wishlistCountBadge');
  if(badge) badge.innerText = wishlist.length;
  renderWishlistDrawer();
}

function renderWishlistDrawer(){
  const container = document.getElementById('wishlistItemsContainer');
  if(!container) return;
  const items = products.filter(p => isInWishlist(p.id));
  if(items.length === 0){
    container.innerHTML = '<div class="cart-empty-msg">قائمة المفضلة فارغة حالياً.<br>اضغط ♡ على أي منتج عشان تضيفه هنا.</div>';
    return;
  }
  container.innerHTML = items.map(p=>{
    const cover = (p.images && p.images.length) ? p.images[0] : (p.image_url || 'https://placehold.co/100x100/10294f/9fb0d1?text=No+Image');
    return `<div class="cart-item">
      <img class="wishlist-item-thumb" src="${cover}" alt="${p.name}" onclick="closeWishlistDrawer(); openProductDetail('${p.id}');" style="cursor:pointer;">
      <div class="cart-item-details" style="flex:1;">
        <div class="cart-item-title">${p.name}</div>
        <div class="cart-item-price">${Number(p.price).toLocaleString('ar-EG')} ج.م</div>
        <button class="add-btn" style="padding:6px 10px;font-size:12px;margin-top:2px;" onclick="addToCart('${p.id}', this)">🛒 أضف للسلة</button>
      </div>
      <button class="remove-item" onclick="toggleWishlist('${p.id}')">حذف</button>
    </div>`;
  }).join('');
}

function openWishlistDrawer(){ document.getElementById('wishlistDrawer').classList.add('open'); document.getElementById('wishlistOverlay').classList.add('open'); }
function closeWishlistDrawer(){ document.getElementById('wishlistDrawer').classList.remove('open'); document.getElementById('wishlistOverlay').classList.remove('open'); }

function calcTotals(){
  let subtotal = 0;
  Object.keys(cart).forEach(id=>{
    const p = products.find(x=>x.id==id);
    if(p) subtotal += p.price*cart[id];
  });
  let discount = 0;
  if(appliedCoupon && subtotal >= (appliedCoupon.min_order || 0)){
    discount = appliedCoupon.discount_type === 'percent' ? subtotal * (appliedCoupon.discount_value/100) : appliedCoupon.discount_value;
    if(discount > subtotal) discount = subtotal;
  }
  return { subtotal, discount, total: subtotal - discount };
}

async function applyCoupon(){
  const codeInput = document.getElementById('couponCodeInput');
  const msgEl = document.getElementById('couponMsg');
  const code = codeInput.value.trim();
  msgEl.innerText = ''; msgEl.className = 'coupon-msg';
  if(!code) return;
  const { data, error } = await sb.from('coupons').select('*').ilike('code', code).maybeSingle();
  if(error || !data){ msgEl.innerText = 'الكود غير موجود'; msgEl.classList.add('err'); return; }
  if(!data.active){ msgEl.innerText = 'الكود غير مفعل حاليًا'; msgEl.classList.add('err'); return; }
  if(data.expires_at && new Date(data.expires_at) < new Date()){ msgEl.innerText = 'الكود منتهي الصلاحية'; msgEl.classList.add('err'); return; }
  if(data.usage_limit && data.used_count >= data.usage_limit){ msgEl.innerText = 'تم استخدام الكود بالكامل'; msgEl.classList.add('err'); return; }
  const { subtotal } = calcTotals();
  if(data.min_order && subtotal < data.min_order){ msgEl.innerText = `الحد الأدنى للطلب ${Number(data.min_order).toLocaleString('ar-EG')} ج.م`; msgEl.classList.add('err'); return; }
  appliedCoupon = data;
  msgEl.innerText = 'تم تفعيل الكود بنجاح!'; msgEl.classList.add('ok');
  codeInput.value = '';
  updateCartUI();
}
function removeCoupon(){ appliedCoupon = null; updateCartUI(); }

function setPayMethod(method){
  currentPayMethod = method;
  document.getElementById('payOptWhatsapp').classList.toggle('selected', method==='whatsapp_cod');
  document.getElementById('payOptBank').classList.toggle('selected', method==='bank_transfer');
}

function updateCartUI(){
  let totalCount=0;
  Object.keys(cart).forEach(id=>{ totalCount += cart[id]; });
  const { subtotal, discount, total } = calcTotals();
  const container = document.getElementById('cartItemsContainer');

  document.getElementById('cartCountBadge').innerText = totalCount;
  document.getElementById('cartTotalHeader').innerText = total.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('cartDrawerTotal').innerText = total.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('cartSubtotalRow').style.display = discount>0 ? 'flex' : 'none';
  document.getElementById('cartSubtotalVal').innerText = subtotal.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('cartDiscountRow').style.display = discount>0 ? 'flex' : 'none';
  document.getElementById('cartDiscountVal').innerText = '- '+discount.toLocaleString('ar-EG')+' ج.م';

  const couponBox = document.getElementById('couponAppliedBox');
  const couponRow = document.getElementById('couponInputRow');
  if(appliedCoupon){
    couponBox.innerHTML = `<div class="coupon-applied"><span>✓ كود "${appliedCoupon.code}" مفعل</span><button onclick="removeCoupon()">إلغاء</button></div>`;
    couponRow.style.display = 'none';
  } else {
    couponBox.innerHTML = '';
    couponRow.style.display = 'flex';
  }

  if(totalCount===0){
    container.innerHTML = '<div class="cart-empty-msg">سلة المشتريات فارغة حالياً.</div>';
  } else {
    container.innerHTML = Object.keys(cart).map(id=>{
      const p = products.find(x=>x.id==id);
      if(!p) return '';
      return `<div class="cart-item">
        <div class="cart-item-details">
          <div class="cart-item-title">${p.name}</div>
          <div class="cart-item-price">${(p.price*cart[id]).toLocaleString('ar-EG')} ج.م</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${p.id}',-1)">-</button>
            <span>${cart[id]}</span>
            <button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>
          </div>
        </div>
        <button class="remove-item" onclick="removeFromCart('${p.id}')">حذف</button>
      </div>`;
    }).join('');
  }
}

function buildItemsPayload(){
  return Object.keys(cart).map(id=>{
    const p = products.find(x=>x.id==id);
    return p ? { product_id: p.id, name: p.name, price: p.price, qty: cart[id], product_type: p.product_type || 'physical' } : null;
  }).filter(Boolean);
}

function cartHasDigitalItems(){
  return Object.keys(cart).some(id=>{
    const p = products.find(x=>x.id==id);
    return p && p.product_type === 'digital';
  });
}

// معرّف ثابت للمتصفح (يُستخدم فقط لتحديد معدل الطلبات ضد السبام - rate limiting)
function getClientToken(){
  let t = localStorage.getItem('it_client_token');
  if(!t){
    t = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10);
    localStorage.setItem('it_client_token', t);
  }
  return t;
}

function validateCheckoutFields(){
  const name = document.getElementById('custCheckoutName').value.trim();
  const phone = document.getElementById('custCheckoutPhone').value.trim();
  const address = document.getElementById('custCheckoutAddress').value.trim();
  const errBox = document.getElementById('checkoutFieldsErr');
  if(!name){ errBox.innerText = 'برجاء إدخال الاسم بالكامل.'; return null; }
  if(!phone || phone.length < 8){ errBox.innerText = 'برجاء إدخال رقم هاتف صحيح.'; return null; }
  if(!cartIsDigitalOnly() && !address){ errBox.innerText = 'برجاء إدخال عنوان الشحن والتوصيل.'; return null; }
  errBox.innerText = '';
  return { name, phone, address };
}

function cartIsDigitalOnly(){
  const items = buildItemsPayload();
  return items.length > 0 && items.every(it => it.product_type === 'digital');
}

// إنشاء الطلب بالكامل عن طريق دالة السيرفر الآمنة create_order_secure.
// السيرفر هو اللي بيحسب السعر/الخصم/المخزون من بيانات المنتجات والكوبونات
// الحقيقية - مفيش أي سعر بييجي من المتصفح، فمينفعش حد يتلاعب بالطلب.
async function createOrderRecord(paymentMethod, custInfo){
  const items = buildItemsPayload().map(it => ({ product_id: it.product_id, qty: it.qty }));
  const { data, error } = await sb.rpc('create_order_secure', {
    p_customer_name: custInfo.name,
    p_customer_phone: custInfo.phone,
    p_shipping_address: custInfo.address || null,
    p_payment_method: paymentMethod,
    p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
    p_items: items,
    p_client_token: getClientToken()
  });
  if(error){
    console.error('create_order_secure error', error);
    throw new Error(error.message || 'تعذر إنشاء الطلب. برجاء المحاولة مرة أخرى.');
  }
  return data; // { success, order_id, order_ref, subtotal, discount, total }
}

function clearCartAfterOrder(){
  cart = {}; appliedCoupon = null;
  localStorage.setItem('it_pro_cart', '{}');
  updateCartUI();
  document.getElementById('custCheckoutName').value = '';
  document.getElementById('custCheckoutPhone').value = '';
  document.getElementById('custCheckoutAddress').value = '';
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

function showCheckoutOrderErr(msg){
  const box = document.getElementById('checkoutOrderErr');
  const msgEl = document.getElementById('checkoutOrderErrMsg');
  if(!box || !msgEl) return;
  msgEl.textContent = msg;
  box.classList.add('show');
}
function hideCheckoutOrderErr(){
  const box = document.getElementById('checkoutOrderErr');
  if(box) box.classList.remove('show');
}
function retryCheckout(){
  hideCheckoutOrderErr();
  startCheckout();
}

function startCheckout(){
  hideCheckoutOrderErr();
  const keys = Object.keys(cart);
  if(keys.length===0) return alert('برجاء إضافة منتجات للسلة أولاً!');
  const custInfo = validateCheckoutFields();
  if(!custInfo) return;
  if(currentPayMethod === 'bank_transfer'){ pendingCustInfo = custInfo; openBankModal(); }
  else { completeWhatsappOrder(custInfo); }
}

let pendingCustInfo = null;

async function completeWhatsappOrder(custInfo){
  const btn = document.getElementById('checkoutWhatsappBtn');
  btn.disabled = true; const originalLabel = btn.innerText; btn.innerText = 'جاري تسجيل الطلب...';
  const itemsSnapshot = buildItemsPayload();
  const hasDigital = cartHasDigitalItems();
  let result;
  try{
    result = await createOrderRecord('whatsapp_cod', custInfo);
  }catch(e){
    showCheckoutOrderErr(e.message || 'حدث خطأ غير متوقع أثناء تسجيل الطلب. برجاء المحاولة مرة أخرى، ولو استمرت المشكلة تواصل معنا مباشرة.');
    btn.disabled = false; btn.innerText = originalLabel;
    return;
  }
  btn.disabled = false; btn.innerText = originalLabel;
  let msg = "🛒 *طلب جديد - Delta IT Solutions*\n-------------------------\n\n";
  msg += `👤 *العميل:* ${custInfo.name}\n📞 *الهاتف:* ${custInfo.phone}\n`;
  if(custInfo.address) msg += `📍 *العنوان:* ${custInfo.address}\n`;
  msg += "\n";
  itemsSnapshot.forEach(it=>{
    msg += `▪️ *${it.name}*\n   العدد: ${it.qty} | إجمالي: ${(it.price*it.qty).toLocaleString('ar-EG')} ج.م\n\n`;
  });
  msg += "-------------------------\n";
  if(result.discount>0) msg += `الخصم${appliedCoupon?' ('+appliedCoupon.code+')':''}: -${Number(result.discount).toLocaleString('ar-EG')} ج.م\n`;
  msg += `💰 *الإجمالي:* ${Number(result.total).toLocaleString('ar-EG')} ج.م\n🔖 *مرجع الطلب:* ${result.order_ref}\n`;
  if(hasDigital) msg += `💾 الطلب يحتوي منتج رقمي - هيتبعتلك رابط التحميل هنا فور تأكيد الطلب.\n`;
  msg += `\nبرجاء تأكيد الطلب وتحديد ميعاد التسليم/التركيب المناسب.\nتقدر تتابع حالة طلبك في أي وقت من صفحة "تتبع الطلب" على الموقع برقم المرجع اللي فوق.`;
  clearCartAfterOrder();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openBankModal(){
  const b = BANK_DETAILS;
  document.getElementById('bankDetailsContainer').innerHTML = `
    <div class="bank-detail-row"><span>البنك</span><b>${b.bankName}</b></div>
    <div class="bank-detail-row"><span>اسم الحساب</span><b>${b.accountName}</b></div>
    <div class="bank-detail-row"><span>رقم الحساب</span><b>${b.accountNumber}</b><button class="copy-btn" onclick="navigator.clipboard.writeText('${b.accountNumber}')">نسخ</button></div>
    <div class="bank-detail-row"><span>IBAN</span><b>${b.iban}</b><button class="copy-btn" onclick="navigator.clipboard.writeText('${b.iban}')">نسخ</button></div>
    <div class="bank-detail-row"><span>إنستاباي</span><b>${b.instapayHandle}</b></div>
    <div class="bank-detail-row"><span>فودافون كاش</span><b>${b.vodafoneCash}</b></div>`;
  document.getElementById('bankModalOverlay').classList.add('open');
}
function closeBankModal(){ document.getElementById('bankModalOverlay').classList.remove('open'); }

async function confirmBankOrder(){
  if(!pendingCustInfo){ closeBankModal(); return; }
  const custInfo = pendingCustInfo;
  const itemsSnapshot = buildItemsPayload();
  const hasDigital = cartHasDigitalItems();
  let result;
  try{
    result = await createOrderRecord('bank_transfer', custInfo);
  }catch(e){
    closeBankModal();
    showCheckoutOrderErr(e.message || 'حدث خطأ غير متوقع أثناء تسجيل الطلب. برجاء المحاولة مرة أخرى، ولو استمرت المشكلة تواصل معنا مباشرة.');
    return;
  }
  let msg = "🏦 *طلب جديد (تحويل بنكي) - Delta IT Solutions*\n-------------------------\n\n";
  msg += `👤 *العميل:* ${custInfo.name}\n📞 *الهاتف:* ${custInfo.phone}\n`;
  if(custInfo.address) msg += `📍 *العنوان:* ${custInfo.address}\n`;
  msg += "\n";
  itemsSnapshot.forEach(it=>{
    msg += `▪️ *${it.name}*\n   العدد: ${it.qty} | إجمالي: ${(it.price*it.qty).toLocaleString('ar-EG')} ج.م\n\n`;
  });
  msg += "-------------------------\n";
  if(result.discount>0) msg += `الخصم: -${Number(result.discount).toLocaleString('ar-EG')} ج.م\n`;
  msg += `💰 *الإجمالي:* ${Number(result.total).toLocaleString('ar-EG')} ج.م\n🔖 *مرجع الطلب:* ${result.order_ref}\n`;
  if(hasDigital) msg += `💾 الطلب يحتوي منتج رقمي - هيتبعتلك رابط التحميل هنا فور تأكيد التحويل.\n`;
  msg += `\nتم التحويل، مرفق صورة الإيصال. برجاء تأكيد الطلب.\nتقدر تتابع حالة طلبك في أي وقت من صفحة "تتبع الطلب" على الموقع برقم المرجع اللي فوق.`;
  pendingCustInfo = null;
  closeBankModal();
  clearCartAfterOrder();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* Lightweight client-side throttle for public forms (quote request / order tracking).
   This is NOT a substitute for real server-side rate limiting (a bot can always bypass
   client JS) - it just raises the bar against casual spam/scripted abuse from the browser.
   For hard protection, add a Supabase Edge Function or database trigger that checks
   submission counts per IP/phone server-side. */
async function lookupOrder(){
  const box = document.getElementById('trackResultBox');
  const btn = document.getElementById('trackBtn');
  const ref = document.getElementById('trackRefInput').value.trim();
  if(!ref){ box.innerHTML = '<div class="track-err">برجاء إدخال رقم مرجع الطلب.</div>'; return; }
  if(!checkRateLimit('track_order', 10, 5*60*1000)){
    box.innerHTML = '<div class="track-err">محاولات كتير في وقت قصير - برجاء الانتظار كام دقيقة وإعادة المحاولة.</div>';
    return;
  }
  btn.disabled = true; btn.innerText = 'جاري البحث...';
  box.innerHTML = '';
  try{
    const { data, error } = await sb.rpc('get_order_status', { p_ref: ref });
    if(error) throw error;
    const order = Array.isArray(data) ? data[0] : data;
    if(!order){ box.innerHTML = '<div class="track-err">لم يتم العثور على طلب بهذا الرقم المرجعي. تأكد من كتابته بالكامل.</div>'; return; }
    const itemsHtml = (order.items||[]).map(it=>`<div class="row"><span>${it.name} × ${it.qty}</span><span>${(it.price*it.qty).toLocaleString('ar-EG')} ج.م</span></div>`).join('');
    let downloadHtml = '';
    if(order.download_ready && order.digital_link){
      try{
        const links = JSON.parse(order.digital_link);
        downloadHtml = links.map(l => `<a class="track-download-btn" href="${l.url}" target="_blank" rel="noopener">⬇️ تحميل ${l.name}</a>`).join('');
      }catch(e){ downloadHtml = `<a class="track-download-btn" href="${order.digital_link}" target="_blank" rel="noopener">⬇️ تحميل ملفاتك</a>`; }
    }
    box.innerHTML = `
      <div class="track-result">
        <div class="row"><span>رقم المرجع</span><b class="mono">${order.order_ref}</b></div>
        <div class="row"><span>الحالة</span><span class="track-status-pill">${STATUS_LABELS_FE[order.status] || order.status}</span></div>
        ${itemsHtml}
        <div class="row"><span>الإجمالي</span><b>${Number(order.total).toLocaleString('ar-EG')} ج.م</b></div>
        <div class="row"><span>تاريخ الطلب</span><span>${new Date(order.created_at).toLocaleDateString('ar-EG')}</span></div>
      </div>
      ${downloadHtml || (order.digital_link===null && (order.items||[]).length ? '' : '')}
      ${!order.download_ready && (order.items||[]).some(it=>it.product_type==='digital') ? '<p style="font-size:12.5px;color:var(--ink-soft);margin-top:10px;">💾 رابط التحميل هيظهر هنا تلقائيًا فور تأكيد الدفع من فريقنا.</p>' : ''}
    `;
  }catch(e){
    console.error(e);
    box.innerHTML = '<div class="track-err">حدث خطأ أثناء البحث، حاول مرة أخرى.</div>';
  }finally{
    btn.disabled = false; btn.innerText = '🔍 تحقق من الحالة';
  }
}
const STATUS_LABELS_FE = {
  pending: 'قيد الانتظار',
  pending_payment: 'في انتظار التحويل',
  confirmed: 'مؤكد',
  shipped: 'تم الشحن',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

