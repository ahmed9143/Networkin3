/* app.js — shared state, cache helpers, initial Supabase data load, rate limiting.
   Loaded first: every other module reads these globals (products, categories, cart, wishlist, filters). */

let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('it_pro_cart') || '{}');
let wishlist = JSON.parse(localStorage.getItem('it_pro_wishlist') || '[]');
let currentCategoryFilter = 'الكل';
let currentBrandFilter = 'الكل';
let currentSearchQuery = '';
let priceMinFilter = null;
let priceMaxFilter = null;
let appliedCoupon = null;
let currentPayMethod = 'whatsapp_cod';
const DEFAULT_TITLE = "Delta IT Solutions | حلول تقنية متكاملة: كاميرات، شبكات، بصمة، ربط فروع ودعم عن بعد";

const CAT_ICONS = {'كاميرات مراقبة':'📷','أنظمة أمنية':'🛡️','كمبيوتر ولابتوبات':'💻','طابعات':'🖨️','شبكات':'🌐','UPS وحلول الطاقة':'🔋','حلول IT متكاملة':'🖥️','منتجات رقمية':'💾','سكريبتات وأتمتة':'⚙️'};

/* ---------------- كاش بسيط في sessionStorage لتقليل عدد قراءات قاعدة
   البيانات على نفس الجلسة (مفيد جدًا مع خطة Supabase المجانية) ----------------*/
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقائق
function getCached(key){
  try{
    const raw = sessionStorage.getItem(key);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(Date.now() - obj.t > CACHE_TTL_MS) return null;
    return obj.v;
  }catch(e){ return null; }
}
function setCached(key, val){
  try{ sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: val })); }catch(e){ /* تجاهل لو الكاش ممتلئ */ }
}

async function loadData(){
  let catData = getCached('cache_categories');
  let prodData = getCached('cache_products');

  if(!catData || !prodData){
    const [catRes, prodRes] = await Promise.all([
      catData ? Promise.resolve({data:catData}) : sb.from('categories').select('*').order('sort_order',{ascending:true}),
      prodData ? Promise.resolve({data:prodData}) : sb.from('products').select('id,name,description,category,brand,price,old_price,stock,featured,is_bestseller,image_url,images,product_type,created_at,installation_type,connection_type,channels,bio_type,bio_use').order('created_at',{ascending:false})
    ]);
    if(catRes.error || prodRes.error){
      document.getElementById('featuredGrid').innerHTML = '<div class="empty-state">تعذر تحميل البيانات. تأكد من ربط Supabase في ملف config.js</div>';
      console.error(catRes.error, prodRes.error);
      return;
    }
    catData = catRes.data || catData || [];
    prodData = prodRes.data || prodData || [];
    setCached('cache_categories', catData);
    setCached('cache_products', prodData);
  }

  categories = catData || [];
  products = prodData || [];
  renderCatGrid();
  renderFilters();
  renderBrandFilters();
  renderPriceFilter();
  renderFeatured();
  renderBrandStrip();
  renderProducts();
  renderCategoryDistChart();
  updateWishlistUI();
  handleHashRoute();
  loadDownloads();
  renderBioFilters();
  renderBioResults();
}

function checkRateLimit(key, maxAttempts, windowMs){
  const now = Date.now();
  let hits = [];
  try{ hits = JSON.parse(localStorage.getItem('rl_'+key) || '[]'); }catch(e){ hits = []; }
  hits = hits.filter(t => now - t < windowMs);
  if(hits.length >= maxAttempts) return false;
  hits.push(now);
  localStorage.setItem('rl_'+key, JSON.stringify(hits));
  return true;
}

