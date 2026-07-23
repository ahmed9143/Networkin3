/* rack.js — Rack Builder tool (U-height picker, power/weight calc, WhatsApp/PDF export, save project). */

function initRackBuilder(){
  const host = document.getElementById('rackAddButtons');
  if(!host) return;
  host.innerHTML = RACK_COMPONENTS.map(c=>{
    if(c.fixedU) return `<button class="filter-btn" onclick="addRackItem('${c.key}', ${c.u})">${c.icon} + ${c.label} (${c.u}U)</button>`;
    return `<button class="filter-btn" onclick="rackOpenUPicker('${c.key}')">${c.icon} + ${c.label}</button>`;
  }).join('');
  document.getElementById('rackUPickerBox') || rackInjectUPickerBox();
  renderRackBuilder();
}
function rackInjectUPickerBox(){
  const host = document.getElementById('rackAddButtons');
  const box = document.createElement('div');
  box.id = 'rackUPickerBox';
  box.style.display = 'none';
  box.innerHTML = `<div class="finder-note" style="margin-top:10px;">اختار حجم الوحدة (U) لـ <b id="rackUPickerLabel"></b>:</div><div class="rack-u-select" id="rackUPickerBtns"></div>`;
  host.parentElement.insertBefore(box, host.nextSibling);
}
function rackOpenUPicker(key){
  const comp = RACK_COMPONENTS.find(c=>c.key===key);
  if(!comp) return;
  rackPendingKey = key;
  const box = document.getElementById('rackUPickerBox');
  box.style.display = 'block';
  document.getElementById('rackUPickerLabel').innerText = comp.label;
  document.getElementById('rackUPickerBtns').innerHTML = RACK_U_OPTIONS.map(u=>
    `<button class="${u===comp.u?'active':''}" onclick="rackConfirmU(${u}, this)">${u}U</button>`
  ).join('') + `<button class="btn btn-cta" style="padding:5px 14px;" onclick="rackConfirmAdd()">✔ إضافة</button>`;
  rackPendingU = comp.u;
}
function rackConfirmU(u, btnEl){
  rackPendingU = u;
  document.querySelectorAll('#rackUPickerBtns button').forEach(b=>b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');
}
function rackConfirmAdd(){
  if(!rackPendingKey) return;
  addRackItem(rackPendingKey, rackPendingU);
  document.getElementById('rackUPickerBox').style.display = 'none';
  rackPendingKey = null;
}
function addRackItem(key, uSize){
  const comp = RACK_COMPONENTS.find(c=>c.key===key);
  if(!comp) return;
  const u = uSize || comp.u;
  rackItems.push({...comp, u, uid: Date.now()+Math.random()});
  renderRackBuilder();
}
function removeRackItem(uid){
  rackItems = rackItems.filter(i=>i.uid!==uid);
  renderRackBuilder();
}
function moveRackItem(uid, dir){
  const idx = rackItems.findIndex(i=>i.uid===uid);
  if(idx<0) return;
  const newIdx = idx+dir;
  if(newIdx<0 || newIdx>=rackItems.length) return;
  [rackItems[idx], rackItems[newIdx]] = [rackItems[newIdx], rackItems[idx]];
  renderRackBuilder();
}
function renderRackBuilder(){
  const list = document.getElementById('rackList');
  if(!list) return;
  list.innerHTML = rackItems.length ? rackItems.map((it,i)=>`
    <div class="finder-chip-row">
      <span>${it.icon} ${it.label} <span class="u-tag" style="background:var(--brand-blue);color:#fff;border-radius:5px;padding:1px 7px;font-size:10.5px;">${it.u}U</span> ${it.watts?` · ${it.watts}W`:''}</span>
      <span>
        <button class="btn btn-outline" style="padding:2px 8px;" onclick="moveRackItem(${it.uid},-1)">⬆️</button>
        <button class="btn btn-outline" style="padding:2px 8px;" onclick="moveRackItem(${it.uid},1)">⬇️</button>
        <button class="btn btn-outline" style="padding:2px 8px;" onclick="removeRackItem(${it.uid})">✖</button>
      </span>
    </div>`).join('') : '<div class="empty-state">الرَاك فاضي - ضيف أجهزة من فوق</div>';

  const totalU = rackItems.reduce((s,i)=>s+i.u,0);
  const cap = parseInt(document.getElementById('rackCapacity').value)||24;
  document.getElementById('rackTotalValue').innerText = `${totalU}U / ${cap}U`;
  const warnEl = document.getElementById('rackWarning');
  warnEl.innerText = totalU > cap ? `⚠️ الرَاك ده مش هيكفي، محتاج رَاك أكبر (فاضل ${totalU-cap}U).` : `✅ متبقي ${cap-totalU}U فاضيين في الرَاك.`;

  /* ---- Calculations: power, weight, cooling, UPS runtime ---- */
  const totalWatts = rackItems.reduce((s,i)=>s + (i.watts||0), 0);
  const totalKg = rackItems.reduce((s,i)=>s + (i.kg||0), 0);
  const btuHr = Math.round(totalWatts * 3.412); // 1W ≈ 3.412 BTU/hr
  const upsItems = rackItems.filter(i=>i.key==='ups');
  const totalVA = upsItems.length * 2000; // default 2000VA/unit unless upgraded from catalog
  const loadWithoutUps = Math.max(totalWatts - 0, 1);
  const upsRuntimeMin = totalVA > 0 ? Math.round((totalVA*0.8 / loadWithoutUps) * 9) : 0; // rough estimate, real runtime depends on battery Ah
  const monthlyCost = Math.round((totalWatts/1000) * 24 * 30 * 1.75); // ~1.75 ج.م/kWh placeholder tariff — for guidance only

  let calcHost = document.getElementById('rackCalcGrid');
  if(!calcHost){
    calcHost = document.createElement('div');
    calcHost.id = 'rackCalcGrid';
    calcHost.className = 'rack-calc-grid';
    document.getElementById('rackTotalBox').appendChild(calcHost);
  }
  calcHost.innerHTML = `
    <div class="rack-calc-card"><div class="v">${totalWatts} W</div><div class="l">⚡ إجمالي الاستهلاك</div></div>
    <div class="rack-calc-card"><div class="v">${totalKg.toFixed(1)} kg</div><div class="l">⚖️ إجمالي الوزن</div></div>
    <div class="rack-calc-card"><div class="v">${btuHr.toLocaleString('en')}</div><div class="l">🌡️ BTU/hr تبريد مطلوب</div></div>
    <div class="rack-calc-card"><div class="v">${upsItems.length ? upsRuntimeMin+' د' : '—'}</div><div class="l">🔋 مدة تشغيل UPS تقديرية</div></div>
    <div class="rack-calc-card"><div class="v">~${monthlyCost.toLocaleString('ar-EG')} ج.م</div><div class="l">💡 تكلفة كهرباء شهرية تقديرية</div></div>
  `;

  /* ---- Visual elevation diagram ---- */
  let elHost = document.getElementById('rackElevation');
  if(!elHost){
    elHost = document.createElement('div');
    elHost.id = 'rackElevation';
    elHost.className = 'rack-elevation';
    document.getElementById('rackList').parentElement.insertBefore(elHost, document.getElementById('rackTotalBox'));
  }
  const emptyU = Math.max(cap - totalU, 0);
  elHost.innerHTML = (rackItems.map(it=>`<div class="rack-u-row"><b>${it.icon} ${it.label}</b><span class="u-tag">${it.u}U</span></div>`).join('')) +
    Array.from({length: Math.min(emptyU, 20)}).map(()=>'<div class="rack-empty-slot"></div>').join('') +
    (emptyU>20 ? `<div style="text-align:center;color:#8892a8;font-size:11px;padding:4px;">+ ${emptyU-20}U فاضيين</div>` : '');

  /* ---- Actions row (save / PDF) — injected once ---- */
  if(!document.getElementById('rackActionsRow')){
    const row = document.createElement('div');
    row.id = 'rackActionsRow';
    row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;';
    row.innerHTML = `
      <button class="btn btn-cta" onclick="rackSaveProject()">💾 حفظ المشروع (رقم مرجعي)</button>
      <button class="btn btn-primary" onclick="rackDownloadPdf()">⬇️ تحميل PDF</button>
      <button class="btn btn-outline" onclick="rackSendWhatsapp()">📲 إرسال واتساب</button>`;
    document.getElementById('rackTotalBox').appendChild(row);
    const msg = document.createElement('div');
    msg.id = 'rackSaveMsg';
    msg.style.cssText = 'margin-top:8px;font-size:13px;';
    document.getElementById('rackTotalBox').appendChild(msg);
  }
}

function rackSendWhatsapp(){
  if(!rackItems.length){ alert('ضيف أجهزة للرَاك الأول'); return; }
  const cap = parseInt(document.getElementById('rackCapacity').value)||24;
  const totalU = rackItems.reduce((s,i)=>s+i.u,0);
  const lines = [`🗄️ تصميم Rack (${cap}U):`,''];
  rackItems.forEach(i=>lines.push(`- ${i.label} (${i.u}U)`));
  lines.push('', `الإجمالي: ${totalU}U / ${cap}U`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

async function rackSaveProject(){
  const msg = document.getElementById('rackSaveMsg');
  if(!rackItems.length){ if(msg){msg.style.color='var(--danger,#e5484d)';msg.innerText='ضيف أجهزة للرَاك الأول';} return; }
  const cap = parseInt(document.getElementById('rackCapacity').value)||24;
  const totalU = rackItems.reduce((s,i)=>s+i.u,0);
  const totalWatts = rackItems.reduce((s,i)=>s+(i.watts||0),0);
  const totalKg = rackItems.reduce((s,i)=>s+(i.kg||0),0);
  const payload = {
    capacity_u: cap,
    items: rackItems.map(({uid, ...rest})=>rest),
    total_u: totalU,
    power_watts: totalWatts,
    weight_kg: totalKg
  };
  try{
    const { data, error } = await sb.from('rack_projects').insert(payload).select('id').single();
    if(error) throw error;
    const code = data.id.slice(0,8).toUpperCase();
    msg.style.color = 'var(--brand-blue)';
    msg.innerHTML = `✅ اتحفظ! رقم المشروع المرجعي: <b>RACK-${code}</b> — احتفظ بيه للمتابعة مع فريقنا.`;
  }catch(e){
    console.error('rack_projects insert failed', e);
    msg.style.color = 'var(--danger,#e5484d)';
    msg.innerText = 'حصل خطأ أثناء الحفظ، جرب تاني أو تواصل معنا مباشرة.';
  }
}

function rackDownloadPdf(){
  if(!rackItems.length){ alert('ضيف أجهزة للرَاك الأول'); return; }
  if(!window.jspdf){ alert('مكتبة PDF لسه بتحمّل، جرب تاني بعد ثانية'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const cap = parseInt(document.getElementById('rackCapacity').value)||24;
  const totalU = rackItems.reduce((s,i)=>s+i.u,0);
  const totalWatts = rackItems.reduce((s,i)=>s+(i.watts||0),0);
  const totalKg = rackItems.reduce((s,i)=>s+(i.kg||0),0);
  doc.setFontSize(16); doc.text('Delta IT Solutions — Rack Layout', 14, 16);
  doc.setFontSize(10); doc.text(`Capacity: ${cap}U   |   Used: ${totalU}U   |   Power: ${totalWatts}W   |   Weight: ${totalKg.toFixed(1)}kg`, 14, 24);
  doc.autoTable({
    startY: 30,
    head: [['#','Component','U Size','Power (W)','Weight (kg)']],
    body: rackItems.map((it,i)=>[i+1, it.label, it.u+'U', it.watts||0, it.kg||0]),
    styles:{font:'helvetica', fontSize:9},
    headStyles:{fillColor:[11,18,32]}
  });
  doc.save('rack-layout.pdf');
}

/* ================= BOQ Generator (Phase 2, standalone page) =================
   Separate from the quick Quote Builder tab: adds project/customer metadata,
   discount + VAT, a saved record in Supabase (boq_documents) with a shareable
   reference number, a real downloadable PDF (jsPDF/autotable) and a CSV export
   that opens correctly in Excel. */
let boqItems = [];
let boqCounter = 0;
