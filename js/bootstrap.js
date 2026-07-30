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
  document.getElementById('menuToggle').addEventListener('click', ()=>{
    const isOpen = document.getElementById('catNavMenu').classList.toggle('mobile-open');
    document.getElementById('menuToggle').classList.toggle('open', isOpen);
    document.body.classList.toggle('mobile-nav-open', isOpen); // hides the WhatsApp float button while the menu covers the screen
  });

  // Mobile category menu: turn each section into an accordion instead of dumping
  // every section open at once (which used to render as one long unstyled list).
  // Desktop (hover-driven mega menu) is untouched — this only wires clicks, and the
  // CSS that collapses panels by default only applies at <=980px.
  document.getElementById('catNavMenu').addEventListener('click', (e)=>{
    if(window.innerWidth > 980) return; // desktop uses hover, not click
    const label = e.target.closest('.mega-trigger > a.nav-drop-label');
    if(!label) return;
    e.preventDefault();
    const trigger = label.closest('.mega-trigger');
    const wasOpen = trigger.classList.contains('open');
    // close any sibling sections so the list stays short and scannable
    trigger.parentElement.querySelectorAll('.mega-trigger.open').forEach(t=>{ if(t!==trigger) t.classList.remove('open'); });
    trigger.classList.toggle('open', !wasOpen);
  });

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
