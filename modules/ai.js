/* ai.js — AI Solution Finder wizard + AI Solution Builder bundles ("finder" flow). */

function resetFinder(){
  finderAnswers = {};
  finderStepIndex = 0;
  document.getElementById('finderResultArea').style.display = 'none';
  document.getElementById('finderStepArea').style.display = 'block';
  renderFinderProgress();
  renderFinderStep();
}

function goToSolution(sector){
  navigateTo('finder');
  finderAnswers = { sector };
  finderStepIndex = 1;
  document.getElementById('finderResultArea').style.display = 'none';
  document.getElementById('finderStepArea').style.display = 'block';
  renderFinderProgress();
  renderFinderStep();
}

function showSolutionPreview(key){
  document.querySelectorAll('.sol-item').forEach(el=>el.classList.toggle('active', el.dataset.sol===key));
  document.querySelectorAll('.sol-preview').forEach(el=>el.classList.toggle('active', el.dataset.sol===key));
}

// Generalized handler for solution CTAs - action is either "finder:<sector>" (opens the
// camera-picking assistant pre-filled with that sector) or "page:<pageName>" (direct navigation).
// Used by both the built-in defaults and any admin-edited solutions (site_settings.solutions_menu).
function solutionAction(action){
  if(!action) return;
  const [type, value] = String(action).split(':');
  if(type === 'finder') goToSolution(value);
  else if(type === 'page') navigateTo(value);
}

/* ================= Solution Detail pages / AI Solution Builder / Rack Builder =================
   These are rule-based estimators (not a connected AI model) that match real catalog products
   by keyword so recommendations and "add to cart" always point at real, purchasable items.
   Any checklist line with no match in the current catalog is shown as "يحتاج تحديد من فريقنا"
   and is excluded from the price total, so we never show a fake price for a product we don't sell. */
function findBestProduct(keywords){
  const kws = keywords.map(k=>k.toLowerCase());
  return products.find(p=>{
    const hay = `${p.name||''} ${p.category||''}`.toLowerCase();
    return kws.some(k=>hay.includes(k));
  }) || null;
}

const SOLUTION_DATA = {
  home:{icon:'🏠', title:'حلول المنازل', items:[
    {label:'كاميرات مراقبة داخلي/خارجي', qty:4, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR/DVR', qty:1, kw:['nvr','dvr']},
    {label:'هارد تخزين', qty:1, kw:['هارد','hdd']},
    {label:'راوتر شبكة منزلية', qty:1, kw:['راوتر','router']},
  ]},
  company:{icon:'🏢', title:'حلول الشركات والمكاتب', items:[
    {label:'كاميرات مراقبة', qty:8, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:1, kw:['nvr']},
    {label:'سويتش شبكة PoE', qty:1, kw:['سويتش','poe']},
    {label:'جهاز بصمة/تحكم دخول', qty:1, kw:['بصمة','اكسس']},
    {label:'UPS', qty:1, kw:['ups']},
    {label:'اكسس بوينت WiFi', qty:2, kw:['اكسس بوينت','واي فاي']},
  ]},
  factory:{icon:'🏭', title:'حلول المصانع والمستودعات', items:[
    {label:'كاميرات صناعية خارجية', qty:12, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:1, kw:['nvr']},
    {label:'سويتش PoE', qty:2, kw:['سويتش','poe']},
    {label:'UPS', qty:1, kw:['ups']},
    {label:'كابل شبكة', qty:1, kw:['كابل']},
  ]},
  hospital:{icon:'🏥', title:'حلول المستشفيات والعيادات', items:[
    {label:'كاميرات مراقبة هادئة', qty:16, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:2, kw:['nvr']},
    {label:'جهاز تحكم دخول الغرف', qty:2, kw:['اكسس','بصمة']},
    {label:'سيرفر', qty:1, kw:['سيرفر','server']},
    {label:'UPS', qty:2, kw:['ups']},
    {label:'اكسس بوينت WiFi', qty:4, kw:['اكسس بوينت','واي فاي']},
  ]},
  parking:{icon:'🅿️', title:'حلول الجراجات والمواقف', items:[
    {label:'كاميرات IR بعيدة المدى', qty:6, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:1, kw:['nvr']},
    {label:'سويتش PoE', qty:1, kw:['سويتش','poe']},
    {label:'UPS', qty:1, kw:['ups']},
  ]},
  hotel:{icon:'🏨', title:'حلول الفنادق', items:[
    {label:'كاميرات الممرات والمداخل', qty:14, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:2, kw:['nvr']},
    {label:'قفل/تحكم دخول ذكي للغرف', qty:1, kw:['اكسس','بصمة']},
    {label:'اكسس بوينت WiFi للنزلاء', qty:6, kw:['اكسس بوينت','واي فاي']},
    {label:'سويتش PoE', qty:2, kw:['سويتش','poe']},
    {label:'UPS', qty:1, kw:['ups']},
  ]},
  school:{icon:'🏫', title:'حلول المدارس والمعاهد', items:[
    {label:'كاميرات الفصول والساحات', qty:10, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR', qty:1, kw:['nvr']},
    {label:'جهاز حضور المعلمين بالبصمة', qty:1, kw:['بصمة','اكسس']},
    {label:'سويتش شبكة', qty:1, kw:['سويتش']},
    {label:'UPS', qty:1, kw:['ups']},
  ]},
  retail:{icon:'🏪', title:'حلول المحلات والمولات', items:[
    {label:'كاميرات الكاشير والمخزن', qty:6, kw:['كاميرا']},
    {label:'جهاز تسجيل NVR/DVR', qty:1, kw:['nvr','dvr']},
    {label:'UPS', qty:1, kw:['ups']},
    {label:'سويتش شبكة', qty:1, kw:['سويتش']},
  ]},
};

let currentSolutionSector = null;
function openSolutionDetail(sector){
  currentSolutionSector = sector;
  const data = SOLUTION_DATA[sector];
  navigateTo('solution-detail');
  if(!data) return;
  document.getElementById('solDetailHead').innerHTML = `<h2>${data.icon} ${data.title} — الحل الكامل</h2><p>الباقة المقترحة وتقدير السعر بناءً على منتجاتنا الحالية</p>`;
  let total = 0;
  const rows = data.items.map(it=>{
    const p = findBestProduct(it.kw);
    if(p){
      total += (Number(p.price)||0) * it.qty;
      return `<div class="finder-chip-row"><span>✔ ${it.label} × ${it.qty}</span><b>${p.name} — ${Number(p.price).toLocaleString('ar-EG')} ج.م/وحدة</b></div>`;
    }
    return `<div class="finder-chip-row"><span>◻ ${it.label} × ${it.qty}</span><i>يحتاج تحديد من فريقنا</i></div>`;
  }).join('');
  document.getElementById('solDetailChecklist').innerHTML = rows;
  document.getElementById('solDetailTotal').innerText = total>0 ? `من ${total.toLocaleString('ar-EG')} ج.م` : 'يحتاج معاينة لتحديد السعر';
}
function addSolutionBundleToCart(){
  const data = SOLUTION_DATA[currentSolutionSector];
  if(!data) return;
  let added = 0;
  data.items.forEach(it=>{
    const p = findBestProduct(it.kw);
    if(p){ cart[p.id] = (cart[p.id]||0) + it.qty; added++; }
  });
  saveCartAndRefresh();
  alert(added ? `✅ اتضاف ${added} منتج للسلة` : 'المنتجات دي محتاجة تحديد من فريقنا، تواصل معانا للسعر.');
}

function runAiSolutionBuilder(){
  const placeType = document.getElementById('aiPlaceType').value;
  const area = Math.max(20, parseInt(document.getElementById('aiArea').value)||300);
  const floors = Math.max(1, parseInt(document.getElementById('aiFloors').value)||1);
  const employees = Math.max(1, parseInt(document.getElementById('aiEmployees').value)||10);
  const needServer = document.getElementById('aiNeedServer').checked;
  const needWifi = document.getElementById('aiNeedWifi').checked;
  const needAccess = document.getElementById('aiNeedAccess').checked;
  const needCabling = document.getElementById('aiNeedCabling').checked;

  const cameras = Math.max(4, Math.ceil(area/80) + floors);
  const items = [];
  items.push({label:`كاميرات مراقبة`, qty:cameras, kw:['كاميرا']});
  items.push({label:'جهاز تسجيل NVR', qty: cameras>16?2:1, kw:['nvr','dvr']});
  items.push({label:'سويتش شبكة PoE', qty: Math.ceil(cameras/16), kw:['سويتش','poe']});
  if(needWifi) items.push({label:'اكسس بوينت WiFi', qty: Math.max(1, Math.ceil(area/150)*floors), kw:['اكسس بوينت','واي فاي']});
  if(needAccess) items.push({label:'جهاز بصمة/تحكم دخول', qty: Math.max(1, Math.ceil(employees/50)), kw:['بصمة','اكسس']});
  if(needServer) items.push({label:'سيرفر', qty:1, kw:['سيرفر','server']});
  if(needCabling) items.push({label:'باتش بانل + كابينة شبكة', qty:floors, kw:['باتش بانل','كابينة']});
  items.push({label:'UPS', qty: needServer? floors+1 : floors, kw:['ups']});
  items.push({label:'تركيب وتشغيل', qty:1, kw:['تركيب','installation']});

  let total = 0;
  const rows = items.map(it=>{
    const p = findBestProduct(it.kw);
    if(p){
      total += (Number(p.price)||0) * it.qty;
      return `<div class="finder-chip-row"><span>✔ ${it.label} × ${it.qty}</span><b>${p.name} — ${Number(p.price).toLocaleString('ar-EG')} ج.م/وحدة</b></div>`;
    }
    return `<div class="finder-chip-row"><span>◻ ${it.label} × ${it.qty}</span><i>يحتاج تحديد من فريقنا</i></div>`;
  }).join('');

  window.__aiBuilderItems = items;
  document.getElementById('aiBuilderChecklist').innerHTML = rows;
  document.getElementById('aiBuilderTotal').innerText = total>0 ? `من ${total.toLocaleString('ar-EG')} ج.م` : 'يحتاج معاينة لتحديد السعر';
  document.getElementById('aiBuilderResult').style.display = 'block';
  document.getElementById('aiBuilderResult').scrollIntoView({behavior:'smooth', block:'start'});
}
function addAiBundleToCart(){
  const items = window.__aiBuilderItems || [];
  let added = 0;
  items.forEach(it=>{
    const p = findBestProduct(it.kw);
    if(p){ cart[p.id] = (cart[p.id]||0) + it.qty; added++; }
  });
  saveCartAndRefresh();
  alert(added ? `✅ اتضاف ${added} منتج للسلة` : 'المنتجات دي محتاجة تحديد من فريقنا، تواصل معانا للسعر.');
}

/* ================= Rack Builder (Phase 2) =================
   Production rack-elevation planner: every component has a default U size that
   the user can override (1/2/3/4/6/8/9/12U — "2U 4U 6U 8U and more") plus real
   power(W) and weight(kg) figures, so we can calculate cooling load, running
   cost and UPS runtime — not just "does it fit". Projects can be saved to
   Supabase (rack_projects) for a shareable reference code, or exported as PDF. */
const RACK_U_OPTIONS = [1,2,3,4,6,8,9,12];
const RACK_COMPONENTS = [
  {key:'router',    label:'Router',          u:1, icon:'📡', watts:25,  kg:2,  fixedU:true},
  {key:'firewall',  label:'Firewall',        u:1, icon:'🛡️', watts:40,  kg:3,  fixedU:true},
  {key:'core-sw',   label:'Core Switch',     u:1, icon:'🔀', watts:120, kg:6,  fixedU:false},
  {key:'access-sw', label:'Access Switch',   u:1, icon:'⚙️', watts:60,  kg:4,  fixedU:false},
  {key:'patch',     label:'Patch Panel',     u:1, icon:'🧷', watts:0,   kg:1.5,fixedU:false},
  {key:'pdu',       label:'PDU',             u:1, icon:'🔌', watts:0,   kg:2,  fixedU:false},
  {key:'cable-mgr', label:'Cable Manager',   u:1, icon:'🧵', watts:0,   kg:0.8,fixedU:true},
  {key:'blank',     label:'Blanking Panel',  u:1, icon:'▫️', watts:0,   kg:0.3,fixedU:true},
  {key:'shelf',     label:'Fixed Shelf',     u:1, icon:'📥', watts:0,   kg:1.2,fixedU:true},
  {key:'kvm',       label:'KVM Console',     u:1, icon:'🖱️', watts:15,  kg:5,  fixedU:false},
  {key:'nvr',       label:'NVR',             u:2, icon:'💽', watts:60,  kg:5,  fixedU:false},
  {key:'server',    label:'Server',          u:2, icon:'🖥️', watts:300, kg:18, fixedU:false},
  {key:'ups',       label:'UPS',             u:2, icon:'🔋', watts:0,   kg:22, fixedU:false, vaCapacity:2000},
];
let rackItems = [];
let rackPendingKey = null, rackPendingU = null;

function renderFinderProgress(){
  const bar = document.getElementById('finderProgress');
  const total = FINDER_STEPS.length;
  bar.innerHTML = FINDER_STEPS.map((s,i)=>{
    const cls = i < finderStepIndex ? 'done' : (i === finderStepIndex ? 'current' : '');
    return `<div class="dot ${cls}"></div>`;
  }).join('');
}

function renderFinderStep(){
  const step = FINDER_STEPS[finderStepIndex];
  const area = document.getElementById('finderStepArea');
  const chips = Object.keys(finderAnswers).map(k => finderChipsFor(k)).join('');
  if(step.multi){
    const selected = finderAnswers[step.key] || [];
    area.innerHTML = `
      ${chips ? `<div class="finder-summary-chips">${chips}</div>` : ''}
      <div class="finder-step-title">${step.title}</div>
      <p class="finder-step-sub">${step.sub}</p>
      <div class="finder-options-grid">
        ${step.options.map(o => `<div class="finder-opt ${selected.includes(o.value)?'finder-opt-selected':''}" onclick="finderToggleFeature('${o.value}')"><span class="ic">${o.icon}</span>${o.label}</div>`).join('')}
      </div>
      <div class="finder-nav-row">
        ${finderStepIndex > 0 ? `<span class="finder-back-link" onclick="finderBack()">→ رجوع للسؤال السابق</span>` : `<span></span>`}
        <button class="btn btn-primary" style="padding:9px 22px;font-size:13.5px;" onclick="finderContinueMulti()">${selected.length ? 'متابعة' : 'تخطي هذا السؤال'} →</button>
      </div>
    `;
    return;
  }
  area.innerHTML = `
    ${chips ? `<div class="finder-summary-chips">${chips}</div>` : ''}
    <div class="finder-step-title">${step.title}</div>
    <p class="finder-step-sub">${step.sub}</p>
    <div class="finder-options-grid">
      ${step.options.map(o => `<div class="finder-opt" onclick="finderAnswer('${step.key}','${o.value}')"><span class="ic">${o.icon}</span>${o.label}</div>`).join('')}
    </div>
    <div class="finder-nav-row">
      ${finderStepIndex > 0 ? `<span class="finder-back-link" onclick="finderBack()">→ رجوع للسؤال السابق</span>` : `<span></span>`}
      <span class="finder-back-link" style="font-size:12px;">سؤال ${finderStepIndex+1} من ${FINDER_STEPS.length}</span>
    </div>
  `;
}

function finderChipsFor(key){
  if(key === 'features'){
    const vals = finderAnswers.features || [];
    if(!vals.length) return '';
    return vals.map(v => `<span class="finder-chip">${FINDER_LABELS.features[v]}</span>`).join('');
  }
  if(finderAnswers[key] == null || !FINDER_LABELS[key]) return '';
  return `<span class="finder-chip">${FINDER_LABELS[key][finderAnswers[key]]}</span>`;
}

function finderToggleFeature(value){
  const arr = finderAnswers.features || [];
  const idx = arr.indexOf(value);
  if(idx > -1) arr.splice(idx,1); else arr.push(value);
  finderAnswers.features = arr;
  renderFinderStep();
}

function finderContinueMulti(){
  if(finderStepIndex < FINDER_STEPS.length - 1){
    finderStepIndex++;
    renderFinderProgress();
    renderFinderStep();
  } else {
    renderFinderProgress();
    renderFinderResults();
  }
}

function finderAnswer(key, value){
  finderAnswers[key] = value;
  if(finderStepIndex < FINDER_STEPS.length - 1){
    finderStepIndex++;
    renderFinderProgress();
    renderFinderStep();
  } else {
    renderFinderProgress();
    renderFinderResults();
  }
}

function finderBack(){
  if(finderStepIndex > 0){
    finderStepIndex--;
    delete finderAnswers[FINDER_STEPS[finderStepIndex].key];
    renderFinderProgress();
    renderFinderStep();
  }
}

const FINDER_BUDGET_RANGES = { economy:[0,1500], mid:[1500,3000], premium:[3000,Infinity], any:[0,Infinity] };
const FINDER_OUTDOOR_KW = ['خارجي','خارجية','outdoor','ip66','ip67','مقاوم للماء','مقاومة للماء'];
const FINDER_INDOOR_KW = ['داخلي','داخلية','indoor'];
const FINDER_IP_KW = [' ip ','ip كاميرا','كاميرا ip','network camera','poe',' نتورك'];
const FINDER_ANALOG_KW = ['analog','ahd','cvi','tvi','دي في آر','dvr'];

function finderTextOf(p){
  return `${p.name||''} ${p.description||''} ${p.brand||''} ${p.category||''}`.toLowerCase();
}
function finderMatchesAny(text, list){ return list.some(kw => text.includes(kw)); }

function finderLocationMatches(p){
  // لو المنتج فيه حقل installation_type منظم، استخدمه مباشرة (أدق من تخمين النص)
  if(p.installation_type){
    if(finderAnswers.location === 'both') return true;
    return p.installation_type === finderAnswers.location || p.installation_type === 'both';
  }
  // مفيش fallback على تخمين النص فقط لو مفيش حقل منظم
  return null; // غير معروف
}
function finderConnectionMatches(p){
  if(p.connection_type){
    return p.connection_type === finderAnswers.camType;
  }
  return null;
}

function getFinderCameraCandidates(){
  let notes = [];
  let base = products.filter(p => finderTextOf(p).includes('كامير') || (p.category||'').includes('كاميرا'));
  if(!base.length){ base = products.slice(); notes.push('لسه مفيش كاميرات مضافة في القسم، بنعرضلك أقرب منتجات متاحة.'); }

  let list = base;
  let usedStructuredData = base.some(p => p.installation_type || p.connection_type);

  // فلترة داخلي/خارجي - بيانات منظمة أول، ولو مفيش يرجع لتخمين الكلمات المفتاحية
  if(finderAnswers.location !== 'both'){
    const structuredMatch = list.filter(p => finderLocationMatches(p) === true);
    const structuredKnown = list.filter(p => finderLocationMatches(p) !== null);
    if(structuredKnown.length >= list.length * 0.5 && structuredMatch.length){
      list = structuredMatch; // اعتمد على البيانات المنظمة لأن أغلب المنتجات موصوفة
    } else {
      const kwList = finderAnswers.location === 'outdoor' ? FINDER_OUTDOOR_KW : FINDER_INDOOR_KW;
      const oppositeKw = finderAnswers.location === 'outdoor' ? FINDER_INDOOR_KW : FINDER_OUTDOOR_KW;
      const filtered = list.filter(p => finderMatchesAny(finderTextOf(p), kwList) || !finderMatchesAny(finderTextOf(p), oppositeKw));
      if(filtered.length) list = filtered;
    }
  }

  // فلترة IP / Analog
  if(finderAnswers.camType !== 'unsure'){
    const structuredMatch = list.filter(p => finderConnectionMatches(p) === true);
    const structuredKnown = list.filter(p => finderConnectionMatches(p) !== null);
    if(structuredKnown.length >= list.length * 0.5 && structuredMatch.length){
      list = structuredMatch;
    } else if(finderAnswers.camType === 'ip'){
      const filtered = list.filter(p => finderMatchesAny(finderTextOf(p), FINDER_IP_KW) || !finderMatchesAny(finderTextOf(p), FINDER_ANALOG_KW));
      if(filtered.length) list = filtered;
    } else {
      const filtered = list.filter(p => finderMatchesAny(finderTextOf(p), FINDER_ANALOG_KW));
      if(filtered.length) list = filtered;
    }
  }

  // فلترة الميزانية
  const range = FINDER_BUDGET_RANGES[finderAnswers.budget] || [0, Infinity];
  const budgetFiltered = list.filter(p => Number(p.price) >= range[0] && Number(p.price) <= range[1]);
  if(budgetFiltered.length){ list = budgetFiltered; }
  else if(finderAnswers.budget !== 'any'){ notes.push('مفيش كاميرات مطابقة تمامًا للميزانية المحددة، ده أقرب الخيارات المتاحة حاليًا.'); }

  if(!usedStructuredData) notes.push('ملحوظة للأدمن: أضف "مكان التركيب" و"نوع الاتصال" لمنتجات الكاميرات من لوحة التحكم عشان الترشيح يبقى أدق.');

  // ترتيب حسب: مطابقة المميزات المطلوبة (tags) ← أولوية الأدمن (recommendation_priority) ← مميز/الأكثر مبيعًا ← السعر
  const wantedFeatures = finderAnswers.features || [];
  function featureScore(p){
    if(!wantedFeatures.length) return 0;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    return wantedFeatures.filter(f => tags.includes(f)).length;
  }
  list = list.slice().sort((a,b) =>
    featureScore(b) - featureScore(a) ||
    (Number(b.recommendation_priority)||0) - (Number(a.recommendation_priority)||0) ||
    (b.featured||b.is_bestseller?1:0) - (a.featured||a.is_bestseller?1:0) ||
    Number(a.price)-Number(b.price)
  );
  if(wantedFeatures.length && !list.some(p => featureScore(p) > 0)){
    notes.push('ملحوظة للأدمن: مفيش منتجات متعلّم عليها المميزات المطلوبة (tags) — أضفها من لوحة التحكم عشان الترشيح يطابق طلب العميل بدقة.');
  }
  return { list: list.slice(0,6), notes };
}

function getFinderRecorderSuggestion(){
  const channelMap = { small: 4, medium: 16, large: 32 };
  const channels = channelMap[finderAnswers.count] || 8;
  const recorderType = finderAnswers.camType === 'analog' ? 'DVR' : 'NVR';
  const kw = finderAnswers.camType === 'analog' ? ['dvr'] : (finderAnswers.camType === 'ip' ? ['nvr'] : ['nvr','dvr']);

  // أول حاجة: دور بالبيانات المنظمة (channels + connection_type) لو متاحة
  let match = products.find(p => p.channels && p.channels >= channels &&
    (finderAnswers.camType === 'unsure' || !p.connection_type || p.connection_type === finderAnswers.camType) &&
    finderMatchesAny(finderTextOf(p), kw));
  if(!match) match = products.find(p => finderMatchesAny(finderTextOf(p), kw));

  return { channels, product: match || null, recorderType };
}

function getFinderStorageEstimate(){
  const countMidpoint = { small: 3, medium: 10, large: 20 };
  const cameras = countMidpoint[finderAnswers.count] || 8;
  const days = parseInt(finderAnswers.recordingDays) || 15;
  // نفس معادلة حاسبة التخزين الرسمية بالموقع (H.265 / 4MP كافتراض معقول لغرض الترشيح المبدئي)
  const bitrateKbps = SC_BITRATE_KBPS.h265[4];
  const totalGB = (bitrateKbps * 3600 * 24 * days * cameras) / (8 * 1024 * 1024);
  const totalTB = totalGB / 1024;
  const displayVal = totalTB >= 1 ? `${totalTB.toFixed(1)} تيرابايت تقريبًا` : `${Math.ceil(totalGB)} جيجابايت تقريبًا`;
  return `${displayVal} (لـ ${cameras} كاميرا تقريبًا × ${days} يوم تسجيل، دقة 4MP). للحصول على تقدير أدق بمواصفاتك بالظبط استخدم حاسبة التخزين.`;
}

function renderFinderResults(){
  document.getElementById('finderStepArea').style.display = 'none';
  const area = document.getElementById('finderResultArea');
  area.style.display = 'block';

  const { list, notes } = getFinderCameraCandidates();
  const recorder = getFinderRecorderSuggestion();
  const storage = getFinderStorageEstimate();

  const chips = Object.keys(finderAnswers).map(k => finderChipsFor(k)).join('');

  const camerasHtml = list.length
    ? `<div class="prod-grid">${list.map(productCardHTML).join('')}</div>`
    : `<div class="empty-state">مفيش كاميرات متاحة في الكتالوج دلوقتي مطابقة تمامًا - تواصل معنا وهنرشحلك بأيدينا.</div>`;

  const recorderHtml = recorder.product
    ? `<p>الجهاز المقترح من كتالوجنا: <b>${recorder.product.name}</b> - ${Number(recorder.product.price).toLocaleString('ar-EG')} ج.م</p>`
    : `<p>محتاج <b>${recorder.recorderType} بـ ${recorder.channels} قناة</b> على الأقل. تواصل معنا نرشحلك موديل متاح بالمواصفات دي.</p>`;

  area.innerHTML = `
    <div class="finder-summary-chips">${chips}</div>

    <div class="finder-result-section">
      <h4>📷 الكاميرات المناسبة ليك</h4>
      ${camerasHtml}
      ${notes.map(n => `<div class="finder-note">ℹ️ ${n}</div>`).join('')}
    </div>

    <div class="finder-result-section">
      <h4>🖥️ جهاز التسجيل (${recorder.recorderType})</h4>
      ${recorderHtml}
      <div class="finder-note">العدد المقترح للقنوات بيغطي احتياجك الحالي مع هامش توسع بسيط للمستقبل.</div>
    </div>

    <div class="finder-result-section">
      <h4>💾 مساحة التخزين التقريبية</h4>
      <p>هارد بسعة <b>${storage}</b> (تقدير مبدئي بناءً على عدد الكاميرات، بيختلف حسب دقة الكاميرا وعدد أيام التسجيل المطلوبة).</p>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;">
      <button class="btn btn-primary" onclick="sendFinderToWhatsapp()">📩 ابعت الترشيح ده على واتساب</button>
      <button class="btn btn-outline" onclick="selectCategoryFilter('كاميرات مراقبة')">تصفح كل الكاميرات</button>
      <span class="finder-back-link" onclick="resetFinder()" style="align-self:center;">↺ ابدأ من جديد</span>
    </div>
  `;
  window.scrollTo({top: document.getElementById('finderResultArea').getBoundingClientRect().top + window.scrollY - 100, behavior:'smooth'});
}

function sendFinderToWhatsapp(){
  const { list } = getFinderCameraCandidates();
  const recorder = getFinderRecorderSuggestion();
  const storage = getFinderStorageEstimate();
  const lines = [
    '🧭 *ترشيح من مساعد اختيار الكاميرا*',
    '',
    `المكان: ${FINDER_LABELS.sector[finderAnswers.sector]}`,
    `التركيب: ${FINDER_LABELS.location[finderAnswers.location]}`,
    `النوع: ${FINDER_LABELS.camType[finderAnswers.camType]}`,
    `العدد: ${FINDER_LABELS.count[finderAnswers.count]}`,
    `الميزانية: ${FINDER_LABELS.budget[finderAnswers.budget]}`,
    '',
    list.length ? `الكاميرات المقترحة: ${list.slice(0,3).map(p=>p.name).join('، ')}` : 'محتاج ترشيح كاميرات مناسبة',
    `جهاز التسجيل المطلوب: ${recorder.recorderType} بـ ${recorder.channels} قناة${recorder.product ? ' - ' + recorder.product.name : ''}`,
    `الهارد المقترح: ${storage}`
  ];
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

/* ================= حاسبة مساحة تخزين الكاميرات ================= */
// معدلات بت تقريبية شائعة (كيلوبت/ثانية) حسب الدقة ونظام الترميز - للتوجيه المبدئي فقط
const SC_BITRATE_KBPS = {
  h265: { 2: 1024, 4: 2048, 5: 3072, 8: 4096 },
  h264: { 2: 2048, 4: 4096, 5: 6144, 8: 8192 }
};
let lastStorageSummary = '';

