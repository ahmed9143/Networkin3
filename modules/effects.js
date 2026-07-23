/* effects.js — homepage visual polish: scroll progress bar, cursor glow, security-score widget,
   scroll-reveal, count-up stats, button ripple, hero parallax, AI toast stack, live camera-ops demo, card tilt.
   Self-contained (no dependency on other modules); safe to load anywhere. */

function initScrollProgress(){
  const bar = document.getElementById('scrollProgress');
  if(!bar) return;
  const update = ()=>{
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const height = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
    const pct = height > 0 ? (scrolled/height)*100 : 0;
    bar.style.width = pct + '%';
  };
  document.addEventListener('scroll', update, { passive:true });
  update();
}

/* ---------------- Phase 5: cursor-reactive ambient glow (desktop only) ---------------- */
function initCursorGlow(){
  const glow = document.getElementById('cursorGlow');
  if(!glow || matchMedia('(pointer:coarse)').matches) return;
  document.addEventListener('mousemove', (e)=>{
    glow.style.transform = `translate(${e.clientX - 210}px, ${e.clientY - 210}px)`;
  }, { passive:true });
}

/* ================= Security Score / Risk Assessment ================= */
const SEC_PROFILES = {
  villa:  {label:'فيلا / سكن', minCams:4, weight:1.0},
  office: {label:'مكتب / شركة', minCams:6, weight:1.1},
  factory:{label:'مصنع / مخزن', minCams:10, weight:1.3},
  retail: {label:'محل / معرض', minCams:5, weight:1.15},
  school: {label:'مدرسة', minCams:8, weight:1.2},
  bank:   {label:'بنك / صرافة', minCams:12, weight:1.5},
};
function calcSecurityScore(){
  const box = document.getElementById('secResultBox');
  if(!box) return;
  const type = document.getElementById('secType').value;
  const cams = +document.getElementById('secCams').value || 0;
  const entrances = Math.max(1, +document.getElementById('secEntrances').value || 1);
  const access = +document.getElementById('secAccess').value;
  const storage = +document.getElementById('secStorage').value || 0;
  const alarm = +document.getElementById('secAlarm').value;
  const profile = SEC_PROFILES[type];

  let score = 0;
  const camCoverage = Math.min(1, cams / (profile.minCams * (entrances/3 || 1)));
  score += camCoverage * 40;                 // كاميرات كافية = 40
  score += (access/2) * 25;                   // تحكم دخول = 25
  score += Math.min(1, storage/30) * 20;      // تخزين 30 يوم فأكثر = 20
  score += (alarm/2) * 15;                    // إنذار = 15
  score = Math.round(Math.min(100, score));

  let riskClass='risk-low', riskLabel='مستوى خطورة منخفض', ringColor='#1fae6b';
  if(score < 45){riskClass='risk-high'; riskLabel='مستوى خطورة عالي'; ringColor='#ff5c5c';}
  else if(score < 75){riskClass='risk-med'; riskLabel='مستوى خطورة متوسط'; ringColor='#ffb02e';}

  const circumference = 2*Math.PI*74;
  const offset = circumference * (1 - score/100);

  const recos = [];
  if(camCoverage < 0.9) recos.push({ic:'📷', text:`عدد الكاميرات الحالي أقل من المطلوب لتغطية ${profile.label} بالشكل المناسب — المقترح حوالي ${Math.max(cams, profile.minCams)} كاميرا كحد أدنى.`});
  if(access < 2) recos.push({ic:'🔐', text:'مفيش نظام تحكم دخول كامل (بصمة/كارت) على كل النقاط الحساسة — ده بيسهّل دخول غير مصرح بيه.'});
  if(storage < 30) recos.push({ic:'💾', text:'مدة تخزين التسجيل أقل من 30 يوم — في حالة حادثة ومتأخر تكتشفها، التسجيل ممكن يكون اتمسح.'});
  if(alarm < 2) recos.push({ic:'🚨', text:'مفيش نظام إنذار متكامل (سرقة + حريق) — بيبقى فيه وقت استجابة أبطأ عند أي طارئ.'});
  if(entrances > 4 && access < 1) recos.push({ic:'🚪', text:`عندك ${entrances} مداخل ونقاط حساسة من غير تحكم دخول — ده بيزود نقاط الاختراق المحتملة.`});
  if(recos.length===0) recos.push({ic:'✅', text:'المستوى الحالي كويس جدًا! ممكن نراجع بس التفاصيل الدقيقة زي زوايا التغطية العمياء وتحديث الأجهزة القديمة.'});

  box.innerHTML = `
    <div class="risk-badge ${riskClass}">${riskLabel} — ${score}/100</div>
    <div class="score-gauge-wrap">
      <div class="score-gauge">
        <svg viewBox="0 0 180 180">
          <circle class="track" cx="90" cy="90" r="74"></circle>
          <circle class="prog" cx="90" cy="90" r="74" stroke="${ringColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="score-num"><b>${score}</b><span>من 100</span></div>
      </div>
      <div style="flex:1;min-width:240px;">
        <div id="secRecos"></div>
      </div>
    </div>`;
  const recoHost = document.getElementById('secRecos');
  recoHost.innerHTML = recos.map(r=>`<div class="score-reco"><div class="ic">${r.ic}</div><div>${r.text}</div></div>`).join('');
}

/* ================= Button ripple micro-interaction ================= */
document.addEventListener('click', function(e){
  const btn = e.target.closest('.btn');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size+'px';
  ripple.style.left = (e.clientX - rect.left - size/2)+'px';
  ripple.style.top = (e.clientY - rect.top - size/2)+'px';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 650);
});

/* ---------------- أنيميشن الظهور التدريجي عند التمرير (Scroll reveal) ---------------- */
function initRevealAnimations(){
  const items = document.querySelectorAll('.reveal');
  if(!items.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => {
    io.observe(el);
    // Safety net: never let a section stay invisible forever (e.g. odd layout / observer edge case)
    setTimeout(()=> el.classList.add('in-view'), 4000);
  });
}

/* ---------------- عداد أرقام متحرك للإحصائيات في الهيدر ---------------- */
function initCountUp(){
  const els = document.querySelectorAll('.count-up');
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const el = entry.target;
      const target = parseFloat(el.dataset.target || '0');
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dur = 1200;
      const start = performance.now();
      function step(now){
        const t = Math.min(1, (now-start)/dur);
        const eased = 1 - Math.pow(1-t, 3);
        el.innerText = prefix + Math.round(target*eased) + suffix;
        if(t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

/* ================= AI Notification Toasts (hero) ================= */
(function(){
  const stack = document.getElementById('aiToastStack');
  if(!stack) return;
  const msgs = [
    {ic:'🎥', t:'كاميرا جديدة اتضافت للنظام'},
    {ic:'🛡️', t:'لا يوجد أي تهديد نشط الآن'},
    {ic:'📊', t:'تقرير الأداء اليومي جاهز'},
    {ic:'🔋', t:'كل الأجهزة متصلة وشغالة'},
    {ic:'🌙', t:'وضع المراقبة الليلي مفعّل'},
    {ic:'✅', t:'تغطية المكان 96% مؤكدة'},
  ];
  let i = 0;
  function showToast(){
    if(document.hidden) return;
    const m = msgs[i % msgs.length]; i++;
    const el = document.createElement('div');
    el.className = 'ai-toast';
    el.innerHTML = `<span class="ic">${m.ic}</span><span>${m.t}</span>`;
    stack.appendChild(el);
    setTimeout(()=>el.remove(), 4200);
  }
  showToast();
  setInterval(showToast, 3200);
})();

/* ================= Mouse Parallax on Hero — per-element 3D depth ================= */
(function(){
  const hero = document.querySelector('.hero');
  if(!hero) return;
  const bg = hero.querySelector('.net-diagram-bg');
  const orbs = hero.querySelectorAll('.orb');
  const nodes = hero.querySelectorAll('.hero-visual .net-node');
  // free each node from its one-shot entrance animation once it ends, so our depth-parallax
  // transform (below) can take over — CSS animations otherwise keep owning `transform` forever.
  nodes.forEach(n=>{
    const settle = ()=> n.classList.add('nn-settled');
    n.addEventListener('animationend', settle, { once:true });
    setTimeout(settle, 900); // safety net
  });
  hero.addEventListener('mousemove', function(e){
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left)/r.width - 0.5;
    const py = (e.clientY - r.top)/r.height - 0.5;
    if(bg) bg.style.transform = `translate(${(px*1).toFixed(1)}px, ${(py*1).toFixed(1)}px)`;
    orbs.forEach((o,idx)=>{ o.style.transform = `translate(${px*(18+idx*8)}px, ${py*(18+idx*8)}px)`; });
    nodes.forEach(n=>{
      const depth = parseFloat(n.dataset.depth || '6');
      n.style.setProperty('--pxd', (px*depth).toFixed(1)+'px');
      n.style.setProperty('--pyd', (py*depth*0.7).toFixed(1)+'px');
    });
  });
  hero.addEventListener('mouseleave', function(){
    if(bg) bg.style.transform = '';
    orbs.forEach(o=> o.style.transform = '');
    nodes.forEach(n=>{ n.style.setProperty('--pxd','0px'); n.style.setProperty('--pyd','0px'); });
  });
})();

/* ================= "AI Camera" intelligence: PTZ idle patrol + turret pivots toward the mouse when active ================= */
(function(){
  const hero = document.querySelector('.hero');
  const wrap = document.querySelector('.hcb-core-wrap');
  const head = document.querySelector('.hcb-head');
  if(!hero || !wrap || !head) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  wrap.classList.add('hcb-idle');
  let target = 0, cur = 0, raf = null, idleTimer = null;
  const MAX_PAN = 30;
  function apply(){
    cur += (target - cur) * 0.14;
    head.style.transform = `rotate(${cur}deg)`;
    if(Math.abs(target - cur) > 0.05){
      raf = requestAnimationFrame(apply);
    } else { raf = null; }
  }
  hero.addEventListener('mousemove', function(e){
    wrap.classList.remove('hcb-idle');
    head.style.animation = 'none';
    clearTimeout(idleTimer);
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = e.clientX - cx;
    target = Math.max(-MAX_PAN, Math.min(MAX_PAN, dx/14));
    if(!raf) raf = requestAnimationFrame(apply);
  });
  hero.addEventListener('mouseleave', function(){
    target = 0;
    idleTimer = setTimeout(()=>{
      head.style.transform = '';
      head.style.animation = '';
      wrap.classList.add('hcb-idle');
    }, 500);
    if(!raf) raf = requestAnimationFrame(apply);
  });
})();

/* ================= Mobile placement for the ANPR badge — moved inside the compact
   hero-visual (instead of floating over the stacked headline text) below 980px ================= */
(function(){
  const badge = document.querySelector('.hero-corner-badge');
  const heroVisual = document.getElementById('netVisual');
  if(!badge || !heroVisual) return;
  const desktopParent = badge.parentNode;
  const desktopNext = badge.nextSibling;
  let isMobilePlaced = null;
  function place(){
    const mobile = window.innerWidth <= 980;
    if(mobile === isMobilePlaced) return;
    if(mobile){
      heroVisual.insertBefore(badge, heroVisual.firstChild);
    } else if(desktopParent){
      if(desktopNext && desktopNext.parentNode === desktopParent) desktopParent.insertBefore(badge, desktopNext);
      else desktopParent.appendChild(badge);
    }
    isMobilePlaced = mobile;
  }
  place();
  window.addEventListener('resize', place);
  window.addEventListener('orientationchange', place);
})();

/* ================= Live scan beam — sweeps out of the camera lens and lights up each node it crosses ================= */
(function(){
  const hero = document.querySelector('.hero');
  const badge = document.querySelector('.hero-corner-badge');
  const wrap = document.querySelector('.hcb-core-wrap');
  const beam = document.querySelector('.hcb-beam');
  const nodes = Array.from(document.querySelectorAll('.hero-visual .net-node'));
  if(!hero || !badge || !wrap || !beam || !nodes.length) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  badge.classList.add('hcb-armed');

  // the badge is now the real trigger for the AI capture cards — clicking/tapping it
  // fires an immediate ANPR-style scan instead of waiting on the ambient timer
  badge.style.pointerEvents = 'auto';
  badge.style.cursor = 'pointer';
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('aria-label', 'شغّل سكان الـ AI الآن');
  function manualScan(){
    badge.classList.add('hcb-scan-pulse');
    setTimeout(()=> badge.classList.remove('hcb-scan-pulse'), 700);
    if(window.__aiSpawnScan) window.__aiSpawnScan();
  }
  badge.addEventListener('click', manualScan);
  badge.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); manualScan(); } });

  let angle = 6, dir = 1;
  const MIN = 0, MAX = 82, SPEED = 0.28;
  const lit = new Set();
  let sweepsSinceScan = 0;

  function tick(){
    const heroRect = hero.getBoundingClientRect();
    const onScreen = heroRect.bottom > 0 && heroRect.top < window.innerHeight;
    if(onScreen){
      angle += dir * SPEED;
      if(angle > MAX){
        angle = MAX; dir = -1;
        // a full outbound sweep just completed — this is the badge "catching" a plate/person,
        // so fire the real capture-card scan instead of it happening on an unrelated timer
        sweepsSinceScan++;
        if(sweepsSinceScan >= 2 && !document.hidden && window.innerWidth >= 340){
          sweepsSinceScan = 0;
          if(window.__aiSpawnScan) window.__aiSpawnScan();
        }
      }
      if(angle < MIN){ angle = MIN; dir = 1; }
      beam.style.transform = `rotate(${angle}deg)`;

      const wr = wrap.getBoundingClientRect();
      const ox = wr.left + wr.width/2, oy = wr.top + wr.height/2;
      const beamCenter = angle + 17; // middle of the ~34deg wedge
      nodes.forEach(n=>{
        const nr = n.getBoundingClientRect();
        const a = Math.atan2((nr.top + nr.height/2) - oy, (nr.left + nr.width/2) - ox) * 180/Math.PI;
        const diff = Math.abs(((a - beamCenter + 540) % 360) - 180);
        if(diff < 4){
          if(!lit.has(n)){
            lit.add(n);
            n.classList.add('nn-scanned');
            setTimeout(()=>{ n.classList.remove('nn-scanned'); lit.delete(n); }, 550);
          }
        }
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ================= CCTV Motion-Detection HUD — brackets + "TRACKING → SECURE" tag lock onto sections as you scroll ================= */
(function(){
  const heads = document.querySelectorAll('.sec-head');
  if(!heads.length) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const el = entry.target;
      if(!el.style.position) el.style.position = 'relative';
      el.classList.add('cctv-target');
      setTimeout(()=> el.classList.remove('cctv-target'), 1300);

      const tag = document.createElement('span');
      tag.className = 'cctv-lock';
      tag.innerHTML = '<i></i><span class="cctv-lock-txt">TRACKING</span>';
      el.appendChild(tag);
      setTimeout(()=>{
        tag.classList.add('ok');
        const t = tag.querySelector('.cctv-lock-txt');
        if(t) t.textContent = 'SECURE ✓';
      }, 750);
      setTimeout(()=> tag.remove(), 2200);
    });
  }, { threshold: 0.35 });

  heads.forEach(h => io.observe(h));
})();

/* ================= AI Detection boxes — SVG-free tracking rectangles flashing over the hero visual =================
   Note: only the thin bounding box stays over the animation; the actual snapshot/MATCH card is appended to the
   left-docked #aiResultsPanel instead, so results never pile up on top of the diagram. */
(function(){
  const layer = document.getElementById('aiDetectLayer');
  const panel = document.getElementById('aiResultsPanel');
  const arpList = document.getElementById('arpList');
  if(!layer) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Drop real, licensed photos into /assets/ai-samples using these exact filenames
  // (e.g. person-01.jpg, person-02.jpg, car-01.jpg …) and they'll be picked up automatically.
  // Until then, a designed icon frame is shown instead — nothing ever looks broken.
  const TYPES = [
    { key:'person', cls:'ai-person', accClass:'',          label:'Person', samples:2, icon:'<path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>' },
    { key:'car',    cls:'ai-car',   accClass:'ac-car',    label:'Car',    samples:2, icon:'<path d="M4 16.5 5.6 11a2 2 0 0 1 1.9-1.4h9a2 2 0 0 1 1.9 1.4L20 16.5"/><rect x="3" y="16.5" width="18" height="4" rx="1.4"/><circle cx="7.5" cy="20.2" r="1.3"/><circle cx="16.5" cy="20.2" r="1.3"/>' },
    { key:'face',   cls:'ai-face',  accClass:'ac-face',   label:'Face',   samples:1, icon:'<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r=".9" fill="currentColor" stroke="none"/><path d="M9 15c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2"/>' },
    { key:'plate',  cls:'ai-plate', accClass:'ac-plate',  label:'Plate',  samples:5, icon:'<rect x="3" y="7" width="18" height="10" rx="1.6"/><path d="M6.5 12.5h3M11.5 12.5h6"/>' }
  ];
  const FALLBACK_ICON = (t) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>`;
  const ICONS_BY_KEY = {};
  TYPES.forEach(t => { ICONS_BY_KEY[t.key] = FALLBACK_ICON(t); });
  window.__aiCaptureFallback = function(img){
    const key = img.getAttribute('data-t');
    const frame = img.parentElement;
    img.remove();
    if(frame && ICONS_BY_KEY[key]) frame.insertAdjacentHTML('afterbegin', ICONS_BY_KEY[key]);
  };
  function pad2(n){ return n < 10 ? '0'+n : ''+n; }
  function fakeTimestamp(){
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  const MAX_PANEL_ITEMS = 2;
  // Live "detections today" counter shown on the AI camera badge — persisted per calendar day
  // so it feels like a real running tally instead of resetting every page load.
  const hcbCountEl = document.getElementById('hcbDetCount');
  function todayKey(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  let detCount = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('delta_ai_det_count') || 'null');
    if(saved && saved.day === todayKey()) detCount = saved.n;
    else detCount = 812 + Math.floor(Math.random()*40); // fresh-day baseline so it never starts at 0
  } catch(e){ detCount = 812; }
  function renderCount(){ if(hcbCountEl) hcbCountEl.textContent = detCount.toLocaleString('en-US'); }
  function bumpCount(n){
    detCount += n;
    renderCount();
    try { localStorage.setItem('delta_ai_det_count', JSON.stringify({ day: todayKey(), n: detCount })); } catch(e){}
  }
  renderCount();
  function pushToPanel(t){
    if(!arpList) return;
    const card = document.createElement('div');
    card.className = 'ai-capture-card arp-item ' + t.accClass;
    const sampleN = 1 + Math.floor(Math.random()*t.samples);
    const src = `assets/ai-samples/${t.key}-${pad2(sampleN)}.svg`;
    card.innerHTML = `
      <div class="acc-frame">
        <img src="${src}" alt="${t.label} detected" loading="lazy" data-t="${t.key}"
             onerror="window.__aiCaptureFallback(this)" />
        <div class="acc-scan"></div>
        <div class="acc-rec"><i></i>REC</div>
        <div class="acc-ts">${fakeTimestamp()}</div>
      </div>
      <div class="acc-caption"><span>${t.label}</span><b>MATCH</b></div>`;
    arpList.prepend(card);
    // keep the panel short — a live feed, not a growing pile
    while(arpList.children.length > MAX_PANEL_ITEMS) arpList.lastElementChild.remove();
    setTimeout(()=>{ if(card.parentElement) card.remove(); }, 4000);
  }
  // Two-hop animated "data flow": the AI camera badge (top-left, the same live-camera
  // indicator shown in the corner of the hero) fires first — it's the one doing the seeing —
  // then a beat later the NVR pushes the processed result out to the results panel on the left.
  const flowG = document.querySelector('#netsvg .nvr-flow');
  const CAM_PT = [9, 11];      // roughly where the .hero-corner-badge camera sits, same 0-100 space
  const NVR_PT = [50, 88];     // matches the NVR/Rack node's data-x/data-y
  const PANEL_PT = [9, 16.5];  // anchor near the results panel (top:16.5%; left:2%)
  function drawFlowLine(from, to, delayRemove){
    if(!flowG) return;
    const [x1,y1] = from, [x2,y2] = to;
    const midY = (y1+y2)/2;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
    path.setAttribute('class','nvr-flow-path');
    path.setAttribute('marker-end','url(#nvrArrow)');
    flowG.appendChild(path);
    requestAnimationFrame(()=> path.classList.add('show'));
    setTimeout(()=> path.remove(), delayRemove || 1400);
  }
  function pulseCameraBadge(){
    const badge = document.querySelector('.hero-corner-badge');
    if(!badge) return;
    badge.classList.add('hcb-scan-pulse');
    setTimeout(()=> badge.classList.remove('hcb-scan-pulse'), 700);
  }
  let ambientTimer = null;
  // start high so the very FIRST scan (fires ~3.5s after page load) always includes 'person' —
  // a quick page view/reload should never have to wait through several silent cycles to see it
  let cyclesSincePerson = 99;
  // two non-overlapping slots inside the lower-right zone so two simultaneous boxes never stack on each other
  const SLOTS = [
    { left:[60,74],  top:[34,48] },
    { left:[76,88],  top:[52,64] }
  ];
  function pick(range){ return range[0] + Math.random()*(range[1]-range[0]); }
  function spawnBoxes(){
    if(ambientTimer){ clearTimeout(ambientTimer); ambientTimer = null; }
    if(document.hidden || window.innerWidth < 340){ scheduleNext(); return; }
    // Hop 1 — the camera badge "sees" something and reports it down to the NVR
    pulseCameraBadge();
    drawFlowLine(CAM_PT, NVR_PT, 1300);
    layer.innerHTML = '';
    const detected = [];
    const count = 1 + Math.floor(Math.random()*2);
    // pity timer: "person" never sits out more than one cycle in a row, so the badge doesn't
    // go long stretches only flashing car/face/plate (and a quick page view still sees it)
    const forcePerson = cyclesSincePerson >= 1;
    cyclesSincePerson++;
    for(let i=0;i<count;i++){
      let t;
      if(i===0 && forcePerson){ t = TYPES[0]; }
      else { t = TYPES[Math.floor(Math.random()*TYPES.length)]; }
      if(t.key === 'person') cyclesSincePerson = 0;
      detected.push(t);
      const slot = SLOTS[i % SLOTS.length];
      const box = document.createElement('div');
      box.className = 'ai-detect-box ' + t.cls;
      const w = 46 + Math.random()*40, h = 44 + Math.random()*32;
      box.style.width = w+'px'; box.style.height = h+'px';
      // Keep boxes in the empty lower-right zone: below the LIVE NETWORK card (top ~4-30%,
      // right ~4-33%), clear of the centred node column (left 50%) and the left-docked
      // results panel/camera badge — each of the (max 2) simultaneous boxes gets its own slot
      // so they never sit on top of each other or the diagram icons.
      box.style.left = pick(slot.left)+'%';
      box.style.top = pick(slot.top)+'%';
      box.innerHTML = `<span class="ai-box-ic">${FALLBACK_ICON(t)}</span><span class="ai-box-label">${t.label}</span>`;
      layer.appendChild(box);
    }
    // Hop 2 — a beat later, the NVR finishes "analyzing" and pushes the results out to the panel
    setTimeout(()=>{
      drawFlowLine(NVR_PT, PANEL_PT, 1400);
      detected.forEach(t => pushToPanel(t));
      bumpCount(detected.length);
    }, 650);
    setTimeout(()=>{ layer.innerHTML = ''; }, 2450);
    scheduleNext();
  }
  function scheduleNext(){ ambientTimer = setTimeout(spawnBoxes, 9000 + Math.random()*4000); }
  window.__aiSpawnScan = spawnBoxes;
  setTimeout(spawnBoxes, 3500);
})();

/* ================= Hologram status ticker — LIVE → Network Stable → Threat Detected → Threat Blocked ================= */
(function(){
  const el = document.querySelector('#heroHologram .hg-text');
  if(!el) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const seq = [
    { t:'● LIVE', cls:'' },
    { t:'NETWORK STABLE', cls:'hg-ok' },
    { t:'⚠ THREAT DETECTED', cls:'hg-alert' },
    { t:'✓ THREAT BLOCKED', cls:'hg-ok' }
  ];
  let i = 0;
  function cycle(){
    if(document.hidden){ setTimeout(cycle, 3600); return; }
    const s = seq[i++ % seq.length];
    el.className = 'hg-text' + (s.cls ? ' '+s.cls : '');
    el.textContent = s.t;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    setTimeout(cycle, 3600);
  }
  cycle();
})();

/* ================= 3D Tilt + Mouse-follow Gradient on Cards ================= */
(function(){
  function attachTilt(selector){
    document.querySelectorAll(selector).forEach(card=>{
      if(card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';
      card.addEventListener('mousemove', function(e){
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left)/r.width;
        const py = (e.clientY - r.top)/r.height;
        const rx = (0.5-py)*8, ry = (px-0.5)*8;
        card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.setProperty('--mx', (px*100)+'%');
        card.style.setProperty('--my', (py*100)+'%');
      });
      card.addEventListener('mouseleave', function(){ card.style.transform=''; });
    });
  }
  attachTilt('.tool-card'); attachTilt('.bento-card'); attachTilt('.cat-card');
  // إعادة الربط لما نفتح صفحات جديدة فيها كروت اتولدت ديناميك
  document.addEventListener('click', ()=> setTimeout(()=>attachTilt('.tool-card, .bento-card, .cat-card'), 200));
})();

/* ================= Floating Navbar: shrink + blur on scroll ================= */
(function(){
  const header = document.querySelector('header.main');
  if(!header) return;
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, {passive:true});
})();

(function(){
  const svg = document.getElementById('netsvg');
  const visual = document.getElementById('netVisual');
  if(!svg || !visual) return;
  const linksG = svg.querySelector('.links'), pulsesG = svg.querySelector('.pulses');
  const nodeEls = Array.from(visual.querySelectorAll('.net-node'));
  // build a lookup of node coordinates from data-x/data-y (same 0-100 space as the SVG viewBox)
  const pts = nodeEls.map(el => [parseFloat(el.dataset.x), parseFloat(el.dataset.y)]);
  // topology: cloud(0) -> firewall(1) -> switch(2) -> camera(3), nvr(4), access point(5)
  const edges = [[0,1],[1,2],[2,3],[2,4],[2,5]];

  function drawLinks(){
    linksG.innerHTML = '';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    edges.forEach(([a,b], i)=>{
      const [x1,y1]=pts[a], [x2,y2]=pts[b];
      const midY = (y1+y2)/2;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
      path.setAttribute('class','net-link');
      linksG.appendChild(path);
      if(reduceMotion) return;
      // real path-length draw-in: starts fully hidden as one continuous stroke,
      // sweeps in, then hands off to the dashed cable-flow animation (defined in CSS)
      const len = path.getTotalLength();
      path.classList.add('nl-drawing');
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect(); // force layout before transition starts
      path.style.transition = `stroke-dashoffset ${900 + i*120}ms cubic-bezier(.4,0,.2,1) ${i*90}ms`;
      requestAnimationFrame(()=>{ path.style.strokeDashoffset = 0; });
      path.addEventListener('transitionend', function handoff(){
        path.removeEventListener('transitionend', handoff);
        path.style.transition = '';
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
        path.classList.remove('nl-drawing');
      }, { once:true });
    });
  }
  drawLinks();

  const flowSeq = [0,1,2,1,0,1,3,1,0,1,4,1]; // trunk-weighted: cloud→firewall→switch, then branches
  let flowIdx = 0;
  const PACKET_TYPES = [
    {cls:'pk-video', r:1.4, durMin:1300, durRange:400}, // video streams: bigger, steadier
    {cls:'pk-data',  r:1.0, durMin:800,  durRange:300}, // data: fast, small
    {cls:'pk-ai',    r:1.2, durMin:1000, durRange:500}, // AI inference bursts: variable pace
    {cls:'pk-voice', r:0.9, durMin:900,  durRange:250}  // voice: quick, light
  ];
  function spawnPulse(edgeOverride, typeOverride){
    if(document.hidden) return;
    const [a,b] = edgeOverride || edges[flowSeq[flowIdx++ % flowSeq.length]];
    const [x1,y1]=pts[a], [x2,y2]=pts[b];
    const midY = (y1+y2)/2;
    const type = typeOverride || PACKET_TYPES[Math.floor(Math.random()*PACKET_TYPES.length)];
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('r', type.r); dot.setAttribute('class','net-pulse '+type.cls); pulsesG.appendChild(dot);
    let t=0; const dur=type.durMin+Math.random()*type.durRange; const start=performance.now();
    function bezier(t){
      const mt=1-t;
      const x = mt*mt*mt*x1 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x2;
      const y = mt*mt*mt*y1 + 3*mt*mt*t*midY + 3*mt*t*t*midY + t*t*t*y2;
      return [x,y];
    }
    function step(now){
      t=Math.min(1,(now-start)/dur);
      const [x,y] = bezier(t);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      dot.setAttribute('opacity', t<0.12? t/0.12 : (t>0.85? (1-t)/0.15 : 1));
      if(t<1) requestAnimationFrame(step); else dot.remove();
    }
    requestAnimationFrame(step);
  }
  setInterval(spawnPulse, 380);
  spawnPulse();

  /* ----- Network Failure / Auto-Healing: every ~40-70s a random leaf node "errors out",
     the firewall notices and sends a packet to it, then it recovers ----- */
  const leafNodeIdx = [3,4,5]; // camera, nvr, access point
  function runFailureCycle(){
    if(document.hidden){ scheduleFailure(); return; }
    const target = leafNodeIdx[Math.floor(Math.random()*leafNodeIdx.length)];
    const el = nodeEls[target];
    if(!el){ scheduleFailure(); return; }
    el.classList.add('node-error');
    setTimeout(()=>{
      // firewall (node 1) dispatches a recovery packet straight to the affected node
      spawnPulse([1, target], {cls:'pk-ai', r:1.5, durMin:700, durRange:200});
      setTimeout(()=>{
        el.classList.remove('node-error');
        el.classList.add('node-healing');
        setTimeout(()=>el.classList.remove('node-healing'), 1000);
      }, 750);
    }, 900);
    scheduleFailure();
  }
  function scheduleFailure(){ setTimeout(runFailureCycle, 40000 + Math.random()*30000); }
  scheduleFailure();

  /* ----- Threat Attack simulation: a red dot approaches from outside the network,
     the Firewall flashes on contact, then shows "Blocked ✓" ----- */
  function showEdgeTag(idx, text, ok){
    const el = nodeEls[idx];
    if(!el) return;
    const tag = document.createElement('div');
    tag.className = 'threat-tag' + (ok ? ' ok' : '');
    tag.textContent = text;
    tag.style.left = el.style.left;
    tag.style.top = el.style.top;
    visual.appendChild(tag);
    setTimeout(()=> tag.remove(), 1650);
  }
  function runThreatCycle(){
    if(document.hidden){ scheduleThreat(); return; }
    const target = 1; // Firewall
    const [tx, ty] = pts[target];
    const startX = tx + (Math.random() > 0.5 ? 1 : -1) * 55;
    const startY = -14;
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('r', 1.6); dot.setAttribute('class', 'net-pulse pk-threat'); pulsesG.appendChild(dot);
    const dur = 1500, start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start)/dur);
      dot.setAttribute('cx', startX + (tx - startX)*t);
      dot.setAttribute('cy', startY + (ty - startY)*t);
      dot.setAttribute('opacity', t < 0.1 ? t/0.1 : 1);
      if(t < 1){ requestAnimationFrame(step); return; }
      dot.remove();
      const el = nodeEls[target];
      if(el){
        el.classList.add('node-alert');
        showEdgeTag(target, '⚠ تهديد مكتشف', false);
        setTimeout(()=>{
          el.classList.remove('node-alert');
          showEdgeTag(target, '✓ Blocked', true);
        }, 1400);
      }
    }
    requestAnimationFrame(step);
    scheduleThreat();
  }
  function scheduleThreat(){ setTimeout(runThreatCycle, 22000 + Math.random()*13000); }
  scheduleThreat();

  /* ----- AI Pulse: an expanding ring "ping" from the Cloud, received by every device in sequence ----- */
  function runAiPulse(){
    if(document.hidden){ scheduleAiPulse(); return; }
    const cloudEl = nodeEls[0];
    const ring = document.createElement('div');
    ring.className = 'ai-pulse-ring';
    ring.style.left = cloudEl.style.left;
    ring.style.top = cloudEl.style.top;
    visual.appendChild(ring);
    setTimeout(()=> ring.remove(), 1900);
    setTimeout(()=>{
      nodeEls.forEach((n, i)=>{
        if(i === 0) return;
        setTimeout(()=>{
          n.classList.add('nn-synced');
          setTimeout(()=> n.classList.remove('nn-synced'), 400);
        }, i * 70);
      });
    }, 500);
    scheduleAiPulse();
  }
  function scheduleAiPulse(){ setTimeout(runAiPulse, 9000 + Math.random()*5000); }
  scheduleAiPulse();

  const trafficEl = document.getElementById('hudTraffic');
  if(trafficEl){
    function tickTraffic(){
      if(document.hidden) return;
      const mbps = (40 + Math.random()*90).toFixed(0);
      trafficEl.textContent = mbps + ' Mbps';
    }
    tickTraffic();
    setInterval(tickTraffic, 1600);
  }

  /* ----- Live stat jitter: connected cameras / access points tick up and down slightly ----- */
  function jitterCount(el, base, span){
    if(!el) return;
    setInterval(()=>{
      if(document.hidden) return;
      el.textContent = Math.max(1, base + Math.floor(Math.random()*(span*2+1)) - span);
    }, 5000 + Math.random()*3000);
  }
  setTimeout(()=>{
    jitterCount(document.getElementById('hudCams'), 48, 2);
    jitterCount(document.getElementById('hudAPs'), 12, 1);
  }, 4500);
})();

/* ================= Hero background particles ================= */
(function(){
  const box = document.getElementById('heroParticles');
  if(!box) return;
  const n = 16;
  for(let i=0;i<n;i++){
    const s = document.createElement('span');
    const left = Math.random()*100;
    const dur = 9 + Math.random()*10;
    const delay = Math.random()*-dur;
    const drift = (Math.random()*40-20).toFixed(0)+'px';
    const size = (1.5 + Math.random()*2.5).toFixed(1);
    s.style.left = left+'%';
    s.style.width = s.style.height = size+'px';
    s.style.setProperty('--drift', drift);
    s.style.animationDuration = dur+'s';
    s.style.animationDelay = delay+'s';
    if(i % 3 === 0) s.style.background = 'var(--cable-orange)';
    box.appendChild(s);
  }
})();

/* ===== Global Command Palette (Ctrl/Cmd + K) ===== */
(function(){
  const overlay = document.getElementById('cmdkOverlay');
  const input   = document.getElementById('cmdkInput');
  const body    = document.getElementById('cmdkBody');
  let items = [];      // flat list of currently rendered actionable rows
  let activeIdx = -1;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const keyLabelEl = document.getElementById('cmdkKeyLabel');
  if(keyLabelEl && isMac) keyLabelEl.textContent = '⌘';

  const staticPages = [
    {icon:'🏠', title:'الرئيسية', sub:'الصفحة الرئيسية', action:()=>navigateTo('home')},
    {icon:'🛍️', title:'كل المنتجات', sub:'تصفح كل المنتجات', action:()=>navigateTo('products')},
    {icon:'🧭', title:'مساعد اختيار الكاميرا', sub:'أداة ذكية', action:()=>navigateTo('finder')},
    {icon:'💾', title:'حاسبة التخزين', sub:'أداة ذكية', action:()=>navigateTo('storage-calc')},
    {icon:'🖐️', title:'أجهزة البصمة', sub:'قسم', action:()=>navigateTo('biometric')},
    {icon:'🧰', title:'مركز الأدوات الذكية', sub:'كل الأدوات', action:()=>navigateTo('tools')},
    {icon:'ℹ️', title:'من نحن', sub:'صفحة', action:()=>navigateTo('about')},
    {icon:'📦', title:'تتبع الطلب', sub:'صفحة', action:()=>navigateTo('track')},
    {icon:'❓', title:'الأسئلة الشائعة', sub:'صفحة', action:()=>navigateTo('faq')},
    {icon:'⬇️', title:'التنزيلات', sub:'صفحة', action:()=>navigateTo('downloads')},
    {icon:'📝', title:'اطلب معاينة', sub:'تواصل معنا', action:()=>navigateTo('contact')},
  ];
  const staticCommands = [
    {icon:'🛒', title:'فتح السلة', sub:'أمر', action:()=>document.getElementById('cartTriggerBtn') && document.getElementById('cartTriggerBtn').click()},
    {icon:'♥', title:'فتح المفضلة', sub:'أمر', action:()=>document.getElementById('wishlistTriggerBtn') && document.getElementById('wishlistTriggerBtn').click()},
    {icon:'🌗', title:'تبديل الوضع الليلي/النهاري', sub:'أمر', action:()=>document.getElementById('themeToggleBtn') && document.getElementById('themeToggleBtn').click()},
  ];
  const toolsIndex = [
    {icon:'🧭', title:'مساعد اختيار الكاميرا', sub:'أداة ذكية', action:()=>navigateTo('finder')},
    {icon:'💾', title:'حاسبة التخزين', sub:'أداة ذكية', action:()=>navigateTo('storage-calc')},
    {icon:'📐', title:'حاسبة تغطية الكاميرا', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('coverage');}},
    {icon:'🔌', title:'حاسبة PoE', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('poe');}},
    {icon:'🔋', title:'حاسبة UPS', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('ups');}},
    {icon:'🧵', title:'حاسبة الكابلات', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('cable');}},
    {icon:'⚖️', title:'مقارنة المنتجات', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('compare');}},
    {icon:'🧾', title:'بناء عرض السعر', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('quote');}},
    {icon:'🛡️', title:'تقييم درجة الأمان', sub:'أداة ذكية', action:()=>{navigateTo('tools');showToolTab('security');}},
  ];
  const articlesIndex = [
    {icon:'📷', title:'أفضل كاميرات المراقبة للمنازل', sub:'مقالة', action:()=>{location.href='best-cctv-cameras-for-home.html';}},
    {icon:'🌐', title:'كاميرا IP ولا Analog؟', sub:'مقالة', action:()=>{location.href='ip-vs-analog-cameras.html';}},
    {icon:'💽', title:'الفرق بين NVR و DVR', sub:'مقالة', action:()=>{location.href='what-is-nvr-dvr.html';}},
  ];

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderRow(row, i){
    const priceHtml = row.price != null ? `<div class="cmdk-item-price">${Number(row.price).toLocaleString('ar-EG')} ج.م</div>` : '';
    const icHtml = row.img ? `<img src="${esc(row.img)}" alt="">` : esc(row.icon || '🔎');
    return `<div class="cmdk-item${i===activeIdx?' active':''}" data-idx="${i}">
        <div class="cmdk-item-ic">${icHtml}</div>
        <div class="cmdk-item-main">
          <div class="cmdk-item-title">${esc(row.title)}</div>
          <div class="cmdk-item-sub">${esc(row.sub||'')}</div>
        </div>
        ${priceHtml}
      </div>`;
  }

  function group(label, rows){
    if(!rows.length) return '';
    return `<div class="cmdk-group-label">${esc(label)}</div>` + rows.map(r=>renderRow(r, items.push(r)-1)).join('');
  }

  function render(){
    const q = (input.value || '').trim().toLowerCase();
    items = [];
    let html = '';

    if(!q){
      html += group('انتقل إلى', staticPages);
      html += group('الأدوات الذكية', toolsIndex.slice(0,4));
      html += group('الأوامر', staticCommands);
      const featured = (typeof products !== 'undefined' ? products : []).filter(p=>p.is_bestseller).slice(0,5);
      if(featured.length) html += group('الأكثر مبيعًا', featured.map(p=>({icon:'📷', img:(p.images&&p.images[0])||p.image, title:p.name, sub:p.category||'', price:p.price, action:()=>openProductDetail(p.id)})));
    } else {
      const SEARCH_SYNONYMS = {
        'مصنع':'outdoor','خارجي':'outdoor','بره':'outdoor','برة':'outdoor',
        'داخلي':'indoor','جوه':'indoor','جوة':'indoor',
        'متحركة':'ptz','بتلف':'ptz','دوارة':'ptz',
        'حرارية':'thermal','حراري':'thermal',
        'شبكة':'ip','ذكية':'ai','ذكاء':'ai',
        'بصمة':'access','حضور':'access','انصراف':'access',
        'تخزين':'storage','هارد':'storage'
      };
      let extra = [];
      Object.keys(SEARCH_SYNONYMS).forEach(k=>{ if(q.includes(k)) extra.push(SEARCH_SYNONYMS[k]); });
      const matchedProducts = (typeof products !== 'undefined' ? products : [])
        .filter(p => {
          const hay = ((p.name||'')+' '+(p.category||'')+' '+(p.brand||'')).toLowerCase();
          return hay.includes(q) || extra.some(term => hay.includes(term));
        })
        .slice(0, 8)
        .map(p=>({icon:'📷', img:(p.images&&p.images[0])||p.image, title:p.name, sub:[p.category,p.brand].filter(Boolean).join(' · '), price:p.price, action:()=>openProductDetail(p.id)}));
      const matchedPages = staticPages.filter(p => p.title.toLowerCase().includes(q));
      const matchedCommands = staticCommands.filter(c => c.title.toLowerCase().includes(q));
      const matchedTools = toolsIndex.filter(t => t.title.toLowerCase().includes(q) || extra.some(term => t.title.toLowerCase().includes(term)));
      const matchedArticles = articlesIndex.filter(a => a.title.toLowerCase().includes(q) || extra.some(term => a.title.toLowerCase().includes(term)));

      html += group('منتجات', matchedProducts);
      html += group('أدوات', matchedTools);
      html += group('مقالات', matchedArticles);
      html += group('صفحات', matchedPages);
      html += group('أوامر', matchedCommands);

      if(!matchedProducts.length && !matchedPages.length && !matchedCommands.length && !matchedTools.length && !matchedArticles.length){
        html = `<div class="cmdk-empty">لا نتائج لـ "${esc(q)}" — جرّب كلمة تانية</div>`;
      }

      html += `<div class="cmdk-group-label">بحث كامل</div>` +
        renderRow({icon:'🔎', title:`ابحث عن "${q}" في كل المنتجات`, sub:'عرض كل النتائج المطابقة'}, items.push({action:()=>executeSearch(q)})-1);
    }

    body.innerHTML = html || '<div class="cmdk-empty">ابدأ الكتابة للبحث...</div>';
    activeIdx = items.length ? 0 : -1;
    highlightActive();

    body.querySelectorAll('.cmdk-item').forEach(el=>{
      el.addEventListener('click', ()=>{ runItem(parseInt(el.dataset.idx,10)); });
      el.addEventListener('mouseenter', ()=>{ activeIdx = parseInt(el.dataset.idx,10); highlightActive(); });
    });
  }

  function highlightActive(){
    body.querySelectorAll('.cmdk-item').forEach(el=>{
      el.classList.toggle('active', parseInt(el.dataset.idx,10) === activeIdx);
    });
    const activeEl = body.querySelector('.cmdk-item.active');
    if(activeEl) activeEl.scrollIntoView({block:'nearest'});
  }

  function runItem(idx){
    const row = items[idx];
    if(!row) return;
    closeCmdk();
    if(row.action) row.action();
  }

  window.openCmdk = function(){
    overlay.classList.add('open');
    input.value = '';
    render();
    setTimeout(()=>input.focus(), 30);
  };
  window.closeCmdk = function(){
    overlay.classList.remove('open');
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowDown'){ e.preventDefault(); if(items.length){ activeIdx = (activeIdx+1) % items.length; highlightActive(); } }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); if(items.length){ activeIdx = (activeIdx-1+items.length) % items.length; highlightActive(); } }
    else if(e.key === 'Enter'){ e.preventDefault(); runItem(activeIdx); }
    else if(e.key === 'Escape'){ closeCmdk(); }
  });

  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
      e.preventDefault();
      overlay.classList.contains('open') ? closeCmdk() : openCmdk();
    } else if(e.key === 'Escape' && overlay.classList.contains('open')){
      closeCmdk();
    }
  });
})();

(function(){
  let activeCard = null;
  const MAX_TILT = 8; // degrees

  function onMove(e){
    const card = e.target.closest && e.target.closest('.prod-card');
    if(!card){
      if(activeCard) resetCard(activeCard);
      activeCard = null;
      return;
    }
    activeCard = card;
    const r = card.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 100;
    const py = ((e.clientY - r.top) / r.height) * 100;
    const rx = (0.5 - py/100) * MAX_TILT * 2;
    const ry = (px/100 - 0.5) * MAX_TILT * 2;
    card.style.setProperty('--mx', px + '%');
    card.style.setProperty('--my', py + '%');
    card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  }
  function resetCard(card){
    card.style.setProperty('--rx','0deg');
    card.style.setProperty('--ry','0deg');
  }
  // Respect users who asked the OS for reduced motion
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion){
    document.addEventListener('pointermove', onMove, {passive:true});
  }
})();
