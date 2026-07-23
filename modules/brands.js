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
  if(img.parentElement) img.parentElement.classList.add('bc-mono');
};
function renderBrandStrip(){
  const strip = document.getElementById('brandStripTrack');
  const section = document.getElementById('brandStripSection');
  if(!strip || !section) return;
  const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
  if(!brands.length){ section.style.display = 'none'; return; }
  section.style.display = 'block';
  const chip = (b, idx) => {
    const safe = b.replace(/'/g,"\\'");
    const slug = brandSlug(b);
    const hasPng = BRAND_LOGO_FILES.has(slug);
    const logoImg = hasPng
      ? `<img src="assets/brands/${slug}.png" data-slug="${slug}" data-idx="${idx}" data-brand-name="${b.replace(/"/g,'&quot;')}" alt="${b}" loading="lazy" onerror="window.__brandLogoFallback(this)">`
      : `<img src="${brandMonogramURI(b, idx)}" data-slug="${slug}" data-idx="${idx}" data-brand-name="${b.replace(/"/g,'&quot;')}" alt="${b}" loading="lazy">`;
    return `<div class="brand-chip${hasPng?'':' bc-mono'}" onclick="navigateTo('products'); filterByBrand('${safe}', null); renderBrandFilters();">
      <div class="bc-logo">${logoImg}</div>
      <span class="bc-tip">${brandCategory(b)}</span>
    </div>`;
  };
  // render the list twice back-to-back so the CSS animation can scroll exactly -50%
  // and loop seamlessly (right-to-left) with no visible seam or reset-jump
  const once = brands.map(chip).join('');
  strip.innerHTML = once + once;
}

