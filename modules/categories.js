/* categories.js — category grid, quick-cats bar, mega menu, downloads tab, "coming soon" category pages. */

function renderCategoryDistChart(){
  const section = document.getElementById('catalogChartSection');
  const canvas = document.getElementById('chartCategoryDist');
  const legendEl = document.getElementById('chartLegend');
  const centerNum = document.getElementById('chartCenterNum');
  if(!section || !canvas || typeof Chart === 'undefined' || !products.length) return;
  const counts = {};
  products.forEach(p => { const c = p.category || 'غير مصنف'; counts[c] = (counts[c]||0) + 1; });
  let entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return;
  // group long tails into "أخرى" so the legend stays clean and readable
  const MAX_SLICES = 7;
  if(entries.length > MAX_SLICES){
    const head = entries.slice(0, MAX_SLICES - 1);
    const otherTotal = entries.slice(MAX_SLICES - 1).reduce((s,e)=>s+e[1],0);
    entries = [...head, ['أخرى', otherTotal]];
  }
  section.style.display = '';
  const total = entries.reduce((s,e)=>s+e[1],0);
  if(centerNum) centerNum.textContent = total.toLocaleString('ar-EG');
  const palette = ['#ff7a2f','#2f6fed','#1fae6b','#f4c542','#a855f7','#ec4899','#14b8a6','#94a3b8'];
  if(window._catChart) window._catChart.destroy();
  window._catChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(e=>e[0]),
      datasets: [{
        data: entries.map(e=>e[1]),
        backgroundColor: entries.map((_,i)=>palette[i % palette.length]),
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--paper-2') || '#fff'
      }]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      cutout:'68%',
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{ label:(ctx)=>{ const pct = ((ctx.parsed/total)*100).toFixed(1); return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`; } } }
      }
    }
  });
  if(legendEl){
    legendEl.innerHTML = entries.map((e,i)=>{
      const pct = ((e[1]/total)*100).toFixed(1);
      return `<div class="ccl-item"><span class="ccl-dot" style="background:${palette[i % palette.length]}"></span><span class="ccl-label"><b>${e[1]}</b> ${e[0]}</span><span class="ccl-pct">${pct}%</span></div>`;
    }).join('');
  }
}

/* ---------------- التنزيلات (كتالوجات/أدلة/ملفات عامة) ---------------- */
let downloadsList = [];
let currentDownloadCatFilter = 'الكل';

async function loadDownloads(){
  const grid = document.getElementById('downloadsGrid');
  if(!grid) return;
  const { data, error } = await sb.from('downloads').select('*').order('sort_order', {ascending:true});
  if(error){ console.error(error); grid.innerHTML = '<div class="downloads-empty">تعذر تحميل التنزيلات حاليًا.</div>'; return; }
  downloadsList = data || [];
  renderDownloadsFilters();
  renderDownloads();
}

function renderDownloadsFilters(){
  const bar = document.getElementById('downloadsFiltersBar');
  if(!bar) return;
  const cats = ['الكل', ...new Set(downloadsList.map(d=>d.category).filter(Boolean))];
  bar.innerHTML = cats.map(c => `<button class="filter-btn ${c===currentDownloadCatFilter?'active':''}" onclick="filterDownloadsByCat('${c.replace(/'/g,"\\'")}', this)">${c}</button>`).join('');
}

function filterDownloadsByCat(cat, btnEl){
  currentDownloadCatFilter = cat;
  document.querySelectorAll('#downloadsFiltersBar .filter-btn').forEach(b=>b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');
  renderDownloads();
}

function renderDownloads(){
  const grid = document.getElementById('downloadsGrid');
  if(!grid) return;
  let list = downloadsList;
  if(currentDownloadCatFilter && currentDownloadCatFilter !== 'الكل') list = list.filter(d => d.category === currentDownloadCatFilter);
  if(!list.length){ grid.innerHTML = '<div class="downloads-empty">لا توجد ملفات متاحة في هذا القسم حاليًا.</div>'; return; }
  grid.innerHTML = list.map(d => {
    const { data } = sb.storage.from('public-downloads').getPublicUrl(d.file_path, { download: d.file_path.split('/').pop() });
    return `
    <div class="download-card">
      <span class="dl-cat">${d.category || 'عام'}</span>
      <h4>${d.title}</h4>
      <p>${d.description || ''}</p>
      ${d.file_size_label ? `<span class="dl-meta">📦 ${d.file_size_label}</span>` : ''}
      <a class="btn btn-outline" href="${data.publicUrl}" target="_blank" rel="noopener">⬇️ تحميل الملف</a>
    </div>`;
  }).join('');
}

const CAT_ACCENTS = ['var(--cable-blue)','var(--cable-orange)','var(--ok)','#F59E0B','var(--danger)'];
const CAT_TAGS = {
  'كاميرات مراقبة':['Indoor','Outdoor','PTZ','AI Detection'],
  'أنظمة أمنية':['إنذار','تحكم دخول','مراقبة 24/7'],
  'كمبيوتر ولابتوبات':['مكتبي','لابتوب','ملحقات'],
  'طابعات':['ليزر','حبر','متعددة الوظائف'],
  'شبكات':['سويتشات','راوتر','Access Point'],
  'UPS وحلول الطاقة':['UPS','بطاريات','حماية كهرباء'],
  'حلول IT متكاملة':['شبكات','سيرفرات','دعم فني'],
  'منتجات رقمية':['تراخيص','برامج','أكواد تفعيل'],
  'سكريبتات وأتمتة':['أتمتة','سكريبتات','تكامل أنظمة']
};

function renderCatGrid(){
  const grid = document.getElementById('homeCatGrid');
  grid.innerHTML = categories.map((c,i) => {
    const accent = CAT_ACCENTS[i % CAT_ACCENTS.length];
    const tags = CAT_TAGS[c.name] || ['منتجات مميزة','جودة مضمونة','دعم فني'];
    const count = products.filter(p=>p.category===c.name).length;
    const icon = c.icon || CAT_ICONS[c.name] || '📦';
    const CORNERS = [[6,10],[6,82],[80,10],[80,82]];
    const dots = Array.from({length:4}).map((_,d)=>{
      const [bx,by] = CORNERS[d % CORNERS.length];
      const dx = bx + Math.random()*10, dy = by + Math.random()*8, dur = (4+Math.random()*4).toFixed(1);
      return `<span class="cat-dot" style="--dx:${dx}%;--dy:${dy}%;--dur:${dur}s;animation-delay:${(d*0.6).toFixed(1)}s;"></span>`;
    }).join('');
    return `
    <div class="cat-card" style="--cat-accent:${accent}" onclick="selectCategoryFilter('${c.name}')">
      <div class="cat-card-bg">${dots}</div>
      <div class="cat-card-face">
        <div class="cat-icon">${icon}</div>
        <b>${c.name}</b>
        <span>${count} منتج</span>
      </div>
      <div class="cat-card-hover">
        <div class="cat-icon" style="font-size:24px;margin-bottom:4px;">${icon}</div>
        <b>${c.name}</b>
        <div class="cat-tags">${tags.map(t=>`<span>${t}</span>`).join('')}</div>
        <span>${count} منتج متاح</span>
        <div class="cat-explore">استكشف <span class="cat-arrow">←</span></div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state">لا توجد أقسام بعد - أضفها من لوحة التحكم</div>';
  renderMegaMenu();
  renderQuickCats();
}

function renderQuickCats(){
  const track = document.getElementById('quickCatTrack');
  if(!track) return;
  track.innerHTML = categories.map(c => {
    const icon = c.icon || CAT_ICONS[c.name] || '📦';
    return `<div class="qc-item" onclick="selectCategoryFilter('${c.name.replace(/'/g,"\\'")}')">
      <div class="qc-ic">${icon}</div>
      <b>${c.name}</b>
    </div>`;
  }).join('');
}
function scrollQuickCats(dir){
  const track = document.getElementById('quickCatTrack');
  if(!track) return;
  // page is dir="rtl": scrolling toward "next" content moves scrollLeft negative in RTL flex rows
  track.scrollBy({ left: dir * -260, behavior: 'smooth' });
}

function renderMegaMenu(){
  const listHost = document.getElementById('megaMenuList');
  const showHost = document.getElementById('megaMenuShowcase');
  if(!listHost || !showHost) return;
  if(!categories.length){ listHost.innerHTML = '<div class="empty-state" style="padding:14px;">لا توجد أقسام بعد</div>'; return; }

  listHost.innerHTML = categories.slice(0,10).map((c,i) => `
    <div class="mega-list-item${i===0?' active':''}" data-mega-cat="${i}"
         onmouseenter="renderMegaShowcase(${i})" onclick="navigateTo('products'); selectCategoryFilter('${c.name}')">
      <span class="mega-ic">${c.icon || CAT_ICONS[c.name] || '📦'}</span>
      <span>${c.name}</span>
      <small>${products.filter(p=>p.category===c.name).length}</small>
    </div>`).join('');

  renderMegaShowcase(0);
}

function renderMegaShowcase(idx){
  const showHost = document.getElementById('megaMenuShowcase');
  if(!showHost) return;
  document.querySelectorAll('#megaMenuList .mega-list-item').forEach((el,i)=>el.classList.toggle('active', i===idx));
  const c = categories[idx];
  if(!c){ showHost.innerHTML=''; return; }
  const inCat = products.filter(p=>p.category===c.name);
  const cover = inCat.find(p=>(p.images&&p.images[0])||p.image_url);
  const coverImg = cover ? ((cover.images&&cover.images[0])||cover.image_url) : 'https://placehold.co/360x360/0E1628/8E9AAF?text=Delta+IT';
  const top = inCat.slice().sort((a,b)=>(b.is_bestseller?1:0)-(a.is_bestseller?1:0)).slice(0,3);
  showHost.innerHTML = `
    <div class="mega-showcase-img"><img src="${coverImg}" alt="${c.name}" loading="lazy" width="180" height="220"></div>
    <div class="mega-showcase-info">
      <h5>${c.icon || CAT_ICONS[c.name] || '📦'} ${c.name}</h5>
      <p>${inCat.length} منتج متاح في هذا القسم</p>
      ${top.map(p=>`
        <div class="mega-mini-prod" onclick="navigateTo('products'); openProductDetail('${p.id}')">
          <img class="mega-mini-thumb" src="${(p.images&&p.images[0])||p.image_url||'https://placehold.co/80/0E1628/8E9AAF?text=%20'}" alt="" loading="lazy" width="36" height="36">
          <span class="mega-mini-name">${p.name}</span>
          <span class="mega-mini-price">${Number(p.price||0).toLocaleString('ar-EG')} ج.م</span>
        </div>`).join('') || '<div style="font-size:12px;color:var(--ink-soft);padding:10px 0;">لا توجد منتجات بعد</div>'}
      <a class="btn btn-outline mega-showcase-cta" style="margin-top:12px;" onclick="navigateTo('products'); selectCategoryFilter('${c.name}')">تصفح كل ${c.name} ←</a>
    </div>`;
}

function categoryAccentKey(p){
  const text = ((p.category||'') + ' ' + (p.name||'')).toLowerCase();
  if(/كامير|camera|cctv|nvr|dvr/.test(text)) return 'camera';
  if(/بصم|fingerprint|access|حضور|attendance/.test(text)) return 'access';
  if(/rack|باطاري|ups|server|سيرفر/.test(text)) return 'rack';
  if(/hdd|storage|تخزين|هارد/.test(text)) return 'storage';
  if(/switch|router|شبك|network|cable|كابل/.test(text)) return 'network';
  return 'network';
}

function openCategoryComingSoon(term, isExactCategory){
  soonCurrentTerm = term;
  const meta = CATEGORY_META[term] || {
    icon:'📦', label: term, desc:`إحنا بنجهز منتجات قسم "${term}" دلوقتي عشان نضيفها للكتالوج بأفضل الماركات وأنسب سعر.`,
    expected:['هيتم تحديد المنتجات المتاحة قريبًا'], related: DEFAULT_RELATED
  };
  document.getElementById('soonIcon').innerText = meta.icon;
  document.getElementById('soonTitle').innerText = meta.label;
  document.getElementById('soonDesc').innerText = meta.desc;
  document.getElementById('soonExpected').innerHTML = meta.expected.map(x=>`<span>${x}</span>`).join('');
  document.getElementById('soonRelated').innerHTML = (meta.related||DEFAULT_RELATED).map(r=>
    `<button onclick="selectCategoryFilter('${r.replace(/'/g,"\\'")}')">${(CATEGORY_META[r]&&CATEGORY_META[r].icon)||'🔗'} ${(CATEGORY_META[r]&&CATEGORY_META[r].label)||r}</button>`
  ).join('');
  document.getElementById('soonNotifyMsg').innerText = '';
  document.getElementById('soonNotifyPhone').value = '';
  document.getElementById('soonSearchInput').value = '';
  navigateTo('category-soon');
}
function soonRunSearch(){
  const v = document.getElementById('soonSearchInput').value.trim();
  if(!v) return;
  executeSearch(v);
}
function soonRequestQuote(){
  const lines = [`📝 طلب عرض سعر - قسم "${soonCurrentTerm}"`, '', 'محتاج تفاصيل عن هذا القسم لو سمحت.'];
  goToServiceQuote ? goToServiceQuote(soonCurrentTerm) : window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}
function soonOpenWhatsapp(){
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحبًا، أنا مهتم بقسم "'+soonCurrentTerm+'" وحابب أعرف تفاصيل أكتر.')}`, '_blank');
}
async function soonSubmitNotify(){
  const phone = document.getElementById('soonNotifyPhone').value.trim();
  const msg = document.getElementById('soonNotifyMsg');
  if(!phone || phone.length<8){ msg.style.color='var(--danger,#e5484d)'; msg.innerText='اكتب رقم موبايل صحيح'; return; }
  if(typeof checkRateLimit === 'function' && !checkRateLimit('category_notify', 5, 15*60*1000)){ msg.style.color='var(--danger,#e5484d)'; msg.innerText='محاولات كتير في وقت قصير - حاول تاني بعد كام دقيقة.'; return; }
  try{
    const { error } = await sb.from('category_notify_requests').insert({ category_key: soonCurrentTerm, category_label: (CATEGORY_META[soonCurrentTerm]&&CATEGORY_META[soonCurrentTerm].label)||soonCurrentTerm, phone });
    if(error) throw error;
    msg.style.color = 'var(--brand-blue)';
    msg.innerText = '✅ تمام! هنبلغك أول ما القسم ده يتوفر.';
  }catch(e){
    console.error('category_notify_requests insert failed', e);
    msg.style.color='var(--danger,#e5484d)';
    msg.innerText = 'حصل خطأ، جرب تاني.';
  }
}

