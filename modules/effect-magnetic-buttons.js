/* effect-magnetic-buttons.js — magnetic hover pull on .magnetic CTA buttons. Unmodified. */
/* ================= PHASE 1 — DESIGN SYSTEM BEHAVIOR (additive, safe) ================= */
(function(){
  // NOTE: scroll-reveal already exists in this site (initRevealAnimations(), see main script) —
  // intentionally NOT duplicating it here to avoid two competing observers on the same .reveal elements.

  // Magnetic buttons: primary CTAs pull slightly toward the cursor
  var strength = 14;
  var reduceMotionMag = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotionMag) return;

  var magEls = Array.prototype.slice.call(document.querySelectorAll('.magnetic'));
  var lastX = -9999, lastY = -9999, ticking = false;

  function updateMagnets(){
    ticking = false;
    magEls.forEach(function(el){
      var r = el.getBoundingClientRect();
      if(!r.width || !r.height) return; // hidden/zero-size elements: skip, avoids NaN transforms
      var cx = r.left + r.width/2, cy = r.top + r.height/2;
      var dx = lastX - cx, dy = lastY - cy;
      var dist = Math.hypot(dx,dy);
      if(dist < r.width * 1.4){
        var clampedX = Math.max(-strength, Math.min(strength, dx/r.width*strength));
        var clampedY = Math.max(-strength, Math.min(strength, dy/r.height*strength));
        el.style.transform = 'translate('+clampedX+'px,'+clampedY+'px)';
      } else if(el.style.transform){
        el.style.transform = '';
      }
    });
  }
  document.addEventListener('mousemove', function(e){
    lastX = e.clientX; lastY = e.clientY;
    if(!ticking){ ticking = true; requestAnimationFrame(updateMagnets); }
  }, {passive:true});
  // re-scan on resize in case CTA buttons are added/removed dynamically (e.g. page navigation)
  window.addEventListener('resize', function(){ magEls = Array.prototype.slice.call(document.querySelectorAll('.magnetic')); }, {passive:true});
})();
