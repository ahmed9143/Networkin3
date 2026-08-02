/* brands.js — brand filter chips, brand strip, brand slug/hue/monogram helpers. */

function renderBrandFilters(){
  const bar = document.getElementById('brandFilterBar');
  if(!bar) return;
  const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
  if(!brands.length){ bar.innerHTML = ''; bar.style.display='none'; return; }
  bar.style.display = 'flex';
  const all = ['الكل', ...brands];
  bar.innerHTML = all.map(b => `<button class="filter-btn brand-btn ${b===currentBrandFilter?'active':''}" onclick="filterByBrand('${b.replace(/'/g,"\\'")}', this)">${b}</button>`).join('');
}

function filterByBrand(brand, btnEl){
  currentBrandFilter = brand;
  document.querySelectorAll('.brand-btn').forEach(b=>b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');
  renderProducts();
}

function brandSlug(name){
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g,'-')
    .replace(/^-+|-+$/g,'') || 'brand';
}
function brandHue(index){ return Math.round((index * 137.508) % 360); }
function brandInitials(name){
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if(words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] || '?';
  return w.length >= 2 ? w.slice(0,2).toUpperCase() : w.toUpperCase();
}
function brandMonogramURI(name, index){
  // The logo wall forces every image to a flat white silhouette (CSS filter), so this placeholder
  // just needs a clean, solid wordmark shape — no background box, no color, matching the
  // "white logos only, no boxes" look requested for the brand wall.
  // NOTE: this is only ever shown until a real logo file exists at /assets/brands/{slug}.png —
  // it renders the full brand name (not 2-letter initials, which read as broken/garbled text
  // when a dozen brand chips sit side by side).
  const label = String(name).trim().toUpperCase();
  const len = label.length;
  const fontSize = len > 16 ? 15 : len > 11 ? 18 : len > 7 ? 21 : 25;
  const w = Math.max(80, Math.round(len * fontSize * 0.62) + 24);
  const svg2 = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} 56'>
    <text x='${w/2}' y='36' font-family='Arial, Helvetica, sans-serif' font-size='${fontSize}' font-weight='800' fill='#111' text-anchor='middle' style='letter-spacing:.6px'>${label}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg2);
}
/* Best-effort category/product line shown under a brand on hover. Falls back to a generic line
   for brands not in the list — this is presentational copy only, not exhaustive/authoritative. */
const BRAND_CATEGORY = {
  'hikvision':'كاميرات مراقبة IP', 'dahua':'أنظمة CCTV / NVR', 'hp':'سويتشات شبكات',
  'hp procurve':'سويتشات شبكات Enterprise', 'aruba':'شبكات لاسلكية Enterprise', 'apc':'مزودات طاقة UPS',
  'tp-link':'أجهزة شبكات وراوترات', 'juniper':'معدات شبكات متقدمة', 'epson':'طابعات ومعدات مكتبية',
  'dell':'سيرفرات وحلول تخزين', 'ezviz':'كاميرات منزلية ذكية', 'uniview':'حلول مراقبة ذكية',
  'uniarch':'كاميرات ونظم NVR', 'ubiquiti':'شبكات UniFi', 'tiandy':'كاميرات وأنظمة NVR',
  'genata':'توزيع وتوريد أجهزة', 'imou':'كاميرات ذكية اقتصادية', 'honeywell':'أنظمة أمن وحماية',
  'zkteco':'أنظمة حضور وبصمة', 'it solutions pro':'حلول تقنية متكاملة', 'it slolutions':'حلول تقنية متكاملة',
  'ruijie':'حلول شبكات وواي فاي'
};
function brandCategory(name){
  return BRAND_CATEGORY[String(name).toLowerCase().trim()] || 'منتجات وحلول تقنية معتمدة';
}
/* onerror fallback chain for brand logo <img>: real .png -> generated wordmark (single stage only).
   IMPORTANT: browsers log every failed <img> load to the console (the "Failed to load resource"
   errors you'll see in devtools) even though the onerror handler recovers gracefully — so instead
   of blindly trying a file for every brand and letting most of them 404, we only ever *request* a
   file for a brand slug listed in BRAND_LOGO_FILES below. Everything else skips straight to the
   clean wordmark placeholder — no failed request, no console noise. And even for a brand that IS
   listed, if the .png is missing/renamed the fallback below goes straight to the wordmark in ONE
   step (no second svg attempt) so a bad entry here can never produce more than a single failed
   request — this used to be a two-stage png->svg->wordmark chain, collapsed to remove that risk.
   To add a real logo: drop the file in /assets/brands/{slug}.png AND add that slug to
   BRAND_LOGO_FILES — then it replaces the wordmark automatically everywhere the brand appears. */
const BRAND_LOGO_FILES = new Set([
  // 'hikvision', 'dahua', 'tp-link', ...
]);
window.__brandLogoFallback = function(img){
  img.onerror = null;
  img.src = brandMonogramURI(img.dataset.brandName, parseInt(img.dataset.idx || '0', 10));
  if(img.parentElement) img.parentElement.classList.remove('bc-real-logo');
  if(img.parentElement) img.parentElement.classList.add('bc-mono');
};

/* Real logos uploaded by the admin (لوحة التحكم -> إعدادات الموقع -> شعارات الماركات),
   stored in Supabase `site_settings` under key 'brand_logos' as { [brandSlug]: imageUrl }.
   Fetched once at load; renderBrandStrip() re-renders once this resolves so uploaded logos
   replace the generated wordmark placeholder without needing any code changes. */
window.__brandLogos = {};
window.__brandLogosLoaded = false;
(function loadBrandLogos(){
  if(typeof sb === 'undefined' || !sb || !sb.from) return;
  sb.from('site_settings').select('value').eq('key','brand_logos').maybeSingle()
    .then(({ data }) => {
      window.__brandLogos = (data && data.value && typeof data.value === 'object') ? data.value : {};
      window.__brandLogosLoaded = true;
      if(typeof renderBrandStrip === 'function') renderBrandStrip();
    })
    .catch(()=>{ window.__brandLogosLoaded = true; });
})();
/* Partner brands (شركاء وماركات) — an INDEPENDENT, admin-curated list of the brands
   the business officially deals with, stored in Supabase site_settings under key
   'partner_brands' as an ordered array: [{ id, name, slug, logo_url, link, active }].
   This is deliberately separate from the product-derived brand list below: a brand
   the business is an authorized reseller/distributor for (e.g. a new agency just
   signed) should be able to show up on the homepage the same day, even before a
   single matching product has been added to the catalog. Managed from
   admin.html -> إعدادات الموقع -> الماركات الشريكة.
   Falls back to the old product-derived list automatically if the admin hasn't
   set up a partner list yet, so nothing breaks for sites that never touch this. */
/* Ships with a starter list of the brands Ahmed currently deals with so the
   section looks right on day one, before any admin edit is saved — same pattern
   used for the top promo bar's DEFAULT_OFFERS. The admin panel (الماركات الشريكة)
   lets him add/remove/reorder from here at any time; once he saves once, the
   Supabase-stored list takes over completely. */
const DEFAULT_PARTNER_BRANDS = [
  { id:'hikvision', name:'Hikvision', slug:'hikvision', logo_url:'', active:true },
  { id:'dahua', name:'Dahua', slug:'dahua', logo_url:'', active:true },
  { id:'uniview', name:'Uniview (UNV)', slug:'uniview-unv', logo_url:'', active:true },
  { id:'tiandy', name:'Tiandy', slug:'tiandy', logo_url:'', active:true }
];
window.__partnerBrands = DEFAULT_PARTNER_BRANDS;
window.__partnerBrandsLoaded = false;
(function loadPartnerBrands(){
  if(typeof sb === 'undefined' || !sb || !sb.from) return;
  sb.from('site_settings').select('value').eq('key','partner_brands').maybeSingle()
    .then(({ data }) => {
      const list = data && Array.isArray(data.value) && data.value.length ? data.value : DEFAULT_PARTNER_BRANDS;
      window.__partnerBrands = list;
      window.__partnerBrandsLoaded = true;
      if(typeof renderBrandStrip === 'function') renderBrandStrip();
    })
    .catch(()=>{ window.__partnerBrandsLoaded = true; });
})();

function renderBrandStrip(){
  const strip = document.getElementById('brandStripTrack');
  const section = document.getElementById('brandStripSection');
  const statEl = document.querySelector('#brandStripSection .bs-item b[data-brand-count]');
  if(!strip || !section) return;

  const curatedActive = (window.__partnerBrands || []).filter(b => b && b.name && b.active !== false);
  const usingCurated = curatedActive.length > 0;
  const productBrands = new Set([...new Set(products.map(p=>p.brand).filter(Boolean))].map(b=>brandSlug(b)));

  // source list: curated admin list (in the order the admin set) when available,
  // otherwise fall back to whatever brands currently exist across the product catalog.
  const list = usingCurated
    ? curatedActive.map(b => ({ name: b.name, slug: b.slug || brandSlug(b.name), logo_url: b.logo_url || '' }))
    : [...new Set(products.map(p=>p.brand).filter(Boolean))].sort().map(name => ({ name, slug: brandSlug(name), logo_url: '' }));

  if(!list.length){ section.style.display = 'none'; return; }
  section.style.display = 'block';
  if(statEl) statEl.setAttribute('data-target', String(list.length));

  const chip = (item, idx) => {
    const b = item.name;
    const safe = b.replace(/'/g,"\\'");
    const slug = item.slug;
    const uploadedUrl = item.logo_url || (window.__brandLogos && window.__brandLogos[slug]);
    const hasPng = BRAND_LOGO_FILES.has(slug);
    let logoImg, chipClass;
    if(uploadedUrl){
      logoImg = `<img src="${uploadedUrl}" data-slug="${slug}" data-idx="${idx}" data-brand-name="${b.replace(/"/g,'&quot;')}" alt="${b}" loading="lazy" onerror="window.__brandLogoFallback(this)">`;
      chipClass = ' bc-real-logo';
    } else if(hasPng){
      logoImg = `<img src="assets/brands/${slug}.png" data-slug="${slug}" data-idx="${idx}" data-brand-name="${b.replace(/"/g,'&quot;')}" alt="${b}" loading="lazy" onerror="window.__brandLogoFallback(this)">`;
      chipClass = '';
    } else {
      logoImg = `<img src="${brandMonogramURI(b, idx)}" data-slug="${slug}" data-idx="${idx}" data-brand-name="${b.replace(/"/g,'&quot;')}" alt="${b}" loading="lazy">`;
      chipClass = ' bc-mono';
    }
    // only jump into the filtered product grid if this brand actually has products yet —
    // otherwise land on the general products page instead of a misleading "0 results" view.
    const hasProducts = productBrands.has(slug);
    const onClick = hasProducts
      ? `navigateTo('products'); filterByBrand('${safe}', null); renderBrandFilters();`
      : `navigateTo('products');`;
    return `<div class="brand-chip${chipClass}" onclick="${onClick}">
      <span class="bc-partner-badge">شريك معتمد</span>
      <div class="bc-logo">${logoImg}</div>
      <span class="bc-tip">${brandCategory(b)}</span>
    </div>`;
  };
  // static row now (no auto-scroll marquee) — render once; the side arrows below
  // handle manual scrolling for lists that don't fully fit on screen.
  strip.innerHTML = list.map(chip).join('');
}
function scrollBrandWall(dir){
  const track = document.getElementById('brandStripTrack');
  if(!track) return;
  track.scrollBy({ left: dir * -260, behavior: 'smooth' });
}

