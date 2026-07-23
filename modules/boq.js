/* boq.js — BOQ/Proposal generator + Quote Builder (kept together: near-duplicate logic, flagged for future shared-module refactor). */

function initBoqBuilder(){
  const picker = document.getElementById('boqProductPicker');
  if(picker && picker.dataset.filled !== '1'){
    picker.innerHTML = '<option value="">➕ اختر منتج من الكتالوج لإضافته...</option>' + products.map((p,i)=>`<option value="${i}">${p.name} — ${p.price?Number(p.price).toLocaleString('ar-EG')+' ج.م':''}</option>`).join('');
    picker.onchange = function(){
      if(this.value==='') return;
      const p = products[parseInt(this.value)];
      boqItems.push({id:++boqCounter, name:p.name, qty:1, price:Number(p.price)||0});
      this.value='';
      renderBoqTable();
    };
    picker.dataset.filled = '1';
  }
  if(!boqItems.length) boqAddBlankRow();
  renderBoqTable();
}
function boqAddBlankRow(){
  boqItems.push({id:++boqCounter, name:'', qty:1, price:0});
  renderBoqTable();
}
function boqRemoveRow(id){
  boqItems = boqItems.filter(i=>i.id!==id);
  renderBoqTable();
}
function boqUpdate(id, field, val){
  const item = boqItems.find(i=>i.id===id);
  if(!item) return;
  item[field] = (field==='qty'||field==='price') ? (parseFloat(val)||0) : val;
  renderBoqTable();
}
function boqTotals(){
  const subtotal = boqItems.reduce((s,i)=>s+(i.qty*i.price),0);
  const discountPct = parseFloat(document.getElementById('boqDiscount').value)||0;
  const vatPct = parseFloat(document.getElementById('boqVat').value)||0;
  const discountVal = subtotal * (discountPct/100);
  const afterDiscount = subtotal - discountVal;
  const vatVal = afterDiscount * (vatPct/100);
  const grandTotal = afterDiscount + vatVal;
  return {subtotal, discountVal, vatVal, grandTotal};
}
function renderBoqTable(){
  const tbody = document.getElementById('boqRows');
  if(!tbody) return;
  tbody.innerHTML = boqItems.map(i=>`
    <tr>
      <td><input type="text" value="${(i.name||'').replace(/"/g,'&quot;')}" placeholder="اسم الصنف" oninput="boqUpdate(${i.id},'name',this.value)"></td>
      <td><input type="number" min="1" value="${i.qty}" style="max-width:70px;" oninput="boqUpdate(${i.id},'qty',this.value)"></td>
      <td><input type="number" min="0" value="${i.price}" style="max-width:100px;" oninput="boqUpdate(${i.id},'price',this.value)"></td>
      <td>${(i.qty*i.price).toLocaleString('ar-EG')} ج.م</td>
      <td><button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="boqRemoveRow(${i.id})">✕</button></td>
    </tr>`).join('');
  const t = boqTotals();
  document.getElementById('boqSubtotal').innerText = `${t.subtotal.toLocaleString('ar-EG')} ج.م`;
  document.getElementById('boqDiscountVal').innerText = `- ${t.discountVal.toLocaleString('ar-EG')} ج.م`;
  document.getElementById('boqVatVal').innerText = `+ ${t.vatVal.toLocaleString('ar-EG')} ج.م`;
  document.getElementById('boqGrandTotal').innerText = `${t.grandTotal.toLocaleString('ar-EG')} ج.م`;
}
function boqValidRows(){ return boqItems.filter(i=>i.name && i.name.trim()!==''); }

async function boqSave(){
  const msg = document.getElementById('boqSaveMsg');
  const rows = boqValidRows();
  if(!rows.length){ msg.style.color='var(--danger,#e5484d)'; msg.innerText='ضيف صنف واحد على الأقل قبل الحفظ'; return; }
  const t = boqTotals();
  const payload = {
    customer_name: document.getElementById('boqCustomerName').value.trim() || null,
    customer_phone: document.getElementById('boqCustomerPhone').value.trim() || null,
    project_name: document.getElementById('boqProjectName').value.trim() || null,
    items: rows,
    discount_pct: parseFloat(document.getElementById('boqDiscount').value)||0,
    vat_pct: parseFloat(document.getElementById('boqVat').value)||0,
    subtotal: t.subtotal,
    grand_total: t.grandTotal,
    notes: document.getElementById('boqNotes').value.trim() || null
  };
  try{
    const { data, error } = await sb.from('boq_documents').insert(payload).select('id').single();
    if(error) throw error;
    const code = data.id.slice(0,8).toUpperCase();
    msg.style.color = 'var(--brand-blue)';
    msg.innerHTML = `✅ اتحفظ! رقم الـ BOQ المرجعي: <b>BOQ-${code}</b>`;
  }catch(e){
    console.error('boq_documents insert failed', e);
    msg.style.color = 'var(--danger,#e5484d)';
    msg.innerText = 'حصل خطأ أثناء الحفظ، جرب تاني أو تواصل معنا مباشرة.';
  }
}

function boqDownloadPdf(){
  const rows = boqValidRows();
  if(!rows.length){ alert('ضيف صنف واحد على الأقل قبل التحميل'); return; }
  if(!window.jspdf){ alert('مكتبة PDF لسه بتحمّل، جرب تاني بعد ثانية'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const t = boqTotals();
  const customer = document.getElementById('boqCustomerName').value.trim();
  const project = document.getElementById('boqProjectName').value.trim();
  const today = new Date().toLocaleDateString('en-GB');
  doc.setFontSize(16); doc.text('Delta IT Solutions — Bill of Quantities', 14, 16);
  doc.setFontSize(10);
  doc.text(`Date: ${today}`, 14, 24);
  if(customer) doc.text(`Customer: ${customer}`, 14, 30);
  if(project) doc.text(`Project: ${project}`, 14, 36);
  doc.autoTable({
    startY: 42,
    head: [['#','Item','Qty','Unit Price','Total']],
    body: rows.map((i,idx)=>[idx+1, i.name, i.qty, Number(i.price).toLocaleString('en-US'), (i.qty*i.price).toLocaleString('en-US')]),
    styles:{font:'helvetica', fontSize:9},
    headStyles:{fillColor:[11,18,32]}
  });
  const y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${t.subtotal.toLocaleString('en-US')} EGP`, 14, y);
  doc.text(`Discount: -${t.discountVal.toLocaleString('en-US')} EGP`, 14, y+6);
  doc.text(`VAT: +${t.vatVal.toLocaleString('en-US')} EGP`, 14, y+12);
  doc.setFontSize(12);
  doc.text(`Grand Total: ${t.grandTotal.toLocaleString('en-US')} EGP`, 14, y+20);
  const notes = document.getElementById('boqNotes').value.trim();
  if(notes) { doc.setFontSize(9); doc.text(doc.splitTextToSize('Notes: '+notes, 180), 14, y+30); }
  doc.save('BOQ.pdf');
}

function boqExportCsv(){
  const rows = boqValidRows();
  if(!rows.length){ alert('ضيف صنف واحد على الأقل قبل التصدير'); return; }
  const t = boqTotals();
  let csv = 'Item,Qty,Unit Price,Total\n';
  rows.forEach(i=>{ csv += `"${(i.name||'').replace(/"/g,'""')}",${i.qty},${i.price},${i.qty*i.price}\n`; });
  csv += `\n,,Subtotal,${t.subtotal}\n,,Discount,-${t.discountVal}\n,,VAT,${t.vatVal}\n,,Grand Total,${t.grandTotal}\n`;
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'BOQ.csv';
  link.click();
}

function boqSendWhatsapp(){
  const rows = boqValidRows();
  if(!rows.length){ alert('ضيف صنف واحد على الأقل قبل الإرسال'); return; }
  const t = boqTotals();
  const lines = ['📑 BOQ من موقع Delta IT Solutions:', ''];
  rows.forEach(i=>lines.push(`- ${i.name} × ${i.qty} = ${(i.qty*i.price).toLocaleString('ar-EG')} ج.م`));
  lines.push('', `الإجمالي بعد الخصم والضريبة: ${t.grandTotal.toLocaleString('ar-EG')} ج.م`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

function initQuoteBuilder(){
  const picker = document.getElementById('qbProductPicker');
  if(picker.dataset.filled !== '1'){
    picker.innerHTML = '<option value="">➕ اختر منتج من الكتالوج لإضافته...</option>' + products.map((p,i)=>`<option value="${i}">${p.name} — ${p.price?Number(p.price).toLocaleString('ar-EG')+' ج.م':''}</option>`).join('');
    picker.onchange = function(){
      if(this.value===''){ return; }
      const p = products[parseInt(this.value)];
      qbItems.push({id:++qbCounter, name:p.name, qty:1, price:Number(p.price)||0});
      this.value='';
      renderQuoteTable();
    };
    picker.dataset.filled = '1';
  }
  if(!qbItems.length) qbAddBlankRow();
  renderQuoteTable();
}
function qbAddBlankRow(){
  qbItems.push({id:++qbCounter, name:'', qty:1, price:0});
  renderQuoteTable();
}
function qbRemoveRow(id){
  qbItems = qbItems.filter(i=>i.id!==id);
  renderQuoteTable();
}
function qbUpdate(id, field, val){
  const item = qbItems.find(i=>i.id===id);
  if(!item) return;
  item[field] = (field==='qty'||field==='price') ? (parseFloat(val)||0) : val;
  renderQuoteTable();
}
function renderQuoteTable(){
  const tbody = document.getElementById('qbRows');
  tbody.innerHTML = qbItems.map(i=>`
    <tr>
      <td><input type="text" value="${i.name.replace(/"/g,'&quot;')}" placeholder="اسم الصنف" oninput="qbUpdate(${i.id},'name',this.value)"></td>
      <td><input type="number" min="1" value="${i.qty}" style="max-width:70px;" oninput="qbUpdate(${i.id},'qty',this.value)"></td>
      <td><input type="number" min="0" value="${i.price}" style="max-width:100px;" oninput="qbUpdate(${i.id},'price',this.value)"></td>
      <td>${(i.qty*i.price).toLocaleString('ar-EG')} ج.م</td>
      <td><button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="qbRemoveRow(${i.id})">✕</button></td>
    </tr>`).join('');
  const total = qbItems.reduce((s,i)=>s+(i.qty*i.price),0);
  document.getElementById('qbGrandTotal').innerText = `${total.toLocaleString('ar-EG')} ج.م`;
}
function qbSendWhatsapp(){
  if(!qbItems.length || qbItems.every(i=>!i.name)){ alert('ضيف صنف واحد على الأقل قبل الإرسال'); return; }
  const total = qbItems.reduce((s,i)=>s+(i.qty*i.price),0);
  const lines = ['🧾 طلب عرض سعر من الموقع:', ''];
  qbItems.filter(i=>i.name).forEach(i=>lines.push(`- ${i.name} × ${i.qty} = ${(i.qty*i.price).toLocaleString('ar-EG')} ج.م`));
  lines.push('', `الإجمالي التقريبي: ${total.toLocaleString('ar-EG')} ج.م`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

/* Builds a proper branded document (logo, quote number, customer, itemized table, totals,
   warranty/validity footer, contact info) inside the hidden #qbPrintDoc, then triggers the
   browser's print dialog. This replaces the old raw window.print() which just printed the
   editable on-screen form with no logo or layout. */
function qbPrintDocument(){
  const rows = qbItems.filter(i => i.name && i.name.trim() !== '');
  if(!rows.length){ alert('ضيف صنف واحد على الأقل قبل الطباعة'); return; }
  const total = rows.reduce((s,i)=>s+(i.qty*i.price),0);
  const customer = (document.getElementById('qbCustomerName').value || '').trim();
  const today = new Date();
  const dateStr = today.toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'});
  const quoteNo = 'DQ-' + today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0') + '-' + String(today.getHours()).padStart(2,'0') + String(today.getMinutes()).padStart(2,'0');

  const logoSvg = `<svg viewBox="0 0 100 100" width="46" height="46"><defs><linearGradient id="logoGradPrint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0098c2"/><stop offset="1" stop-color="#6a4bf0"/></linearGradient></defs><path d="M50 5 L88 19 V48 C88 72 70 88 50 95 C30 88 12 72 12 48 V19 Z" fill="url(#logoGradPrint)"/><circle cx="50" cy="48" r="19" fill="none" stroke="#fff" stroke-width="4"/><circle cx="50" cy="48" r="7" fill="#fff"/><line x1="50" y1="29" x2="50" y2="17" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><line x1="66" y1="38" x2="76" y2="31" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><line x1="34" y1="38" x2="24" y2="31" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="50" cy="15" r="4" fill="#fff"/><circle cx="78" cy="29" r="4" fill="#fff"/><circle cx="22" cy="29" r="4" fill="#fff"/></svg>`;

  const rowsHtml = rows.map(i => `
    <tr>
      <td>${(i.name||'').replace(/</g,'&lt;')}</td>
      <td style="text-align:center;">${i.qty}</td>
      <td style="text-align:center;">${Number(i.price).toLocaleString('ar-EG')} ج.م</td>
      <td style="text-align:center;font-weight:700;">${(i.qty*i.price).toLocaleString('ar-EG')} ج.م</td>
    </tr>`).join('');

  document.getElementById('qbPrintDoc').innerHTML = `
    <div class="qb-doc-head">
      <div class="qb-doc-brand">${logoSvg}<div><b>DELTA IT SOLUTIONS</b><small>PRO SYSTEMS & SECURITY — حلول كاميرات وشبكات متكاملة</small></div></div>
      <div class="qb-doc-meta"><b>رقم العرض:</b> ${quoteNo}<br><b>التاريخ:</b> ${dateStr}<br><b>صالح لمدة:</b> 7 أيام من تاريخه</div>
    </div>
    <div class="qb-doc-title">عرض سعر مبدئي</div>
    ${customer ? `<div class="qb-doc-customer"><b>مقدَّم إلى:</b> ${customer.replace(/</g,'&lt;')}</div>` : ''}
    <table class="qb-doc-table">
      <thead><tr><th>الصنف</th><th style="text-align:center;">الكمية</th><th style="text-align:center;">سعر الوحدة</th><th style="text-align:center;">الإجمالي</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot><tr class="qb-doc-total-row"><td colspan="3">الإجمالي الكلي</td><td style="text-align:center;">${total.toLocaleString('ar-EG')} ج.م</td></tr></tfoot>
    </table>
    <div class="qb-doc-foot">
      <div class="qb-doc-notes">
        • السعر تقريبي وقابل للتعديل حسب المعاينة الفعلية للموقع.<br>
        • جميع المنتجات مشمولة بضمان الشركة المصنّعة أو الموزع المعتمد.<br>
        • مصاريف التركيب والتوصيل غير مشمولة إلا إذا ذُكرت صراحة أعلاه.
      </div>
      <div class="qb-doc-contact">
        <b>للتواصل والاعتماد:</b><br>
        واتساب: ${WHATSAPP_NUMBER.replace(/^20/, '0')}<br>
        Delta IT Solutions
      </div>
    </div>
    <div class="qb-doc-watermark">تم إنشاء هذا العرض إلكترونيًا عبر موقع Delta IT Solutions</div>
  `;
  setTimeout(() => window.print(), 50);
}

/* ================= فلتر أجهزة البصمة والحضور والتحكم في الدخول ================= */
const BIO_BRAND_LIST = ['الكل','ZKTeco','Hikvision','Dahua'];
const BIO_TYPE_LIST = [
  {value:'الكل', label:'الكل'},
  {value:'fingerprint', label:'بصمة إصبع'},
  {value:'face', label:'وجه'},
  {value:'card', label:'كارت'},
  {value:'face_finger', label:'وجه + بصمة'}
];
const BIO_USE_LIST = [
  {value:'الكل', label:'الكل'},
  {value:'attendance', label:'حضور وانصراف'},
  {value:'access', label:'تحكم دخول'},
  {value:'both', label:'الاتنين'}
];
let bioBrandFilter = 'الكل';
let bioTypeFilter = 'الكل';
let bioUseFilter = 'الكل';

