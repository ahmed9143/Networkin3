/* products.js — product grid/cards, quick view, product detail page, reviews, stock-notify, compare tool, price filter, biometric filter. */

function renderFilters(){
  const bar = document.getElementById('filtersBar');
  const cats = [{name:'الكل', icon:'🗂️'}, ...categories];
  bar.innerHTML = cats.map(c => `<button class="filter-btn ${c.name===currentCategoryFilter?'active':''}" onclick="filterByCat('${c.name}', this)"><span class="mega-ic" style="margin-inline-end:6px;">${c.icon || CAT_ICONS[c.name] || '📦'}</span>${c.name}</button>`).join('');
}

function isProductNew(p){
  if(!p.created_at) return false;
  const ageMs = Date.now() - new Date(p.created_at).getTime();
  return ageMs < (1000*60*60*24*14); // 14 يوم
}

function productCardHTML(p){
  const discount = p.old_price && p.old_price > p.price;
  const cover = (p.images && p.images.length) ? p.images[0] : (p.image_url || 'https://placehold.co/400x400/10294f/9fb0d1?text=No+Image');
  const badge = discount ? `<div class="prod-badge">خصم ${Math.round(100-(p.price/p.old_price*100))}%</div>` : (p.stock>0 ? `<div class="prod-badge stock">متوفر</div>` : `<div class="prod-badge" style="background:var(--danger);">غير متوفر</div>`);
  const isDigital = p.product_type === 'digital';
  let secondaryBadge = '';
  if(isDigital) secondaryBadge = `<div class="prod-badge-left digital">💾 منتج رقمي</div>`;
  else if(p.is_bestseller) secondaryBadge = `<div class="prod-badge-left bestseller">🔥 الأكثر مبيعًا</div>`;
  else if(isProductNew(p)) secondaryBadge = `<div class="prod-badge-left new">✨ جديد</div>`;
  const wished = isInWishlist(p.id);
  const shortDesc = (p.description || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).slice(0,140);
  return `
    <div class="prod-card" data-cat="${categoryAccentKey(p)}" onclick="openProductDetail('${p.id}')" style="cursor:pointer;">
      <div class="prod-thumb">
        <img src="${cover}" alt="${p.name}" loading="lazy" width="300" height="300">
        ${isDigital ? '' : badge}
        ${secondaryBadge}
        <button class="wish-btn ${wished?'active':''}" data-id="${p.id}" title="أضف للمفضلة" onclick="event.stopPropagation(); toggleWishlist('${p.id}')">${wished?'♥':'♡'}</button>
        <button class="quick-view-btn" title="نظرة سريعة" onclick="event.stopPropagation(); openQuickView('${p.id}')">👁</button>
        <div class="prod-hover-panel">
          ${shortDesc ? `<p class="prod-hover-desc">${shortDesc}</p>` : ''}
          <div class="prod-hover-actions">
            <button onclick="event.stopPropagation(); addToCompareFromCard('${p.id}')">⚖️ قارن</button>
            <button onclick="event.stopPropagation(); addToQuoteFromCard('${p.id}')">🧾 لعرض السعر</button>
          </div>
        </div>
      </div>
      <div class="prod-body">
        <div class="prod-cat">${p.category || ''}${p.brand ? ' · '+p.brand : ''}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-price-row">
          <span class="prod-price">${Number(p.price).toLocaleString('ar-EG')} ج.م</span>
          ${discount ? `<span class="prod-old">${Number(p.old_price).toLocaleString('ar-EG')} ج.م</span>` : ''}
        </div>
        <button class="add-btn" onclick="event.stopPropagation(); addToCart('${p.id}', this)">${isDigital ? '⬇️ اطلب وحمّل' : '🛒 أضف للسلة'}</button>
      </div>
    </div>`;
}

function addToCompareFromCard(id){
  navigateTo('tools');
  showToolTab('compare');
  const idx = products.findIndex(x=>x.id===id);
  if(idx<0) return;
  for(let n=1;n<=3;n++){
    const sel = document.getElementById('cmpSel'+n);
    if(sel && sel.value===''){ sel.value = idx; break; }
  }
  renderCompareTable();
}

function addToQuoteFromCard(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  navigateTo('tools');
  showToolTab('quote');
  qbItems.push({id:++qbCounter, name:p.name, qty:1, price:Number(p.price)||0});
  renderQuoteTable();
}

function openProductDetail(id){
  location.hash = 'product-' + id;
}

function openQuickView(id){
  const p = products.find(x => String(x.id) === String(id));
  if(!p) return;
  const images = (p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : ['https://placehold.co/600x600/10294f/9fb0d1?text=No+Image']);
  const discount = p.old_price && p.old_price > p.price;
  const box = document.getElementById('quickViewBox');
  box.innerHTML = `
    <button class="qv-close" onclick="closeQuickView()">×</button>
    <div class="qv-grid">
      <div class="qv-img"><img src="${images[0]}" alt="${p.name}" width="600" height="600"></div>
      <div class="qv-body">
        <div class="qv-cat">${p.category || ''}${p.brand ? ' · '+p.brand : ''}</div>
        <h2 class="qv-name">${p.name}</h2>
        <div class="qv-price-row">
          <span class="qv-price">${Number(p.price).toLocaleString('ar-EG')} ج.م</span>
          ${discount ? `<span class="qv-old">${Number(p.old_price).toLocaleString('ar-EG')} ج.م</span>` : ''}
        </div>
        ${p.product_type==='digital' ? '<div class="digital-note">💾 منتج رقمي: هيتبعتلك رابط تحميل آمن على واتساب بعد تأكيد الدفع مباشرة.</div>' : `<div class="pd-stock ${p.stock>0?'in':'out'}" style="margin-bottom:14px;">${p.stock>0 ? '✓ متوفر بالمخزون' : '✕ غير متوفر حاليًا'}</div>`}
        <p class="qv-desc">${p.description || 'لا يوجد وصف تفصيلي لهذا المنتج حاليًا.'}</p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="addToCart('${p.id}', this); closeQuickView();">${p.product_type==='digital'?'⬇️ اطلب الآن':'🛒 أضف للسلة'}</button>
          <button class="wish-btn inline ${isInWishlist(p.id)?'active':''}" title="أضف للمفضلة" onclick="toggleWishlist('${p.id}'); openQuickView('${p.id}');">${isInWishlist(p.id)?'♥':'♡'}</button>
        </div>
        <a class="btn btn-outline" style="width:100%;justify-content:center;margin-top:10px;" onclick="closeQuickView(); openProductDetail('${p.id}');">عرض التفاصيل الكاملة</a>
      </div>
    </div>`;
  document.getElementById('quickViewOverlay').classList.add('open');
}
function closeQuickView(){ document.getElementById('quickViewOverlay').classList.remove('open'); }

function renderProductDetail(id){
  const p = products.find(x => String(x.id) === String(id));
  if(!p){ navigateTo('products'); return; }
  const images = (p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : ['https://placehold.co/600x600/10294f/9fb0d1?text=No+Image']);
  const discount = p.old_price && p.old_price > p.price;

  // Breadcrumb trail (Home > Category > Product) - real navigable links + BreadcrumbList schema for SEO
  const bcEsc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bcEl = document.getElementById('pdBreadcrumb');
  if(bcEl){
    const crumbs = [{name:'الرئيسية', onclick:"navigateTo('home')"}];
    if(p.category) crumbs.push({name:p.category, onclick:"navigateTo('products')"});
    crumbs.push({name:p.name, current:true});
    bcEl.innerHTML = crumbs.map((c,i) => {
      const isLast = i === crumbs.length - 1;
      const item = c.current ? `<span class="current">${bcEsc(c.name)}</span>` : `<a onclick="${c.onclick}">${bcEsc(c.name)}</a>`;
      return item + (isLast ? '' : ' <span class="sep">/</span> ');
    }).join('');
    // Structured data: helps Google show breadcrumb trails in search results
    let bcSchema = document.getElementById('pdBreadcrumbSchema');
    if(!bcSchema){ bcSchema = document.createElement('script'); bcSchema.type = 'application/ld+json'; bcSchema.id = 'pdBreadcrumbSchema'; document.head.appendChild(bcSchema); }
    bcSchema.textContent = JSON.stringify({
      '@context':'https://schema.org', '@type':'BreadcrumbList',
      itemListElement: crumbs.map((c,i) => ({ '@type':'ListItem', position:i+1, name:c.name }))
    });
  }

  const el = document.getElementById('pdContainer');
  el.innerHTML = `
    <div>
      <div class="pd-gallery-main"><img id="pdMainImg" src="${images[0]}" alt="${p.name}"></div>
      <div class="pd-thumbs">${images.map((img,i)=>`<div class="pd-thumb ${i===0?'active':''}" onclick="pdSelectImage(${i})"><img src="${img}" alt="${p.name} ${i+1}"></div>`).join('')}</div>
    </div>
    <div>
      <div class="pd-cat">${p.category || ''}${p.brand ? ' · '+p.brand : ''}</div>
      <h1 class="pd-name">${p.name}</h1>
      <div class="pd-price-row">
        <span class="pd-price">${Number(p.price).toLocaleString('ar-EG')} ج.م</span>
        ${discount ? `<span class="pd-old">${Number(p.old_price).toLocaleString('ar-EG')} ج.م</span>` : ''}
      </div>
      ${p.product_type==='digital' ? '<div class="digital-note">💾 منتج رقمي: هيتبعتلك رابط تحميل آمن على واتساب بعد تأكيد الدفع مباشرة، ومتاح لك تتابع حالة طلبك من صفحة "تتبع الطلب".</div>' : `<div class="pd-stock ${p.stock>0?'in':'out'}">${p.stock>0 ? '✓ متوفر بالمخزون' : '✕ غير متوفر حاليًا'}</div>`}
      <p class="pd-desc">${p.description || 'لا يوجد وصف تفصيلي لهذا المنتج حاليًا. تواصل معنا لمزيد من التفاصيل.'}</p>
      ${(p.product_type!=='digital' && p.stock<=0) ? `
        <div class="pd-notify-box">
          <b>📩 نبهني لما يتوفر</b>
          <p style="margin:4px 0 10px;font-size:13px;color:var(--ink-soft);">سجّل رقمك وهنبعتلك واتساب أول ما يتوفر تاني.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input type="tel" id="pdNotifyPhone" placeholder="رقم الموبايل" style="flex:1;min-width:160px;">
            <button class="btn btn-outline" onclick="submitStockNotify('${p.id}', '${p.name.replace(/'/g,"\\'")}')">سجّل التنبيه</button>
          </div>
          <div id="pdNotifyMsg" style="font-size:12.5px;margin-top:6px;"></div>
        </div>` : ''}
      <div class="pd-qty-row">
        <button class="qty-btn" onclick="pdChangeQty(-1)">-</button>
        <span id="pdQtyVal">1</span>
        <button class="qty-btn" onclick="pdChangeQty(1)">+</button>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="pdAddToCart('${p.id}')">${p.product_type==='digital'?'⬇️ اطلب الآن':'🛒 أضف للسلة'}</button>
        <button class="wish-btn inline ${isInWishlist(p.id)?'active':''}" data-id="${p.id}" title="أضف للمفضلة" onclick="toggleWishlist('${p.id}')">${isInWishlist(p.id)?'♥':'♡'}</button>
      </div>
    </div>
    <div class="pd-reviews-section" style="grid-column:1 / -1;">
      <div id="pdReviewsList"><p style="color:var(--ink-soft);font-size:13.5px;">جاري تحميل التقييمات...</p></div>
      <div class="pd-review-form">
        <h4>✍️ اكتب تقييمك</h4>
        <div class="pd-star-input" id="pdStarInput">${[1,2,3,4,5].map(n=>`<span data-v="${n}" onclick="setReviewStars(${n})">☆</span>`).join('')}</div>
        <input type="text" id="pdReviewName" placeholder="اسمك">
        <textarea id="pdReviewComment" rows="3" placeholder="رأيك في المنتج (اختياري)"></textarea>
        <button class="btn btn-outline" onclick="submitProductReview('${p.id}')">إرسال التقييم</button>
        <div id="pdReviewMsg" style="font-size:12.5px;margin-top:6px;"></div>
      </div>
    </div>`;
  window._pdImages = images; window._pdQty = 1;
  document.title = `${p.name} | Delta IT Solutions`;
  injectProductJsonLd(p, images);
  document.querySelectorAll('.page-view').forEach(v=>v.classList.remove('active-page'));
  document.getElementById('page-product-detail').classList.add('active-page');
  window.scrollTo({top:0, behavior:'smooth'});
  window._pdReviewStars = 0;
  loadProductReviews(p.id);
}

let _pdReviewStars = 0;
function setReviewStars(n){
  _pdReviewStars = n;
  document.querySelectorAll('#pdStarInput span').forEach(s => {
    s.textContent = Number(s.dataset.v) <= n ? '★' : '☆';
    s.classList.toggle('filled', Number(s.dataset.v) <= n);
  });
}

async function loadProductReviews(productId){
  const box = document.getElementById('pdReviewsList');
  if(!box) return;
  try{
    const { data, error } = await sb.from('product_reviews').select('*').eq('product_id', productId).eq('approved', true).order('created_at', { ascending:false });
    if(error) throw error;
    const reviews = data || [];
    if(!reviews.length){
      box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">لسه مفيش تقييمات لهذا المنتج - كن أول من يقيّمه!</p>';
      return;
    }
    const avg = reviews.reduce((s,r)=>s+r.rating,0) / reviews.length;
    const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5-Math.round(n));
    box.innerHTML = `
      <div class="pd-review-summary"><span class="pd-review-avg-stars">${stars(avg)}</span><b>${avg.toFixed(1)}</b><span style="color:var(--ink-soft);font-size:13px;">(${reviews.length} تقييم)</span></div>
      ${reviews.map(r => `
        <div class="pd-review-item">
          <div class="pd-review-item-head"><b>${(r.customer_name||'عميل').replace(/</g,'&lt;')}</b><span class="pd-review-item-stars">${stars(r.rating)}</span></div>
          ${r.comment ? `<p>${r.comment.replace(/</g,'&lt;')}</p>` : ''}
        </div>`).join('')}`;
  }catch(e){
    console.error('loadProductReviews failed', e);
    box.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">تعذر تحميل التقييمات حاليًا.</p>';
  }
}

async function submitProductReview(productId){
  const msg = document.getElementById('pdReviewMsg');
  const name = document.getElementById('pdReviewName').value.trim();
  const comment = document.getElementById('pdReviewComment').value.trim();
  if(!_pdReviewStars){ msg.style.color='var(--danger,#e5484d)'; msg.innerText = 'برجاء اختيار عدد النجوم أولاً.'; return; }
  if(!name){ msg.style.color='var(--danger,#e5484d)'; msg.innerText = 'برجاء كتابة اسمك.'; return; }
  if(!checkRateLimit('product_review', 5, 15*60*1000)){ msg.style.color='var(--danger,#e5484d)'; msg.innerText = 'محاولات كتير في وقت قصير - حاول تاني بعد كام دقيقة.'; return; }
  try{
    const { error } = await sb.from('product_reviews').insert({ product_id: productId, customer_name: name, rating: _pdReviewStars, comment: comment || null, approved: false });
    if(error) throw error;
    msg.style.color = 'var(--ok,#2ecc71)';
    msg.innerText = '✓ شكرًا لتقييمك! هيظهر للعملاء بعد مراجعة سريعة من فريقنا.';
    document.getElementById('pdReviewName').value = '';
    document.getElementById('pdReviewComment').value = '';
    setReviewStars(0);
  }catch(e){
    console.error('submitProductReview failed', e);
    msg.style.color = 'var(--danger,#e5484d)'; msg.innerText = 'حدث خطأ أثناء إرسال التقييم، حاول مرة أخرى.';
  }
}

async function submitStockNotify(productId, productName){
  const msg = document.getElementById('pdNotifyMsg');
  const phone = document.getElementById('pdNotifyPhone').value.trim();
  if(!phone){ msg.style.color='var(--danger,#e5484d)'; msg.innerText = 'برجاء إدخال رقم الموبايل.'; return; }
  if(!checkRateLimit('stock_notify', 5, 15*60*1000)){ msg.style.color='var(--danger,#e5484d)'; msg.innerText = 'محاولات كتير في وقت قصير - حاول تاني بعد كام دقيقة.'; return; }
  try{
    const { error } = await sb.from('stock_notify_requests').insert({ product_id: productId, product_name: productName, phone });
    if(error) throw error;
    msg.style.color = 'var(--ok,#2ecc71)';
    msg.innerText = '✓ تم التسجيل، هنبعتلك واتساب فور توفر المنتج.';
    document.getElementById('pdNotifyPhone').value = '';
  }catch(e){
    console.error('submitStockNotify failed', e);
    msg.style.color = 'var(--danger,#e5484d)'; msg.innerText = 'حدث خطأ، حاول مرة أخرى.';
  }
}

function pdSelectImage(i){
  document.getElementById('pdMainImg').src = window._pdImages[i];
  document.querySelectorAll('.pd-thumb').forEach((t,idx)=>t.classList.toggle('active', idx===i));
}
function pdChangeQty(delta){
  window._pdQty = Math.max(1, (window._pdQty||1)+delta);
  document.getElementById('pdQtyVal').innerText = window._pdQty;
}
function pdAddToCart(id){
  cart[id] = (cart[id]||0) + (window._pdQty||1);
  saveCartAndRefresh();
  const drawer=document.getElementById('cartDrawer'), overlay=document.getElementById('cartOverlay');
  drawer.classList.add('open'); overlay.classList.add('open');
}

function injectProductJsonLd(p, images){
  let tag = document.getElementById('productJsonLd');
  if(!tag){ tag = document.createElement('script'); tag.type='application/ld+json'; tag.id='productJsonLd'; document.head.appendChild(tag); }
  tag.textContent = JSON.stringify({
    "@context":"https://schema.org",
    "@type":"Product",
    "name": p.name,
    "description": p.description || p.name,
    "image": images,
    "offers": {
      "@type":"Offer",
      "priceCurrency":"EGP",
      "price": p.price,
      "availability": p.stock>0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  });
}
function removeProductJsonLd(){
  const tag = document.getElementById('productJsonLd');
  if(tag) tag.remove();
}

const HASH_OPEN_PAGES = ['finder','storage-calc','biometric','products','contact','faq','ai-builder','rack-builder','solution-detail','boq','category-soon'];
function renderFeatured(){
  const el = document.getElementById('featuredGrid');
  const feat = products.filter(p=>p.featured).slice(0,8);
  const list = feat.length ? feat : products.slice(0,8);
  el.innerHTML = list.map(productCardHTML).join('') || '<div class="empty-state">لا توجد منتجات بعد - أضفها من لوحة التحكم</div>';
}

function renderProducts(){
  const el = document.getElementById('allProductsGrid');
  let list = products;
  if(currentCategoryFilter && currentCategoryFilter !== 'الكل') list = list.filter(p => p.category === currentCategoryFilter);
  if(currentBrandFilter && currentBrandFilter !== 'الكل') list = list.filter(p => (p.brand||'') === currentBrandFilter);
  if(currentSearchQuery) list = list.filter(p => p.name.toLowerCase().includes(currentSearchQuery.toLowerCase()));
  if(priceMinFilter !== null && !isNaN(priceMinFilter)) list = list.filter(p => Number(p.price) >= priceMinFilter);
  if(priceMaxFilter !== null && !isNaN(priceMaxFilter)) list = list.filter(p => Number(p.price) <= priceMaxFilter);
  document.getElementById('productsCountLabel').innerText = `${list.length} منتج متاح`;
  el.innerHTML = list.map(productCardHTML).join('') || '<div class="empty-state">لا توجد منتجات مطابقة</div>';
}

function filterByCat(cat, btnEl){
  currentCategoryFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');
  renderProducts();
}

function selectCategoryFilter(cat){
  if(countCategoryMatches(cat) === 0){ openCategoryComingSoon(cat, true); return; }
  navigateTo('products');
  currentCategoryFilter = cat;
  renderFilters();
  renderProducts();
}

function renderPriceFilter(){
  const wrap = document.getElementById('priceFilterBar');
  if(!wrap) return;
  const prices = products.map(p=>Number(p.price)).filter(n=>!isNaN(n));
  if(!prices.length){ wrap.style.display='none'; return; }
  wrap.style.display = 'flex';
  const maxP = Math.ceil(Math.max(...prices));
  document.getElementById('priceMinInput').placeholder = '0';
  document.getElementById('priceMaxInput').placeholder = maxP.toLocaleString('ar-EG');
}

function applyPriceFilter(){
  const minV = document.getElementById('priceMinInput').value;
  const maxV = document.getElementById('priceMaxInput').value;
  priceMinFilter = minV !== '' ? parseFloat(minV) : null;
  priceMaxFilter = maxV !== '' ? parseFloat(maxV) : null;
  renderProducts();
}

function clearPriceFilter(){
  document.getElementById('priceMinInput').value = '';
  document.getElementById('priceMaxInput').value = '';
  priceMinFilter = null; priceMaxFilter = null;
  renderProducts();
}

/* slug + color helpers used to build a clean placeholder logo for any brand that doesn't
   have a real logo file yet under /assets/brands/. Colors are spread using the golden-angle
   trick (index * 137.508°) so consecutive/similar brand names never collide on the same hue
   the way a plain name-hash can — that repetition was what made the auto logos look cheap. */
function initCompareTool(){
  const row = document.getElementById('compareSelectRow');
  const opts = ['<option value="">-- اختر منتج --</option>', ...products.map((p,i)=>`<option value="${i}">${p.name}</option>`)].join('');
  row.innerHTML = [1,2,3].map(n=>`
    <div class="form-group"><label>منتج ${n}</label>
      <select id="cmpSel${n}" onchange="renderCompareTable()">${opts}</select>
    </div>`).join('');
  renderCompareTable();
}
function renderCompareTable(){
  const sels = [1,2,3].map(n=>document.getElementById('cmpSel'+n));
  const chosen = sels.map(s=>s && s.value!=='' ? products[parseInt(s.value)] : null).filter(Boolean);
  const table = document.getElementById('compareTable');
  if(!chosen.length){ table.innerHTML=''; return; }
  const fields = [
    {key:'name', label:'الاسم'},
    {key:'brand', label:'الماركة'},
    {key:'category', label:'الفئة'},
    {key:'price', label:'السعر', fmt:v=>v?`${Number(v).toLocaleString('ar-EG')} ج.م`:'-'},
    {key:'description', label:'الوصف'}
  ];
  let html = '<tr><th>الخاصية</th>'+chosen.map(p=>`<th>${p.image?`<img src="${p.image}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;">`:''}${p.name}</th>`).join('')+'</tr>';
  fields.forEach(f=>{
    html += `<tr><td><b>${f.label}</b></td>`+chosen.map(p=>{
      let v = p[f.key];
      v = f.fmt ? f.fmt(v) : (v||'-');
      return `<td>${v}</td>`;
    }).join('')+'</tr>';
  });
  table.innerHTML = html;
}

/* ================= Quote Builder ================= */
let qbItems = [];
let qbCounter = 0;
function isBioProduct(p){
  return (p.category||'').includes('بصمة') || (p.category||'').includes('حضور') || (p.category||'').includes('أمنية')
    || finderTextOf(p).includes('بصمة') || finderTextOf(p).includes('fingerprint') || finderTextOf(p).includes('access control')
    || !!p.bio_type;
}

function renderBioFilters(){
  const brandBar = document.getElementById('bioFilterBrand');
  const typeBar = document.getElementById('bioFilterType');
  const useBar = document.getElementById('bioFilterUse');
  if(!brandBar) return;
  const brandsInData = [...new Set(products.filter(isBioProduct).map(p=>p.brand).filter(Boolean))];
  const brands = ['الكل', ...new Set([...BIO_BRAND_LIST.slice(1), ...brandsInData])];
  brandBar.innerHTML = brands.map(b => `<button class="filter-btn ${b===bioBrandFilter?'active':''}" onclick="setBioFilter('brand','${b.replace(/'/g,"\\'")}')">${b}</button>`).join('');
  typeBar.innerHTML = BIO_TYPE_LIST.map(t => `<button class="filter-btn ${t.value===bioTypeFilter?'active':''}" onclick="setBioFilter('type','${t.value}')">${t.label}</button>`).join('');
  useBar.innerHTML = BIO_USE_LIST.map(u => `<button class="filter-btn ${u.value===bioUseFilter?'active':''}" onclick="setBioFilter('use','${u.value}')">${u.label}</button>`).join('');
}

function setBioFilter(kind, value){
  if(kind==='brand') bioBrandFilter = value;
  if(kind==='type') bioTypeFilter = value;
  if(kind==='use') bioUseFilter = value;
  renderBioFilters();
  renderBioResults();
}

function renderBioResults(){
  const grid = document.getElementById('bioResultsGrid');
  if(!grid) return;
  let list = products.filter(isBioProduct);
  if(bioBrandFilter !== 'الكل') list = list.filter(p => (p.brand||'') === bioBrandFilter);
  if(bioTypeFilter !== 'الكل'){
    list = list.filter(p => p.bio_type ? p.bio_type === bioTypeFilter : finderTextOf(p).includes(BIO_TYPE_LIST.find(t=>t.value===bioTypeFilter).label.toLowerCase()));
  }
  if(bioUseFilter !== 'الكل'){
    list = list.filter(p => p.bio_use ? (p.bio_use === bioUseFilter || p.bio_use === 'both') : true);
  }
  grid.innerHTML = list.length ? list.map(productCardHTML).join('') : '<div class="empty-state">مفيش أجهزة مطابقة للفلتر ده - جرب تغيّر الاختيار أو تواصل معنا مباشرة.</div>';
}

/* ---------------- حاسبة تكلفة المشروع (تقدير تقريبي) ---------------- */
// أسعار تقريبية للتوجيه المبدئي فقط (توريد + تركيب) بالجنيه المصري - تختلف حسب الماركة والموقع فعليًا
const CALC_RATES = {
  camera: { min: 1500, max: 3000 },
  networkPoint: { min: 800, max: 1500 },
  fingerprint: { min: 3500, max: 6000 }
};
let lastCalcSummary = '';

