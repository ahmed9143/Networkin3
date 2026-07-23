/* calculators.js — PoE/UPS/cable-run/coverage/storage/project-cost calculators. */

function calcStorage(){
  const cameras = parseInt(document.getElementById('scCameras').value) || 0;
  const resolution = parseInt(document.getElementById('scResolution').value) || 4;
  const days = parseInt(document.getElementById('scDays').value) || 0;
  const codec = document.getElementById('scCodec').value;
  const box = document.getElementById('scResultBox');

  if(!cameras || !days){ box.style.display = 'none'; lastStorageSummary=''; return; }

  const bitrateKbps = SC_BITRATE_KBPS[codec][resolution];
  // GB = (kbps * 3600 ثانية * 24 ساعة * أيام * كاميرات) / (8 بت لكل بايت * 1024*1024 لتحويل كيلوبت لجيجابايت)
  const totalGB = (bitrateKbps * 3600 * 24 * days * cameras) / (8 * 1024 * 1024);
  const totalTB = totalGB / 1024;

  const displayVal = totalTB >= 1 ? `${totalTB.toFixed(1)} تيرابايت` : `${Math.ceil(totalGB)} جيجابايت`;
  document.getElementById('scResultValue').innerText = displayVal;
  document.getElementById('scResultDetail').innerText = `لـ ${cameras} كاميرا بدقة ${resolution} ميجابكسل، تسجيل ${days} يوم، ترميز ${codec === 'h265' ? 'H.265' : 'H.264'}.`;
  box.style.display = 'block';

  lastStorageSummary = `تقدير مساحة تخزين: ${cameras} كاميرا (${resolution}MP) × ${days} يوم تسجيل (${codec === 'h265' ? 'H.265' : 'H.264'}) ≈ ${displayVal} (تقدير تقريبي).`;
}

function useStorageInQuote(){
  if(!lastStorageSummary) return;
  navigateTo('contact');
  const details = document.getElementById('contactDetails');
  const existing = details.value.trim();
  details.value = existing ? `${existing}\n\n${lastStorageSummary}` : lastStorageSummary;
  document.getElementById('contactName').focus();
  window.scrollTo({top: document.getElementById('contactName').getBoundingClientRect().top + window.scrollY - 100, behavior:'smooth'});
}

/* ================= Smart Tools Hub: sub-tab switching ================= */
function showToolTab(name){
  document.getElementById('toolsHubGrid').style.display = 'none';
  document.getElementById('toolsTabBar').style.display = 'flex';
  document.querySelectorAll('.tool-tab-panel').forEach(p=>p.classList.remove('active-tool-tab'));
  document.querySelectorAll('.tool-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tool===name));
  const panel = document.getElementById('toolTab-'+name);
  if(panel) panel.classList.add('active-tool-tab');
  if(name==='coverage') drawCoverage();
  if(name==='poe') calcPoe();
  if(name==='ups') calcUps();
  if(name==='cable') calcCable();
  if(name==='compare') initCompareTool();
  if(name==='quote') initQuoteBuilder();
  if(name==='security') calcSecurityScore();
}
function hideToolTabs(){
  document.getElementById('toolsHubGrid').style.display = 'grid';
  document.getElementById('toolsTabBar').style.display = 'none';
  document.querySelectorAll('.tool-tab-panel').forEach(p=>p.classList.remove('active-tool-tab'));
}

/* ================= PoE Budget Calculator ================= */
const POE_SWITCH_TIERS = [
  {watt:65, label:'سويتش PoE 4/8 منفذ - 65W'},
  {watt:130, label:'سويتش PoE 8/16 منفذ - 130W'},
  {watt:250, label:'سويتش PoE 16/24 منفذ - 250W'},
  {watt:400, label:'سويتش PoE 24 منفذ Full Gigabit - 400W'},
  {watt:600, label:'سويتش PoE Rack Managed 24/48 منفذ - 600W+'}
];
function calcPoe(){
  const cams = parseInt(document.getElementById('poeCams').value)||0;
  const wattEach = parseInt(document.getElementById('poeWatt').value)||0;
  const extra = parseInt(document.getElementById('poeExtra').value)||0;
  const extraWatt = parseInt(document.getElementById('poeExtraWatt').value)||0;
  const totalWatt = (cams*wattEach)+(extra*extraWatt);
  const withHeadroom = Math.ceil(totalWatt*1.2);
  const suggested = POE_SWITCH_TIERS.find(t=>t.watt>=withHeadroom) || POE_SWITCH_TIERS[POE_SWITCH_TIERS.length-1];
  const box = document.getElementById('poeResultBox');
  box.innerHTML = `
    <h4>⚡ الاستهلاك الفعلي: ${totalWatt} وات</h4>
    <div style="font-size:26px;font-weight:800;color:var(--cable-orange);">مع هامش أمان 20%: ${withHeadroom} وات</div>
    <p class="finder-note">السويتش المقترح: <b>${suggested.label}</b></p>
    <p class="finder-note">⚠️ الهامش مهم عشان تشغيل الكاميرات وقت البرد أو أي ذروة استهلاك مؤقتة.</p>`;
}

/* ================= UPS Runtime Calculator ================= */
function calcUps(){
  const cams = parseInt(document.getElementById('upsCams').value)||0;
  const camW = parseInt(document.getElementById('upsCamWatt').value)||0;
  const nvr = parseInt(document.getElementById('upsNvr').value)||0;
  const nvrW = parseInt(document.getElementById('upsNvrWatt').value)||0;
  const swW = parseInt(document.getElementById('upsSwitchWatt').value)||0;
  const capacityVA = parseInt(document.getElementById('upsCapacity').value)||1000;
  const totalWatt = (cams*camW)+(nvr*nvrW)+swW;
  // تقدير تقريبي: Watt فعلي للـUPS ≈ VA * 0.6 (Power Factor)، ومدة التشغيل بالدقايق تقريبية
  const usableWatt = capacityVA*0.6;
  let runtimeMin = totalWatt>0 ? Math.round((usableWatt/totalWatt)*8*60*0.5) : 0; // معامل تقريبي للبطارية الداخلية القياسية
  runtimeMin = Math.max(0, Math.min(runtimeMin, 180));
  const box = document.getElementById('upsResultBox');
  box.innerHTML = `
    <h4>🔋 إجمالي الحمل: ${totalWatt} وات</h4>
    <div style="font-size:26px;font-weight:800;color:var(--cable-orange);">مدة تشغيل تقريبية: ${runtimeMin} دقيقة</div>
    <p class="finder-note">بسعة UPS ${capacityVA} VA (بطارية داخلية قياسية).</p>
    <p class="finder-note">⚠️ ده تقدير تقريبي جدًا للتوجيه الأولي فقط - المدة الفعلية بتختلف حسب نوع وعمر البطارية وكفاءة الـ UPS. لمدة تشغيل أطول (ساعتين فأكتر) هنحتاج نضيف بطاريات خارجية - كلمنا نظبطلك الحساب بالظبط.</p>`;
}

/* ================= Cable Length Calculator ================= */
function calcCable(){
  const cams = parseInt(document.getElementById('cabCams').value)||0;
  const dist = parseFloat(document.getElementById('cabDist').value)||0;
  const type = document.getElementById('cabType').value;
  const margin = parseFloat(document.getElementById('cabMargin').value)||0;
  const baseLength = cams*dist;
  const totalLength = Math.ceil(baseLength*(1+margin/100));
  const boxes305 = Math.ceil(totalLength/305);
  const box = document.getElementById('cabResultBox');
  if(type==='cat6'){
    box.innerHTML = `
      <h4>🧵 كابل Cat6 المطلوب</h4>
      <div style="font-size:26px;font-weight:800;color:var(--cable-orange);">${totalLength} متر تقريبًا</div>
      <p class="finder-note">يعادل ${boxes305} لفة كابل Cat6 (305 متر للفة تقريبًا).</p>
      <p class="finder-note">لو الكاميرات PoE مش هتحتاج كابل باور منفصل، الكابل الواحد بينقل بيانات وطاقة مع بعض.</p>`;
  } else {
    box.innerHTML = `
      <h4>🧵 الكابلات المطلوبة (Analog)</h4>
      <div style="font-size:22px;font-weight:800;color:var(--cable-orange);">RG59: ${totalLength} متر تقريبًا</div>
      <div style="font-size:22px;font-weight:800;color:var(--cable-orange);margin-top:4px;">كابل باور: ${totalLength} متر تقريبًا</div>
      <p class="finder-note">يعادل تقريبًا ${boxes305} لفة لكل نوع كابل (305 متر للفة).</p>`;
  }
}

/* ================= Coverage Calculator (SVG top-down room) ================= */
let covCameras = [];
let covIdCounter = 0;
function metersToScale(){
  const w = parseFloat(document.getElementById('covW').value)||10;
  const l = parseFloat(document.getElementById('covL').value)||10;
  const pad = 40;
  const scale = Math.min((500-pad*2)/w, (500-pad*2)/l);
  return {w,l,scale,pad};
}
function covAddCamera(ev){
  const svg = document.getElementById('covSvg');
  const rect = svg.getBoundingClientRect();
  const {w,l,scale,pad} = metersToScale();
  const px = (ev.clientX-rect.left) * (500/rect.width);
  const py = (ev.clientY-rect.top) * (500/rect.height);
  const roomPxW = w*scale, roomPxL = l*scale;
  if(px < pad || px > pad+roomPxW || py < pad || py > pad+roomPxL) return; // outside room
  covIdCounter++;
  covCameras.push({id:covIdCounter, x:px, y:py, angle:270, fov:90, range: Math.min(w,l)*0.5});
  drawCoverage();
}
function covRemove(id){
  covCameras = covCameras.filter(c=>c.id!==id);
  drawCoverage();
}
function covReset(){ covCameras = []; drawCoverage(); }
function covUpdateAngle(id, val){
  const c = covCameras.find(c=>c.id===id);
  if(c){ c.angle = parseInt(val); drawCoverage(); }
}
function drawCoverage(){
  const svg = document.getElementById('covSvg');
  const {w,l,scale,pad} = metersToScale();
  const roomPxW = w*scale, roomPxL = l*scale;
  let svgContent = `<rect x="${pad}" y="${pad}" width="${roomPxW}" height="${roomPxL}" fill="none" stroke="var(--cable-blue)" stroke-width="2"/>`;
  let totalConeArea = 0;
  const roomArea = w*l;
  covCameras.forEach(cam=>{
    const rangePx = cam.range*scale;
    const halfFov = cam.fov/2;
    const a1 = (cam.angle-halfFov)*Math.PI/180;
    const a2 = (cam.angle+halfFov)*Math.PI/180;
    const x1 = cam.x+rangePx*Math.cos(a1), y1 = cam.y+rangePx*Math.sin(a1);
    const x2 = cam.x+rangePx*Math.cos(a2), y2 = cam.y+rangePx*Math.sin(a2);
    svgContent += `<path d="M${cam.x},${cam.y} L${x1},${y1} A${rangePx},${rangePx} 0 0,1 ${x2},${y2} Z" fill="var(--cable-orange-dim)" stroke="var(--cable-orange)" stroke-width="1.5"/>`;
    svgContent += `<circle cx="${cam.x}" cy="${cam.y}" r="7" fill="var(--cable-orange)" stroke="#fff" stroke-width="2"/>`;
    svgContent += `<text x="${cam.x}" y="${cam.y-12}" font-size="11" fill="var(--ink)" text-anchor="middle">📷</text>`;
    totalConeArea += Math.PI*(cam.range*cam.range)*(cam.fov/360);
  });
  svg.innerHTML = svgContent;

  const covPct = Math.min(100, Math.round((totalConeArea/roomArea)*100));
  document.getElementById('covSummary').innerHTML = covCameras.length ? `
    <h4>📊 تقدير التغطية</h4>
    <div style="font-size:26px;font-weight:800;color:var(--cable-orange);">${covPct}% من مساحة المكان (${roomArea.toFixed(0)} م²)</div>
    <p class="finder-note">⚠️ ده تقدير هندسي تقريبي مبني على زاوية ومدى كل كاميرا وبيفترض عدم وجود عوائق - المعاينة الميدانية بتحدد الأماكن الفعلية والـBlind Spots بدقة.</p>` : '<p class="finder-note">دوس على الرسمة عشان تضيف كاميرا وتشوف مدى تغطيتها.</p>';

  document.getElementById('covCamList').innerHTML = covCameras.map(c=>`
    <div class="cov-cam-item">
      <span>📷 كاميرا #${c.id} — مدى ${c.range}م، زاوية ${c.fov}°</span>
      <input type="range" min="0" max="359" value="${c.angle}" oninput="covUpdateAngle(${c.id}, this.value)" style="flex:1;margin:0 12px;">
      <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="covRemove(${c.id})">✕</button>
    </div>`).join('');
}

/* ================= Compare Products ================= */
function calcProjectCost(){
  const cameras = parseInt(document.getElementById('calcCameras').value) || 0;
  const points = parseInt(document.getElementById('calcNetworkPoints').value) || 0;
  const fp = parseInt(document.getElementById('calcFingerprint').value) || 0;
  const box = document.getElementById('calcResultBox');

  if(!cameras && !points && !fp){ box.style.display = 'none'; lastCalcSummary=''; return; }

  const min = cameras*CALC_RATES.camera.min + points*CALC_RATES.networkPoint.min + fp*CALC_RATES.fingerprint.min;
  const max = cameras*CALC_RATES.camera.max + points*CALC_RATES.networkPoint.max + fp*CALC_RATES.fingerprint.max;

  document.getElementById('calcResultValue').innerText = `${min.toLocaleString('ar-EG')} - ${max.toLocaleString('ar-EG')} ج.م`;
  box.style.display = 'block';

  const parts = [];
  if(cameras) parts.push(`${cameras} كاميرا مراقبة`);
  if(points) parts.push(`${points} نقطة شبكة`);
  if(fp) parts.push(`${fp} جهاز بصمة/حضور`);
  lastCalcSummary = `تقدير مبدئي للمشروع (${parts.join(' + ')}): ${min.toLocaleString('ar-EG')} - ${max.toLocaleString('ar-EG')} ج.م تقريبًا (توريد وتركيب، تقدير غير نهائي).`;
}

function useCalcInQuote(){
  if(!lastCalcSummary) return;
  const details = document.getElementById('contactDetails');
  const existing = details.value.trim();
  details.value = existing ? `${existing}\n\n${lastCalcSummary}` : lastCalcSummary;
  document.getElementById('contactName').focus();
  window.scrollTo({top: document.getElementById('contactName').getBoundingClientRect().top + window.scrollY - 100, behavior:'smooth'});
}

function goToServiceQuote(serviceName){
  navigateTo('contact');
  const details = document.getElementById('contactDetails');
  if(details && !details.value.trim()){
    details.value = `أرغب في عرض سعر لخدمة: ${serviceName}\nتفاصيل إضافية: `;
    details.focus();
  }
}

