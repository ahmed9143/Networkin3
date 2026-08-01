/* ai-drawing-reader.js — embedded "قارئ المخططات الذكي (AI)" tool inside the Smart Tools Hub.
   Renders an uploaded AutoCAD PDF to an image and sends it to the Supabase Edge Function
   "analyze-drawing" (see /supabase/functions/analyze-drawing) which proxies to a vision AI model.
   Reuses the site-wide `sb` client, `products` catalog and `cart` object instead of duplicating them. */

let adrReady = false;
let adrSelectedFile = null;
let adrRenderedImageDataUrl = null;
let adrLastAnalysis = null;

function adrInit(){
  if(adrReady) return;
  adrReady = true;

  if(typeof pdfjsLib !== 'undefined'){
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const dropzone = document.getElementById('adrDropzone');
  const fileInput = document.getElementById('adrFileInput');
  const analyzeBtn = document.getElementById('adrAnalyzeBtn');

  document.getElementById('adrWaBtn').href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('مرحبًا، عايز معاينة هندسية بعد تحليل مخطط بالذكاء الاصطناعي');

  ['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if(f) adrHandleFile(f); });
  fileInput.addEventListener('change', e => { const f = e.target.files[0]; if(f) adrHandleFile(f); });
  document.getElementById('adrRemoveFile').addEventListener('click', e => { e.preventDefault(); adrResetFile(); });

  analyzeBtn.addEventListener('click', async () => {
    if(!adrRenderedImageDataUrl) return;
    document.getElementById('adrErrorBox').classList.remove('show');
    document.getElementById('adrResultBox').classList.remove('show');
    document.getElementById('adrLoadingBox').classList.add('show');
    analyzeBtn.disabled = true;

    try{
      const base64 = adrRenderedImageDataUrl.split(',')[1];
      const { data, error } = await sb.functions.invoke('analyze-drawing', {
        body: { image_base64: base64, mime_type: 'image/png' }
      });
      if(error) throw error;
      if(!data || data.error) throw new Error(data && data.error || 'استجابة غير صالحة');
      adrRenderAnalysis(data);
    }catch(err){
      console.error(err);
      adrShowError('تعذر الاتصال بخدمة التحليل الذكي حاليًا. ممكن تتواصل معانا وهنحلل المخطط يدويًا.');
    }finally{
      document.getElementById('adrLoadingBox').classList.remove('show');
      analyzeBtn.disabled = false;
    }
  });

  document.getElementById('adrAddAllToCart').addEventListener('click', () => {
    if(!adrLastAnalysis) return;
    let added = 0;
    (adrLastAnalysis.suggested_devices||[]).forEach(s => {
      const match = adrFindBestProduct(s.keywords || [s.label]);
      if(match){ adrAddToCart(match.id, s.qty || 1); added++; }
    });
    if(added){ alert('✅ اتضاف ' + added + ' صنف للسلة بناءً على تحليل المخطط.'); document.getElementById('cartTriggerBtn').click(); }
    else{ alert('محتاجين نراجع المنتجات المطابقة يدويًا — تواصل معانا وهنجهزلك عرض سعر.'); }
  });
}

function adrFindBestProduct(keywords){
  const kws = (keywords||[]).map(k=>String(k).toLowerCase());
  return (typeof products !== 'undefined' ? products : []).find(p=>{
    const hay = `${p.name||''} ${p.category||''} ${p.brand||''}`.toLowerCase();
    return kws.some(k=>hay.includes(k));
  }) || null;
}

/* Adds straight to the site-wide cart object and reuses cart.js's own persistence/refresh logic,
   instead of duplicating the localStorage read/write. */
function adrAddToCart(id, qty){
  qty = qty || 1;
  cart[id] = (cart[id] || 0) + qty;
  saveCartAndRefresh();
}

function adrResetFile(){
  adrSelectedFile = null; adrRenderedImageDataUrl = null;
  document.getElementById('adrFileInput').value = '';
  document.getElementById('adrPreviewRow').style.display = 'none';
  document.getElementById('adrAnalyzeBtn').disabled = true;
  document.getElementById('adrErrorBox').classList.remove('show');
  document.getElementById('adrResultBox').classList.remove('show');
}

async function adrHandleFile(f){
  document.getElementById('adrErrorBox').classList.remove('show');
  if(f.type !== 'application/pdf'){ adrShowError('لازم الملف يكون بصيغة PDF (تصدير من AutoCAD كـ PDF).'); return; }
  if(f.size > 20*1024*1024){ adrShowError('حجم الملف أكبر من 20 ميجا.'); return; }
  adrSelectedFile = f;
  document.getElementById('adrPreviewName').textContent = f.name;
  document.getElementById('adrPreviewSize').textContent = (f.size/1024/1024).toFixed(2) + ' MB';

  try{
    adrRenderedImageDataUrl = await adrRenderPdfFirstPageToImage(f);
    document.getElementById('adrPreviewThumb').src = adrRenderedImageDataUrl;
    document.getElementById('adrPreviewRow').style.display = 'flex';
    document.getElementById('adrAnalyzeBtn').disabled = false;
  }catch(err){
    adrShowError('تعذر قراءة ملف الـPDF. تأكد إنه مش تالف وحاول تاني.');
    console.error(err);
  }
}

/* Render the first page of the uploaded PDF to a PNG data URL, so we can send a real
   raster image of the drawing to the vision model (AutoCAD PDFs are usually vector/text). */
async function adrRenderPdfFirstPageToImage(file){
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const scale = 2.2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

function adrShowError(msg){
  const box = document.getElementById('adrErrorBox');
  box.textContent = '⚠️ ' + msg;
  box.classList.add('show');
}

function adrRenderAnalysis(data){
  adrLastAnalysis = data;
  document.getElementById('adrStatRooms').textContent = data.room_count ?? '-';
  document.getElementById('adrStatCams').textContent = data.suggested_camera_count ?? '-';
  document.getElementById('adrStatNet').textContent = data.suggested_network_points ?? '-';
  document.getElementById('adrStatArea').textContent = data.estimated_area_sqm ? (data.estimated_area_sqm + ' م²') : 'غير محدد';

  const roomList = document.getElementById('adrRoomList');
  roomList.innerHTML = (data.rooms||[]).map(r => `<span class="adr-room-chip">${adrEscapeHtml(r.name || r)}${r.cameras_suggested ? ' · 📷 ' + r.cameras_suggested : ''}</span>`).join('') || '<span class="adr-room-chip">لم يتم تمييز غرف بدقة — راجع المخطط يدويًا</span>';

  const deviceListEl = document.getElementById('adrDeviceList');
  let total = 0;
  const suggestions = data.suggested_devices || [];
  deviceListEl.innerHTML = suggestions.map(s => {
    const match = adrFindBestProduct(s.keywords || [s.label]);
    const unitPrice = match ? (match.price || 0) : 0;
    const lineTotal = unitPrice * (s.qty || 1);
    total += lineTotal;
    return `<div class="adr-device-row">
      <div><div class="adr-dn">${adrEscapeHtml(s.label)}</div><div class="adr-dl">${match ? adrEscapeHtml(match.name) : 'يحتاج تحديد من فريقنا'}</div></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="adr-price">${match ? (unitPrice.toLocaleString('ar-EG') + ' ج.م × ' + (s.qty||1)) : ''}</span>
        <span class="adr-qty">× ${s.qty || 1}</span>
      </div>
    </div>`;
  }).join('') || '<div class="adr-device-row">لا توجد اقتراحات — جرب رفع مخطط أوضح.</div>';

  document.getElementById('adrTotalPrice').textContent = total ? (total.toLocaleString('ar-EG') + ' ج.م') : 'يحتاج تسعير من فريقنا';
  document.getElementById('adrResultBox').classList.add('show');
}

function adrEscapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
