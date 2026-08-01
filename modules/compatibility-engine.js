/* compatibility-engine.js — embedded "محرك التوافق + مقارنة الماركات + أصوات النظام" tool
   inside the Smart Tools Hub. Real engineering rules (PoE budget, ONVIF, codecs, bandwidth)
   over a small hand-verified seed database — every number is sourced from an official datasheet. */

let ceReady = false;
let ceActx;

function ceInit(){
  if(ceReady) return;
  ceReady = true;
  ceFillSelect(document.getElementById('ceCamSel'), CE_PRODUCTS.cameras, p=>`${p.brand} ${p.model} — ${p.res}`);
  ceFillSelect(document.getElementById('ceSwSel'), CE_PRODUCTS.switches, p=>`${p.brand} ${p.model} — ${p.ports} ports / ${p.poeBudgetW}W PoE`);
  ceFillSelect(document.getElementById('ceNvrSel'), CE_PRODUCTS.nvrs, p=>`${p.brand} ${p.model} — ${p.channels} ch`);
  document.getElementById('ceSoundSnippet').textContent = CE_SNIPPET;
  ceRenderCompare();
}

/* ============ 1) SOUNDS (Web Audio synthesis — no audio files) ============ */
function ceAc(){ if(!ceActx) ceActx = new (window.AudioContext||window.webkitAudioContext)(); return ceActx; }
function ceTone(freq, start, dur, type='sine', vol=0.15){
  const c = ceAc(); const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime+start);
  g.gain.setValueAtTime(0, c.currentTime+start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime+start+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+start+dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime+start); o.stop(c.currentTime+start+dur+0.02);
}
function cePlayBoot(){ ceTone(440,0,.12,'sine',.12); ceTone(660,.12,.12,'sine',.12); ceTone(880,.24,.22,'sine',.14); }
function cePlaySwitching(){ ceTone(1200,0,.04,'square',.05); ceTone(900,.05,.04,'square',.05); }
function cePlayRadar(){
  const c = ceAc(); const o = c.createOscillator(); const g = c.createGain();
  o.type='sine'; o.frequency.setValueAtTime(1800, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, c.currentTime+.5);
  g.gain.setValueAtTime(.09, c.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime+.55);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+.6);
}
const CE_SNIPPET = `<script>
/* Delta Sound Engine — generated tones, no external audio files */
window.DeltaSound = (function(){
  let ctx;
  function ac(){ if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); return ctx; }
  function tone(freq,start,dur,type,vol){
    const c=ac(), o=c.createOscillator(), g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,c.currentTime+start);
    g.gain.setValueAtTime(0,c.currentTime+start);
    g.gain.linearRampToValueAtTime(vol||0.12,c.currentTime+start+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+start+dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+start); o.stop(c.currentTime+start+dur+0.02);
  }
  return {
    boot: function(){ tone(440,0,.12); tone(660,.12,.12); tone(880,.24,.22,'sine',.14); },
    switching: function(){ tone(1200,0,.04,'square',.05); tone(900,.05,.04,'square',.05); },
    radar: function(){
      const c=ac(), o=c.createOscillator(), g=c.createGain();
      o.type='sine'; o.frequency.setValueAtTime(1800,c.currentTime);
      o.frequency.exponentialRampToValueAtTime(600,c.currentTime+.5);
      g.gain.setValueAtTime(.09,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.55);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+.6);
    }
  };
})();
<\/script>

<!-- في الناف بار: -->
<a href="#networking" onmouseenter="DeltaSound.switching()">الشبكات</a>
<a href="#security" onmouseenter="DeltaSound.radar()">الأمن</a>

<!-- أول تفاعل من المستخدم (مطلوب من المتصفح قبل أي صوت): -->
<script>
document.addEventListener('click', function once(){ DeltaSound.boot(); document.removeEventListener('click',once); }, {once:true});
<\/script>`;
function ceCopySnippet(){ navigator.clipboard.writeText(CE_SNIPPET); alert('اتنسخ الكود بنجاح'); }

/* ============ 2) SEED PRODUCT DATABASE (real, sourced specs only) ============ */
const CE_PRODUCTS = {
  cameras: [
    {
      id:'hik_2143g2', brand:'Hikvision', model:'DS-2CD2143G2-I(S)', res:'4MP (2688×1520)',
      poe:'IEEE 802.3af, Class 3', poeMaxW:6.5,
      codecs:['H.265+','H.265','H.264+','H.264'],
      onvif:['Profile S','Profile G'],
      irRange:'غير مؤكد من المصادر المتاحة', ipRating:'IP67 (جسم الكاميرا)',
      source:'Hikvision Datasheet DS-2CD2143G2-IS_V5.5.113'
    },
    {
      id:'dahua_3441tzas', brand:'Dahua', model:'IPC-HDW3441T-ZAS', res:'4MP (2688×1520)@30fps',
      poe:'12VDC / PoE (802.3af)', poeMaxW:'غير مؤكد — الداتاشيت ماحددش Wattage دقيق',
      codecs:['H.265','H.264','H.264H','H.264B','MJPEG'],
      onvif:['ONVIF conformant (Profile مش محدد بدقة في المصادر المتاحة)'],
      irRange:'40 م', ipRating:'غير مؤكد من المصادر المتاحة لهذا الموديل بالتحديد',
      source:'Dahua Technology Official Specs Page — IPC-HDW3441T-ZAS'
    }
  ],
  switches: [
    {
      id:'cisco_cbs350_24p', brand:'Cisco', model:'CBS350-24P-4G',
      ports:24, poePortType:'PoE+ (802.3at)', poeBudgetW:195, maxPerPortW:30, uplink:'4× Gigabit SFP',
      source:'Cisco Business CBS350-24P-4G Datasheet'
    }
  ],
  nvrs: [
    {
      id:'hik_7608nik2', brand:'Hikvision', model:'DS-7608NI-K2/8P', channels:8,
      builtinPoePorts:8, bandwidthMbps:80, onvif:['Profile S','Profile G'],
      note:'يشتغل بأفضل أداء (AI/PTZ الكاملة) مع كاميرات Hikvision، وبيقبل كاميرات ONVIF تالت طرف بميزات تسجيل أساسية بس',
      source:'Hikvision Datasheet DS-7608NI-K2-NVR + Hikvision/Amazon product listings'
    }
  ]
};

function ceFillSelect(sel, list, labelFn){
  sel.innerHTML = list.map(p=>`<option value="${p.id}">${labelFn(p)}</option>`).join('');
}
function ceFind(list, id){ return list.find(x=>x.id===id); }

/* ============ 3) COMPATIBILITY ENGINE (real engineering rules) ============ */
function ceRunEngine(){
  const cam = ceFind(CE_PRODUCTS.cameras, document.getElementById('ceCamSel').value);
  const sw = ceFind(CE_PRODUCTS.switches, document.getElementById('ceSwSel').value);
  const nvr = ceFind(CE_PRODUCTS.nvrs, document.getElementById('ceNvrSel').value);
  const qty = Math.max(1, parseInt(document.getElementById('ceCamQty').value)||1);
  const out = [];

  const portsNeeded = qty + 1;
  if(portsNeeded <= sw.ports){
    out.push({cls:'ok', html:`✅ عدد البورتات كافي: محتاج <b>${portsNeeded}</b> بورت (${qty} كاميرا + uplink) والسويتش فيه <b>${sw.ports}</b>.`});
  } else {
    out.push({cls:'bad', html:`❌ عدد البورتات مش كافي: محتاج <b>${portsNeeded}</b> والسويتش فيه <b>${sw.ports}</b> بس — هتحتاج سويتش تاني أو Uplink من كور سويتش.`});
  }

  if(typeof cam.poeMaxW === 'number'){
    const total = (cam.poeMaxW * qty).toFixed(1);
    if(total <= sw.poeBudgetW){
      out.push({cls:'ok', html:`✅ PoE Budget كافي: ${qty} كاميرا × ${cam.poeMaxW}W = <b>${total}W</b> والسويتش بيدي <b>${sw.poeBudgetW}W</b>.`, src:`${cam.source} / ${sw.source}`});
    } else {
      out.push({cls:'bad', html:`❌ PoE Budget مش كافي: ${qty} كاميرا × ${cam.poeMaxW}W = <b>${total}W</b> لكن السويتش بيدي <b>${sw.poeBudgetW}W</b> بس — قلل عدد الكاميرات على السويتش ده أو زوّد سويتش تاني.`, src:`${cam.source} / ${sw.source}`});
    }
  } else {
    out.push({cls:'warn', html:`⚠️ مش قادر أحسب الـPoE الكلي: الداتاشيت الرسمي لكاميرا ${cam.brand} ${cam.model} ماحددش Wattage دقيق في المصادر المتاحة. راجع الداتاشيت أو اسأل المورّد قبل ما تحدد عدد الكاميرات على كل سويتش.`});
  }

  if(cam.brand === nvr.brand){
    out.push({cls:'ok', html:`✅ نفس الماركة (${cam.brand}): هيشتغل بالبروتوكول الأصلي بكل الميزات (AI detection، الخ) من غير الاعتماد على ONVIF بس.`});
  } else {
    out.push({cls:'warn', html:`⚠️ ماركات مختلفة (كاميرا ${cam.brand} / NVR ${nvr.brand}): ${nvr.note} تأكد من التوافق الفعلي بالتجربة على جهاز واحد قبل ما تشتري الكمية كلها.`, src:nvr.source});
  }

  out.push({cls:'ok', html:`ℹ️ الكاميرا بتدعم: <b>${cam.codecs.join(', ')}</b>. الـNVR المختار (${nvr.brand} ${nvr.model}) بيدعم H.264/H.265 قياسيًا — تأكد إن إعداد الـstream على الكاميرا متظبط على كودك مدعوم فعليًا.`});

  const estMbpsPerCam = 4;
  const totalEst = estMbpsPerCam*qty;
  if(totalEst <= nvr.bandwidthMbps){
    out.push({cls:'ok', html:`✅ تقدير الباندويدث: ${qty} كاميرا × ~${estMbpsPerCam} Mbps (تقدير صناعي عام لـ4MP H.265، مش رقم من الداتاشيت) = ~<b>${totalEst} Mbps</b>، والـNVR سقفه <b>${nvr.bandwidthMbps} Mbps</b>.`});
  } else {
    out.push({cls:'bad', html:`❌ تقدير الباندويدث أعلى من سقف الـNVR: ~<b>${totalEst} Mbps</b> تقديريًا مقابل سقف <b>${nvr.bandwidthMbps} Mbps</b> — قلل الـbitrate على الكاميرات أو استخدم NVR بسقف أعلى.`});
  }

  document.getElementById('ceEngineResult').innerHTML = out.map(o=>
    `<div class="ce-check ${o.cls}">${o.html}${o.src?`<span class="ce-src">المصدر: ${o.src}</span>`:''}</div>`
  ).join('');
}

/* ============ 4) VENDOR-NEUTRAL COMPARISON TABLE ============ */
function ceRenderCompare(){
  const rows = CE_PRODUCTS.cameras.map(c=>`
    <tr>
      <td><b>${c.brand}</b><br>${c.model}</td>
      <td>${c.res}</td>
      <td>${c.poe}${typeof c.poeMaxW==='number' ? ' — max '+c.poeMaxW+'W' : ' — '+c.poeMaxW}</td>
      <td>${c.codecs.join(', ')}</td>
      <td>${c.onvif.join(', ')}</td>
      <td>${c.irRange}</td>
      <td>${c.ipRating}</td>
    </tr>`).join('');
  document.getElementById('ceCompareTableHost').innerHTML = `
    <table class="compare-table">
      <tr><th>الموديل</th><th>الدقة</th><th>الطاقة (PoE)</th><th>الكودك</th><th>ONVIF</th><th>مدى الرؤية الليلية</th><th>تصنيف الحماية</th></tr>
      ${rows}
    </table>
    <p class="finder-note">القاعدة فيها موديلين بس حاليًا (كل رقم فيها من الداتاشيت الرسمي مباشرة). توسيع المقارنة بيتم بإضافة موديل جديد لقاعدة البيانات — بدون أي تحيز مبرمج لماركة معينة.</p>`;
}

/* ============ SUB-TAB SWITCHING ============ */
function ceTab(name){
  document.querySelectorAll('.ce-subtab-btn').forEach(t=>t.classList.toggle('active', t.dataset.t===name));
  document.querySelectorAll('.ce-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('ce-p-'+name).classList.add('active');
}
