/* =========================================================
   ملف الإعدادات العام - عدّل هنا فقط
   =========================================================
   1) SUPABASE_URL و SUPABASE_ANON_KEY: هتلاقيهم في مشروعك على
      supabase.com تحت: Project Settings > API
   2) WHATSAPP_NUMBER: رقمك بالكود الدولي بدون + وبدون صفر
      مثال مصر: 201032641038
   ========================================================= */

const SUPABASE_URL = "https://jauawivppggldbnemljv.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_eDn9PSJgWQJp-YF5OP8E4A_R6pG96Xe";

const WHATSAPP_NUMBER = "201032641038";

/* تتبّع الزوار (اختياري) - سيب القيمة فاضية "" لو مش عايز تفعّلها.
   GA4:  من analytics.google.com > Admin > Data Streams > معرف بيبدأ بـ G-...
   Meta Pixel: من Meta Events Manager > معرف رقمي (Pixel ID). */
const GA_MEASUREMENT_ID = "";
const META_PIXEL_ID = "";

/* بيانات التحويل البنكي / إنستاباي - تظهر للعميل كخيار دفع بديل عن الدفع عند الاستلام */
const BANK_DETAILS = {
  bankName: "اسم البنك",
  accountName: "اسم صاحب الحساب",
  accountNumber: "0000000000000",
  iban: "EGxxxxxxxxxxxxxxxxxxxxxxxxxx",
  instapayHandle: "ahmedelsayed7707@instapay",
  vodafoneCash: "01000000000"
};

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
