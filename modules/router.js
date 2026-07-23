/* router.js — hash-based section routing (navigateTo, handleHashRoute). */

function handleHashRoute(){
  const h = location.hash;
  if(h.startsWith('#product-')){
    const id = h.replace('#product-','');
    if(products.length) renderProductDetail(id);
  } else if(h.startsWith('#open-')){
    const page = h.replace('#open-','');
    if(HASH_OPEN_PAGES.includes(page)) navigateTo(page);
  }
}
window.addEventListener('hashchange', handleHashRoute);

function navigateTo(page){
  if(location.hash) history.replaceState(null, '', location.pathname + location.search);
  removeProductJsonLd();
  document.title = DEFAULT_TITLE;
  document.querySelectorAll('.page-view').forEach(p=>p.classList.remove('active-page'));
  let targetPage = document.getElementById('page-'+page);
  if(!targetPage){ targetPage = document.getElementById('page-notfound'); page = 'notfound'; } /* unknown page id (bad/old link) -> friendly 404 instead of a crash */
  targetPage.classList.add('page-enter');
  targetPage.classList.add('active-page');
  void targetPage.offsetWidth; /* force reflow so the browser registers the hidden state before we transition out of it */
  requestAnimationFrame(()=> targetPage.classList.remove('page-enter'));
  document.querySelectorAll('.catnav a').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  window.scrollTo({top:0, behavior:'smooth'});
  document.getElementById('catNavMenu').classList.remove('mobile-open');
  const mtBtn = document.getElementById('menuToggle'); if(mtBtn) mtBtn.classList.remove('open');
  if(page === 'finder') resetFinder();
  if(page === 'tools') hideToolTabs();
  if(page === 'rack-builder') initRackBuilder();
  if(page === 'boq') initBoqBuilder();
}

/* ================= Smart Camera Finder (مساعد اختيار الكاميرا) ================= */
const FINDER_STEPS = [
  { key:'sector', title:'هتستخدم الكاميرات فين؟', sub:'ده بيساعدنا نحدد نوع التركيب والدرجة المناسبة للجهاز', options:[
      {value:'home', icon:'🏠', label:'منزل / فيلا'},
      {value:'company', icon:'🏢', label:'شركة / مكتب'},
      {value:'factory', icon:'🏭', label:'مصنع / مستودع'},
      {value:'hospital', icon:'🏥', label:'مستشفى / عيادة'},
      {value:'parking', icon:'🅿️', label:'جراج / موقف سيارات'},
      {value:'hotel', icon:'🏨', label:'فندق'},
      {value:'school', icon:'🏫', label:'مدرسة / معهد'},
      {value:'retail', icon:'🏪', label:'محل / مول'}
  ]},
  { key:'location', title:'التركيب هيكون فين؟', sub:'كاميرات الخارج محتاجة مقاومة للعوامل الجوية (IP66/67)', options:[
      {value:'indoor', icon:'🛋️', label:'داخلي فقط'},
      {value:'outdoor', icon:'🌤️', label:'خارجي فقط'},
      {value:'both', icon:'🔀', label:'داخلي وخارجي'}
  ]},
  { key:'camType', title:'نوع الكاميرا اللي محتاجها', sub:'IP أفضل للجودة العالية وربط الموبايل، Analog أوفر لو عندك تمديدات قديمة', options:[
      {value:'ip', icon:'🌐', label:'IP (شبكة)'},
      {value:'analog', icon:'📼', label:'Analog / AHD'},
      {value:'unsure', icon:'🤷', label:'مش عارف - رشحلي الأنسب'}
  ]},
  { key:'features', title:'محتاج مميزات إضافية؟', sub:'اختار كل اللي يهمك (اختياري) وهنرشحلك بناءً عليها', multi:true, options:[
      {value:'full_color', icon:'🌈', label:'ألوان كاملة بالليل (Full Color)'},
      {value:'ir_night', icon:'🌙', label:'رؤية ليلية بالأشعة تحت الحمراء'},
      {value:'audio', icon:'🎙️', label:'صوت (تسجيل/تخاطب)'},
      {value:'ai_detection', icon:'🧠', label:'كشف ذكي بالـ AI (أشخاص/سيارات)'},
      {value:'face_recognition', icon:'🪪', label:'تمييز الوجوه'}
  ]},
  { key:'count', title:'محتاج كام كاميرا تقريبًا؟', sub:'العدد بيحدد عدد قنوات الـ NVR والهارد المناسب', options:[
      {value:'small', icon:'📷', label:'1 - 4 كاميرات'},
      {value:'medium', icon:'📷📷', label:'5 - 16 كاميرا'},
      {value:'large', icon:'🏗️', label:'أكتر من 16 كاميرا'}
  ]},
  { key:'recordingDays', title:'محتاج تسجيل يفضل متاح لمدة كام يوم؟', sub:'ده بيحدد مساحة التخزين المطلوبة بدقة', options:[
      {value:'7', icon:'📅', label:'أسبوع (7 أيام)'},
      {value:'15', icon:'📅', label:'أسبوعين (15 يوم)'},
      {value:'30', icon:'🗓️', label:'شهر (30 يوم)'},
      {value:'60', icon:'🗓️', label:'شهرين (60 يوم)'}
  ]},
  { key:'budget', title:'الميزانية التقريبية لكل كاميرا', sub:'تقدير مبدئي - السعر النهائي بيختلف حسب الماركة والمواصفات', options:[
      {value:'economy', icon:'💰', label:'اقتصادي (حتى 1500 ج.م)'},
      {value:'mid', icon:'💵', label:'متوسط (1500 - 3000 ج.م)'},
      {value:'premium', icon:'💎', label:'متقدم (أكتر من 3000 ج.م)'},
      {value:'any', icon:'♾️', label:'بدون حد محدد'}
  ]}
];
const FINDER_LABELS = {
  sector:{home:'منزل / فيلا',company:'شركة / مكتب',factory:'مصنع / مستودع',hospital:'مستشفى / عيادة',parking:'جراج / موقف سيارات',hotel:'فندق',school:'مدرسة / معهد',retail:'محل / مول'},
  location:{indoor:'داخلي فقط',outdoor:'خارجي فقط',both:'داخلي وخارجي'},
  camType:{ip:'IP (شبكة)',analog:'Analog / AHD',unsure:'مش محدد'},
  features:{full_color:'ألوان كاملة ليلاً',ir_night:'رؤية ليلية IR',audio:'صوت',ai_detection:'كشف AI',face_recognition:'تمييز وجوه'},
  count:{small:'1 - 4 كاميرات',medium:'5 - 16 كاميرا',large:'أكتر من 16 كاميرا'},
  recordingDays:{'7':'7 أيام تسجيل','15':'15 يوم تسجيل','30':'30 يوم تسجيل','60':'60 يوم تسجيل'},
  budget:{economy:'اقتصادي (حتى 1500 ج.م)',mid:'متوسط (1500-3000 ج.م)',premium:'متقدم (أكتر من 3000 ج.م)',any:'بدون حد محدد'}
};
/* ================= Admin-editable copy for the camera finder =================
   The admin can rewrite the Arabic wording (step titles/sub, option icons/labels)
   from admin.html (تبويب "إعدادات الموقع") without touching this file — stored in
   Supabase `site_settings` under key 'finder_copy'. We only ever override text/icon
   fields here; the underlying `value` keys stay exactly as defined above, since the
   recommendation logic further down is keyed off them. */
(function(){
  if(typeof sb === 'undefined' || !sb || !sb.from) return;
  sb.from('site_settings').select('value').eq('key','finder_copy').maybeSingle()
    .then(({ data }) => {
      const cfg = data && data.value && Array.isArray(data.value.steps) ? data.value.steps : null;
      if(!cfg) return;
      cfg.forEach(override => {
        const step = FINDER_STEPS.find(s => s.key === override.key);
        if(!step) return;
        if(override.title) step.title = override.title;
        if(override.sub) step.sub = override.sub;
        if(Array.isArray(override.options)){
          override.options.forEach((optOverride, idx) => {
            const opt = step.options[idx];
            if(!opt) return;
            if(optOverride.icon) opt.icon = optOverride.icon;
            if(optOverride.label){
              opt.label = optOverride.label;
              if(FINDER_LABELS[step.key]) FINDER_LABELS[step.key][opt.value] = optOverride.label;
            }
          });
        }
      });
      // if the finder page is already open, re-render the current step so the new wording shows immediately
      if(document.getElementById('page-finder') && document.getElementById('page-finder').classList.contains('active-page')){
        renderFinderStep();
      }
    })
    .catch(()=>{ /* keep built-in defaults on any error */ });
})();

let finderAnswers = {};
let finderStepIndex = 0;

