/* bootstrap.js — DOMContentLoaded wiring: cart/wishlist drawers, initial data load, effect init calls.
   MUST load after every other module (references functions defined in all of them). */

document.addEventListener('DOMContentLoaded', ()=>{
  loadData();
  updateCartUI();
  const headerPhoneNum = document.getElementById('headerPhoneNum');
  if(headerPhoneNum && typeof WHATSAPP_NUMBER !== 'undefined'){
    headerPhoneNum.textContent = WHATSAPP_NUMBER.replace(/^20/, '0');
  }
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  document.getElementById('cartTriggerBtn').addEventListener('click', ()=>{ drawer.classList.add('open'); overlay.classList.add('open'); });
  document.getElementById('closeCartBtn').addEventListener('click', ()=>{ drawer.classList.remove('open'); overlay.classList.remove('open'); });
  overlay.addEventListener('click', ()=>{ drawer.classList.remove('open'); overlay.classList.remove('open'); });
  document.getElementById('checkoutWhatsappBtn').addEventListener('click', startCheckout);
  document.getElementById('menuToggle').addEventListener('click', ()=>{ document.getElementById('catNavMenu').classList.toggle('mobile-open'); document.getElementById('menuToggle').classList.toggle('open'); });

  document.getElementById('wishlistTriggerBtn').addEventListener('click', openWishlistDrawer);
  document.getElementById('closeWishlistBtn').addEventListener('click', closeWishlistDrawer);
  document.getElementById('wishlistOverlay').addEventListener('click', closeWishlistDrawer);

  document.getElementById('quickViewOverlay').addEventListener('click', (e)=>{ if(e.target.id === 'quickViewOverlay') closeQuickView(); });

  initRevealAnimations();
  initCountUp();
  initScrollProgress();
  initCursorGlow();
});

/* ---------------- Phase 5: top scroll-progress bar ---------------- */
