/* notifications.js — WhatsApp deep-link helper + structured lead-form submission. */

async function sendStructuredForm(){
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const details = document.getElementById('contactDetails').value.trim();
  if(!name || !details) return alert('برجاء ملء البيانات لتجهيز المقايسة.');
  // honeypot: real users never see/fill this field (hidden via CSS); bots that auto-fill every
  // input on the page will trip it
  const hp = document.getElementById('contactHoneypot');
  if(hp && hp.value.trim()){ return; }
  if(!checkRateLimit('quote_request', 5, 10*60*1000)){
    return alert('محاولات كتير في وقت قصير - برجاء الانتظار كام دقيقة وإعادة المحاولة.');
  }

  // نسجّل الطلب في قاعدة البيانات عشان يبقى عندك سجل يقدر الأدمن يتابعه
  // حتى لو العميل قفل واتساب من غير ما يبعت الرسالة فعليًا
  try{
    await sb.from('quote_requests').insert({ customer_name: name, customer_phone: phone || null, details });
  }catch(e){ console.error('quote_requests insert failed', e); }

  let msg = `🏛️ *طلب معاينة جديد*\n\n*الاسم:* ${name}${phone ? `\n*الهاتف:* ${phone}` : ''}\n*التفاصيل:* ${details}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openGeneralWhatsApp(){
  const msg = "مرحبًا، أرغب في الاستفسار عن أنظمتكم وخدماتكم.";
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

const themeToggleBtn = document.getElementById('themeToggleBtn');
themeToggleBtn.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur==='dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeToggleBtn.setAttribute('aria-checked', next==='dark' ? 'true' : 'false');
  localStorage.setItem('it_theme', next);
});
{
  const savedTheme = localStorage.getItem('it_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.setAttribute('aria-checked', savedTheme==='dark' ? 'true' : 'false');
}

