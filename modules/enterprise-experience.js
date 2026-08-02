/* enterprise-experience.js — Phase 2D
   Adds, without touching the existing card/quote/search internals:
   1) Floating Comparison Drawer (up to 4 products, real spec columns, print/PDF export)
   2) Generic, spec-driven Smart Compatibility Engine (reads products.specs from Supabase — no hardcoding)
   3) Floating "مشروعك" Project Panel (device count / PoE / storage / bandwidth / rack units / power)
   4) Sort + Grid density (Grid / Compact / List) controls on the products page
   5) Typo-tolerant, multi-field search (name, brand, model, description, specs, tags)
   All state lives in this file; nothing here breaks a page that doesn't call it. */

/* ================= 1) COMPARE DRAWER ================= */
let cmpDrawerIds = [];

function addToCompareDrawer(id){
  if(cmpDrawerIds.includes(id)) { openCompareDrawer(); return; }
  if(cmpDrawerIds.length >= 4){ alert('أقصى عدد للمقارنة 4 منتجات — احذف واحد الأول'); return; }
  cmpDrawerIds.push(id);
  renderCompareDrawerBar();
  openCompareDrawer();
}
function removeFromCompareDrawer(id){
  cmpDrawerIds = cmpDrawerIds.filter(x=>x!==id);
  renderCompareDrawerBar();
  renderCompareDrawerTable();
}
function replaceCompareSlot(oldId){
  const q = prompt('اكتب اسم المنتج اللي هيحل محله:');
  if(!q) return;
  const match = products.find(p=>p.name.toLowerCase().includes(q.toLowerCase()));
  if(!match){ alert('مفيش منتج بالاسم ده'); return; }
  const idx = cmpDrawerIds.indexOf(oldId);
  if(idx>-1) cmpDrawerIds[idx] = match.id;
  renderCompareDrawerBar();
  renderCompareDrawerTable();
}

function ensureCompareDrawerMounted(){
  if(document.getElementById('cmpDrawer')) return;
  const bar = document.createElement('div');
  bar.id = 'cmpDrawerBar';
  bar.className = 'cmp-drawer-bar';
  document.body.appendChild(bar);
  const drawer = document.createElement('div');
  drawer.id = 'cmpDrawer';
  drawer.className = 'cmp-drawer-overlay';
  drawer.innerHTML = `<div class="cmp-drawer-box">
    <button class="qv-close" onclick="closeCompareDrawer()">×</button>
    <h3>⚖️ مقارنة المنتجات</h3>
    <div id="cmpDrawerTableHost" style="overflow-x:auto;"></div>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-outline" onclick="printCompareDrawer()">🖨️ تصدير / طباعة PDF</button>
      <button class="btn btn-outline" onclick="cmpDrawerIds=[];renderCompareDrawerBar();renderCompareDrawerTable();">🗑️ تفريغ الكل</button>
    </div>
  </div>`;
  document.body.appendChild(drawer);
}

function renderCompareDrawerBar(){
  ensureCompareDrawerMounted();
  const bar = document.getElementById('cmpDrawerBar');
  if(!cmpDrawerIds.length){ bar.classList.remove('show'); bar.innerHTML=''; return; }
  bar.classList.add('show');
  const chips = cmpDrawerIds.map(id=>{
    const p = products.find(x=>x.id===id); if(!p) return '';
    return `<div class="cmp-bar-chip"><img src="${(p.images&&p.images[0])||p.image_url||''}" alt=""><span>${p.name}</span><button onclick="removeFromCompareDrawer('${id}')">×</button></div>`;
  }).join('');
  bar.innerHTML = `${chips}<button class="btn btn-primary" style="padding:8px 18px;" onclick="openCompareDrawer()">قارن الآن (${cmpDrawerIds.length})</button>`;
}

function openCompareDrawer(){
  ensureCompareDrawerMounted();
  renderCompareDrawerTable();
  document.getElementById('cmpDrawer').classList.add('open');
}
function closeCompareDrawer(){ const d=document.getElementById('cmpDrawer'); if(d) d.classList.remove('open'); }

const CMP_SPEC_FIELDS = [
  {label:'الماركة', get:p=>p.brand||'-'},
  {label:'الدقة (Resolution)', get:p=>(p.specs&&p.specs.resolution)||'-'},
  {label:'PoE', get:p=>(p.specs&&(p.specs.poe||p.specs.poe_watts))||'-'},
  {label:'العدسة (Lens)', get:p=>(p.specs&&p.specs.lens)||'-'},
  {label:'التخزين', get:p=>(p.specs&&p.specs.storage)||'-'},
  {label:'الطاقة', get:p=>(p.specs&&p.specs.power)||'-'},
  {label:'الأبعاد', get:p=>(p.specs&&p.specs.dimensions)||'-'},
  {label:'ميزات AI', get:p=>(p.specs&&Array.isArray(p.specs.ai_features))?p.specs.ai_features.join('، '):'-'},
  {label:'الضمان', get:p=>p.warranty_text||'-'},
  {label:'السعر', get:p=>`${Number(p.price).toLocaleString('en-US')} ج.م`},
  {label:'التوفر', get:p=>(p.stock>0?'✅ متوفر':'❌ غير متوفر')},
];

function renderCompareDrawerTable(){
  const host = document.getElementById('cmpDrawerTableHost');
  if(!host) return;
  const chosen = cmpDrawerIds.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if(!chosen.length){ host.innerHTML = '<p class="finder-note">لسه ماخترتش منتجات — دوس ⚖️ قارن على أي كارت.</p>'; return; }
  let html = '<table class="compare-table"><tr><th></th>' + chosen.map(p=>`<th>
    <img src="${(p.images&&p.images[0])||p.image_url||''}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;">
    ${p.name}<br>
    <button class="btn btn-outline" style="padding:3px 8px;font-size:11px;margin-top:6px;" onclick="removeFromCompareDrawer('${p.id}')">إزالة</button>
    <button class="btn btn-outline" style="padding:3px 8px;font-size:11px;margin-top:4px;" onclick="replaceCompareSlot('${p.id}')">استبدال</button>
  </th>`).join('') + '</tr>';
  CMP_SPEC_FIELDS.forEach(f=>{
    html += `<tr><td><b>${f.label}</b></td>${chosen.map(p=>`<td>${f.get(p)}</td>`).join('')}</tr>`;
  });
  html += '</table>';
  host.innerHTML = html;
}

function printCompareDrawer(){
  const chosen = cmpDrawerIds.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if(!chosen.length) return;
  const w = window.open('', '_blank');
  const rows = CMP_SPEC_FIELDS.map(f=>`<tr><td><b>${f.label}</b></td>${chosen.map(p=>`<td>${f.get(p)}</td>`).join('')}</tr>`).join('');
  w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>مقارنة المنتجات</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #ccc;padding:8px;text-align:right;font-size:13px;}</style>
    </head><body><h2>مقارنة المنتجات — Delta IT Solutions</h2>
    <table><tr><th></th>${chosen.map(p=>`<th>${p.name}</th>`).join('')}</tr>${rows}</table>
    </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(), 300);
}

/* ================= 2) SMART COMPATIBILITY ENGINE (generic, spec-driven) ================= */
/* Category pairing rules — WHICH categories are worth checking against each other.
   The actual verdict always comes from real spec numbers on the two products, never a hardcoded pair. */
const COMPAT_CATEGORY_PAIRS = {
  'كاميرا ip': ['nvr','poe','سويتش'],
  'ptz': ['nvr','poe'],
  'nvr': ['كاميرا ip','ptz'],
  'dvr': ['كاميرا ip'],
  'سويتش': ['كاميرا ip','اكسس بوينت','كابينة شبكة'],
  'poe': ['كاميرا ip','اكسس بوينت'],
  'اكسس بوينت': ['سويتش','poe'],
  'كابينة شبكة': ['سويتش','باتش بانل'],
  'راوترات (routers)': ['سويتش']
};

/* Returns {status:'ok'|'warn'|'bad', label, reasons:[]} comparing product a against product b
   using whatever numeric specs both actually have. No brand bias, no invented numbers. */
function computeCompatibility(a, b){
  const sa = a.specs||{}, sb = b.specs||{};
  const reasons = [];
  let status = 'ok';

  // PoE budget vs camera draw
  if(sa.poe_watts && sb.poe_budget_watts){
    if(Number(sa.poe_watts) <= Number(sb.poe_budget_watts)) reasons.push('✅ استهلاك PoE في حدود ميزانية الجهاز التاني');
    else { reasons.push('❌ استهلاك PoE أعلى من ميزانية الجهاز التاني'); status='bad'; }
  }
  // channels vs cameras (rough per-pair check, real count needs quantity from the project panel)
  if(sa.channels_supported || sb.channels_supported){
    reasons.push(`ℹ️ القنوات المدعومة: ${sa.channels_supported||sb.channels_supported}`);
  }
  // ports
  if(sa.ports && sb.ports){
    reasons.push(`ℹ️ عدد المنافذ: ${a.name}: ${sa.ports} / ${b.name}: ${sb.ports}`);
  }
  if(!reasons.length){
    status = 'warn';
    reasons.push('⚠️ مواصفات غير كافية على المنتجين للحكم بدقة — راجع الداتا شيت.');
  }
  return {status, reasons};
}

function renderCompatibleChips(p){
  const cat = (p.category||'').toLowerCase().trim();
  const targetCats = COMPAT_CATEGORY_PAIRS[cat];
  let candidates = [];
  if(Array.isArray(p.compatible_product_ids) && p.compatible_product_ids.length){
    candidates = p.compatible_product_ids.map(id=>products.find(x=>String(x.id)===String(id))).filter(Boolean);
  } else if(targetCats){
    candidates = products.filter(x=>targetCats.includes((x.category||'').toLowerCase().trim())).slice(0,6);
  }
  if(!candidates.length) return '';
  const chips = candidates.map(c=>{
    const r = computeCompatibility(p, c);
    const icon = r.status==='ok' ? '✅' : (r.status==='bad' ? '❌' : '⚠️');
    return `<div class="compat-chip ${r.status}" title="${r.reasons.join(' | ').replace(/"/g,'')}" onclick="openQuickView('${c.id}')">${icon} ${c.name}</div>`;
  }).join('');
  return `<div class="qv-related-section"><h4>🔗 التوافق مع منتجات تانية</h4><div class="compat-chip-row">${chips}</div></div>`;
}

/* ================= 3) FLOATING PROJECT PANEL ================= */
function ensureProjectPanelMounted(){
  if(document.getElementById('projectPanel')) return;
  const btn = document.createElement('button');
  btn.id = 'projectPanelToggle';
  btn.className = 'project-panel-toggle';
  btn.innerHTML = '🧾 مشروعك';
  btn.onclick = toggleProjectPanel;
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'projectPanel';
  panel.className = 'project-panel';
  panel.innerHTML = `<div class="project-panel-head"><b>📊 ملخص مشروعك</b><button onclick="toggleProjectPanel()">×</button></div>
    <div id="projectPanelBody" class="project-panel-body"></div>`;
  document.body.appendChild(panel);
}
function toggleProjectPanel(){
  ensureProjectPanelMounted();
  document.getElementById('projectPanel').classList.toggle('open');
  renderProjectPanel();
}
function renderProjectPanel(){
  ensureProjectPanelMounted();
  const body = document.getElementById('projectPanelBody');
  const items = (typeof qbItems !== 'undefined' ? qbItems : []).filter(i=>i.productId);
  if(!items.length){ body.innerHTML = '<p class="finder-note">لسه مفيش منتجات مضافة للمشروع — دوس "➕ عرض سعر" على أي منتج.</p>'; document.getElementById('projectPanelToggle').style.display = (typeof qbItems!=='undefined' && qbItems.length) ? 'flex' : 'none'; return; }
  document.getElementById('projectPanelToggle').style.display = 'flex';
  let deviceCount=0, poeW=0, storage=0, rackU=0, powerW=0, total=0;
  items.forEach(i=>{
    const p = products.find(x=>x.id===i.productId);
    if(!p) return;
    const s = p.specs||{};
    deviceCount += i.qty;
    total += i.qty * i.price;
    if(s.poe_watts) poeW += Number(s.poe_watts)*i.qty;
    if(s.storage) { const m = String(s.storage).match(/[\d.]+/); if(m) storage += parseFloat(m[0])*i.qty; }
    if(s.rack_units) rackU += Number(s.rack_units)*i.qty;
    if(s.power) { const m = String(s.power).match(/[\d.]+/); if(m) powerW += parseFloat(m[0])*i.qty; }
  });
  const rows = [
    ['🔢 عدد الأجهزة', deviceCount],
    ['💰 التكلفة التقديرية', total.toLocaleString('en-US')+' ج.م'],
    ['🔌 استهلاك PoE', poeW ? poeW.toFixed(1)+' واط' : '—'],
    ['💾 مساحة التخزين', storage ? storage.toFixed(0)+' TB' : '—'],
    ['📦 وحدات الراك (U)', rackU || '—'],
    ['⚡ استهلاك الطاقة', powerW ? powerW.toFixed(0)+' واط' : '—'],
  ];
  body.innerHTML = rows.map(([l,v])=>`<div class="project-panel-row"><span>${l}</span><b>${v}</b></div>`).join('')
    + `<button class="btn btn-primary" style="width:100%;margin-top:10px;" onclick="navigateTo('tools');showToolTab('quote');toggleProjectPanel();">فتح بناء عرض السعر الكامل</button>`;
}
/* Patch renderQuoteTable (if already defined by boq.js) so the panel stays in sync automatically. */
(function patchRenderQuoteTable(){
  const original = window.renderQuoteTable;
  if(typeof original === 'function'){
    window.renderQuoteTable = function(){ original.apply(this, arguments); renderProjectPanel(); };
  }
})();

/* ================= 4) SORT + GRID DENSITY ================= */
let currentSortMode = 'newest';
let currentGridDensity = localStorage.getItem('nn_grid_density') || 'grid';

function ensureSortControlsMounted(){
  const filtersBar = document.getElementById('filtersBar');
  if(!filtersBar || document.getElementById('sortGridControls')) return;
  const controls = document.createElement('div');
  controls.id = 'sortGridControls';
  controls.className = 'sort-grid-controls';
  controls.innerHTML = `
    <select id="sortSelect" onchange="currentSortMode=this.value; renderProducts();">
      <option value="newest">الأحدث</option>
      <option value="popularity">الأكثر رواجًا</option>
      <option value="price_asc">السعر: من الأقل</option>
      <option value="price_desc">السعر: من الأعلى</option>
      <option value="brand">الماركة</option>
      <option value="alpha">أبجديًا</option>
      <option value="ai">توصية AI</option>
    </select>
    <div class="grid-density-toggle">
      <button data-v="grid" title="شبكة" onclick="setGridDensity('grid')">▦</button>
      <button data-v="compact" title="شبكة مضغوطة" onclick="setGridDensity('compact')">▩</button>
      <button data-v="list" title="قائمة" onclick="setGridDensity('list')">☰</button>
    </div>`;
  filtersBar.insertAdjacentElement('afterend', controls);
  applyGridDensityUI();
}
function setGridDensity(v){
  currentGridDensity = v;
  localStorage.setItem('nn_grid_density', v);
  applyGridDensityUI();
}
function applyGridDensityUI(){
  const grid = document.getElementById('allProductsGrid');
  if(grid) grid.className = 'prod-grid density-' + currentGridDensity;
  document.querySelectorAll('.grid-density-toggle button').forEach(b=>b.classList.toggle('active', b.dataset.v===currentGridDensity));
}
function sortProductList(list){
  const arr = [...list];
  switch(currentSortMode){
    case 'popularity': return arr.sort((a,b)=>(b.popularity_score||0)-(a.popularity_score||0));
    case 'price_asc': return arr.sort((a,b)=>Number(a.price)-Number(b.price));
    case 'price_desc': return arr.sort((a,b)=>Number(b.price)-Number(a.price));
    case 'brand': return arr.sort((a,b)=>(a.brand||'').localeCompare(b.brand||'','ar'));
    case 'alpha': return arr.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ar'));
    case 'ai': return arr.sort((a,b)=>(b.is_ai_recommended?1:0)-(a.is_ai_recommended?1:0));
    case 'newest':
    default: return arr.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  }
}
/* Wrap renderProducts (defined in products.js) to add sort + density without touching its filters. */
(function patchRenderProducts(){
  const original = window.renderProducts;
  if(typeof original !== 'function') return;
  window.renderProducts = function(){
    ensureSortControlsMounted();
    original.apply(this, arguments);
    const el = document.getElementById('allProductsGrid');
    if(el){
      // re-derive the same filtered list original just rendered, then re-sort + re-apply density.
      // Cheapest safe approach: read current cards back out is fragile, so instead we recompute filters here too.
      let list = products;
      if(typeof saleOnlyFilter!=='undefined' && saleOnlyFilter) list = list.filter(p => p.old_price && p.old_price > p.price);
      if(typeof currentCategoryFilter!=='undefined' && currentCategoryFilter && currentCategoryFilter !== 'الكل') list = list.filter(p => p.category === currentCategoryFilter);
      if(typeof currentBrandFilter!=='undefined' && currentBrandFilter && currentBrandFilter !== 'الكل') list = list.filter(p => (p.brand||'') === currentBrandFilter);
      if(typeof currentSearchQuery!=='undefined' && currentSearchQuery) list = list.filter(p => smartSearchMatch(p, currentSearchQuery));
      if(typeof priceMinFilter!=='undefined' && priceMinFilter !== null && !isNaN(priceMinFilter)) list = list.filter(p => Number(p.price) >= priceMinFilter);
      if(typeof priceMaxFilter!=='undefined' && priceMaxFilter !== null && !isNaN(priceMaxFilter)) list = list.filter(p => Number(p.price) <= priceMaxFilter);
      list = sortProductList(list);
      el.innerHTML = list.map(productCardHTML).join('') || '<div class="empty-state">لا توجد منتجات مطابقة</div>';
      const countLabel = document.getElementById('productsCountLabel');
      if(countLabel) countLabel.innerText = `${list.length} منتج متاح`;
      applyGridDensityUI();
    }
  };
})();

/* ================= 5) TYPO-TOLERANT MULTI-FIELD SEARCH ================= */
function levenshtein(a, b){
  a=a.toLowerCase(); b=b.toLowerCase();
  const m=a.length, n=b.length;
  if(!m) return n; if(!n) return m;
  const d = Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=0;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    d[i][j] = a[i-1]===b[j-1] ? d[i-1][j-1] : 1+Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
  return d[m][n];
}
function smartSearchMatch(p, query){
  const q = query.toLowerCase().trim();
  if(!q) return true;
  const haystacks = [p.name, p.brand, p.category, p.description, Array.isArray(p.recommendation_tags)?p.recommendation_tags.join(' '):'',
    p.specs ? Object.values(p.specs).flat().join(' ') : ''].join(' ').toLowerCase();
  if(haystacks.includes(q)) return true;
  // typo tolerance: check each word in the query against words in the name/brand (allow distance 1-2 depending on length)
  const words = haystacks.split(/\s+/);
  return q.split(/\s+/).every(qw => qw.length>2 && words.some(w => levenshtein(w, qw) <= (qw.length>6?2:1)));
}

document.addEventListener('DOMContentLoaded', function(){
  ensureCompareDrawerMounted();
  ensureProjectPanelMounted();
  renderProjectPanel();
});
