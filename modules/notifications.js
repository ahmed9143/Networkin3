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

/* Dynamic day/night theme (cont. from the inline <head> script that sets the initial theme
   before paint). Three modes, saved in localStorage 'it_theme_mode':
     - 'auto'  : theme follows local device time (06:00–18:00 light / otherwise dark-cyber),
                 re-checked on load, on tab focus, and every 5 minutes while the tab stays open.
     - 'light' / 'dark' : user forced this theme via the toggle button/long-press; auto stops
                 until the user long-presses the toggle again to go back to 'auto'.
   Single click  -> force the opposite theme of what's showing now (manual override).
   Long press (>550ms) -> reset back to 'auto' mode. */
const themeToggleBtn = document.getElementById('themeToggleBtn');

function computeAutoTheme(){
  const h = new Date().getHours();
  return (h >= 6 && h < 18) ? 'light' : 'dark';
}

function applyTheme(theme, mode){
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme-mode', mode);
  themeToggleBtn.setAttribute('aria-checked', theme==='dark' ? 'true' : 'false');
  themeToggleBtn.title = mode==='auto'
    ? `الوضع تلقائي (${theme==='dark' ? 'ليلي/Cyber الآن' : 'نهاري الآن'}) - كليك للتبديل اليدوي، اضغط مطولاً للرجوع للتلقائي`
    : `الوضع يدوي: ${theme==='dark' ? 'ليلي/Cyber' : 'نهاري'} - اضغط مطولاً للرجوع للوضع التلقائي`;
}

function refreshTheme(){
  const mode = localStorage.getItem('it_theme_mode') || 'auto';
  const theme = mode === 'auto' ? computeAutoTheme() : mode;
  applyTheme(theme, mode);
}

let themePressTimer = null;
let themeLongPressed = false;

themeToggleBtn.addEventListener('pointerdown', ()=>{
  themeLongPressed = false;
  themePressTimer = setTimeout(()=>{
    themeLongPressed = true;
    localStorage.setItem('it_theme_mode', 'auto');
    refreshTheme();
  }, 550);
});
['pointerup','pointerleave','pointercancel'].forEach(ev=>{
  themeToggleBtn.addEventListener(ev, ()=> clearTimeout(themePressTimer));
});
themeToggleBtn.addEventListener('click', ()=>{
  if(themeLongPressed){ themeLongPressed = false; return; } // long-press already handled it
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur==='dark' ? 'light' : 'dark';
  localStorage.setItem('it_theme_mode', next);
  applyTheme(next, next);
});

refreshTheme();
// Keep auto mode in sync with real time while the tab is open (e.g. left open across sunset).
setInterval(()=>{ if((localStorage.getItem('it_theme_mode')||'auto')==='auto') refreshTheme(); }, 5*60*1000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) refreshTheme(); });

