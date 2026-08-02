/* =========================================================================
   BANNER ENGINE — replaces the old plain-image promo slider.
   ------------------------------------------------------------------------
   Every banner is a full "card": title, subtitle, badge, primary + secondary
   CTA, background image OR video, floating product image, accent color,
   dark overlay %, layout, background effect, priority, schedule window,
   and an optional A/B test group.

   Data source: unchanged — Supabase `site_settings`, key 'hero_banners',
   a jsonb array. Edited from admin.html ("🎛️ إعدادات الموقع" ->
   "بنرات العروض الرئيسية"). Old-style entries ({ image, link, alt }) are
   still fully supported and render as a simple minimal-layout card, so
   nothing that was already saved ever breaks.

   Analytics: every render logs a 'view' event, every click logs a 'click'
   event, to public.banner_events (see supabase-migration-005-banner-engine.sql).
   Read back in admin.html as Views / Clicks / CTR per banner + per A/B group.
   ========================================================================= */
(function(){
  const root  = document.getElementById('promoBannerSlider');
  const track = document.getElementById('pbsTrack');
  const prevBtn = document.getElementById('pbsPrev');
  const nextBtn = document.getElementById('pbsNext');
  if(!root || !track || typeof sb === 'undefined' || !sb || !sb.from) return;

  /* ---------- small helpers ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function uid(){ return 'b_' + Math.random().toString(36).slice(2,9); }
  function deviceBucket(){
    const w = window.innerWidth;
    return w < 640 ? 'mobile' : (w < 1024 ? 'tablet' : 'desktop');
  }
  /* background_image may be a plain URL string (legacy / product/floating
     images) OR { mobile, tablet, desktop } (new responsive banner uploads —
     see hbUploadResponsiveImage in admin.html). This picks the right one for
     <img src>, and builds a srcset so the browser can also correct for DPR/
     zoom without waiting on JS. */
  function pickImg(v){
    if(!v) return '';
    if(typeof v === 'object') return v[deviceBucket()] || v.desktop || v.tablet || v.mobile || '';
    return v;
  }
  function srcsetFor(v){
    if(!v || typeof v !== 'object') return '';
    return [
      v.mobile  ? `${v.mobile} 640w`   : '',
      v.tablet  ? `${v.tablet} 1200w`  : '',
      v.desktop ? `${v.desktop} 1920w` : ''
    ].filter(Boolean).join(', ');
  }
  function sessionId(){
    try{
      let s = sessionStorage.getItem('__banner_sid');
      if(!s){ s = uid() + Date.now().toString(36); sessionStorage.setItem('__banner_sid', s); }
      return s;
    }catch(e){ return 'no-session'; }
  }

  /* Category -> auto theme accent color (used only when the admin hasn't set
     a custom accent_color on the banner). Kept intentionally small/opinionated. */
  const CATEGORY_THEME = {
    'networking': '#2F7BFF', 'شبكات': '#2F7BFF',
    'cctv': '#0EA5E9', 'كاميرات': '#0EA5E9',
    'access': '#7C3AED', 'access control': '#7C3AED', 'دخول': '#7C3AED',
    'fire': '#F59E0B', 'fire alarm': '#F59E0B', 'حريق': '#F59E0B',
    'servers': '#10B981', 'سيرفرات': '#10B981'
  };
  function themeFor(b){
    if(b.accent_color) return b.accent_color;
    const cat = String(b.category || '').toLowerCase().trim();
    return CATEGORY_THEME[cat] || '#2F7BFF';
  }

  /* Normalize a raw stored banner (old or new shape) into the full schema
     the renderer expects, filling sane defaults. */
  function normalize(raw){
    const legacy = raw && raw.image && !raw.background_image;
    return {
      id: raw.id || uid(),
      title: raw.title || '',
      subtitle: raw.subtitle || '',
      badge: raw.badge || '',
      cta_primary: raw.cta_primary || (raw.link ? { label: 'تسوق الآن', link: raw.link } : null),
      cta_secondary: raw.cta_secondary || null,
      background_image: raw.background_image || raw.image || '',
      background_video: raw.background_video || '',
      product_image: raw.product_image || '',
      alt: raw.alt || raw.title || 'عرض',
      category: raw.category || '',
      accent_color: raw.accent_color || '',
      overlay: (raw.overlay != null ? Number(raw.overlay) : 45),
      layout: raw.layout || (legacy ? 'minimal' : 'split'),
      effect: raw.effect || 'gradient',
      priority: raw.priority != null ? Number(raw.priority) : 0,
      start_date: raw.start_date || null,
      end_date: raw.end_date || null,
      duration: raw.duration ? Number(raw.duration) : 5,
      active: raw.active !== false,
      ab_test_id: raw.ab_test_id || null,
      ab_group: raw.ab_group || null,
      countdown_target: raw.countdown_target || null,
      countdown_label: raw.countdown_label || 'العرض ينتهي خلال',
      text_align: raw.text_align || '',
      content_width: raw.content_width != null && raw.content_width !== '' ? Number(raw.content_width) : 0,
      product_position: raw.product_position || '',
      product_x: raw.product_x != null && raw.product_x !== '' ? Number(raw.product_x) : null,
      product_y: raw.product_y != null && raw.product_y !== '' ? Number(raw.product_y) : null,
      animation: raw.animation || 'fade',
      theme_preset: raw.theme_preset || 'dark',
      mobile_layout: raw.mobile_layout || 'stack'
    };
  }

  function isLive(b){
    if(!b.active) return false;
    const now = Date.now();
    if(b.start_date && now < new Date(b.start_date).getTime()) return false;
    if(b.end_date && now > new Date(b.end_date + 'T23:59:59').getTime()) return false;
    return true;
  }

  /* A/B testing: if two banners share ab_test_id with ab_group 'a'/'b',
     visitor is bucketed once (persisted) and only ever sees their group. */
  function abBucket(testId){
    try{
      const key = '__ab_' + testId;
      let g = localStorage.getItem(key);
      if(!g){ g = Math.random() < 0.5 ? 'a' : 'b'; localStorage.setItem(key, g); }
      return g;
    }catch(e){ return Math.random() < 0.5 ? 'a' : 'b'; }
  }

  function applyABFilter(list){
    const groups = {};
    list.forEach(b => { if(b.ab_test_id) (groups[b.ab_test_id] = groups[b.ab_test_id] || []).push(b); });
    return list.filter(b => {
      if(!b.ab_test_id) return true;
      const my = abBucket(b.ab_test_id);
      return b.ab_group === my || !groups[b.ab_test_id].some(x => x.ab_group === my);
    });
  }

  function logEvent(b, type){
    sb.from('banner_events').insert({
      banner_id: b.id, event_type: type, ab_group: b.ab_group || null,
      device: deviceBucket(), session_id: sessionId(), page: 'home'
    }).then(()=>{}, ()=>{});
  }

  /* ---------- effect layer (pure CSS/SVG, picked via data-effect) ---------- */
  function effectMarkup(effect){
    switch(effect){
      case 'particles': return '<span class="bnr-fx bnr-fx-particles"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
      case 'grid':       return '<span class="bnr-fx bnr-fx-grid"></span>';
      case 'glow':        return '<span class="bnr-fx bnr-fx-glow"></span>';
      case 'sweep':        return '<span class="bnr-fx bnr-fx-sweep"></span>';
      case 'circuit':        return '<span class="bnr-fx bnr-fx-circuit"></span>';
      case 'network':          return '<span class="bnr-fx bnr-fx-network"></span>';
      case 'hexagon':            return '<span class="bnr-fx bnr-fx-hexagon"></span>';
      case 'dots':                 return '<span class="bnr-fx bnr-fx-dots"></span>';
      case 'gradient':
      default:                     return '<span class="bnr-fx bnr-fx-gradient"></span>';
    }
  }

  /* Enterprise countdown block — pure HTML/CSS, ticked client-side every
     second by tickCountdowns(). Renders 4 flip-style unit cells. Hidden
     automatically once the target time has passed. */
  function countdownMarkup(b){
    if(!b.countdown_target) return '';
    const t = new Date(b.countdown_target).getTime();
    if(!t || isNaN(t) || t <= Date.now()) return '';
    return `
      <div class="bnr-countdown" data-target="${t}">
        ${b.countdown_label ? `<span class="bnr-countdown-label">${esc(b.countdown_label)}</span>` : ''}
        <div class="bnr-countdown-units">
          <div class="bnr-cd-cell" data-unit="d"><span class="bnr-cd-num">00</span><span class="bnr-cd-key">يوم</span></div>
          <div class="bnr-cd-cell" data-unit="h"><span class="bnr-cd-num">00</span><span class="bnr-cd-key">ساعة</span></div>
          <div class="bnr-cd-cell" data-unit="m"><span class="bnr-cd-num">00</span><span class="bnr-cd-key">دقيقة</span></div>
          <div class="bnr-cd-cell" data-unit="s"><span class="bnr-cd-num">00</span><span class="bnr-cd-key">ثانية</span></div>
        </div>
      </div>`;
  }

  function tickCountdowns(){
    document.querySelectorAll('.bnr-countdown').forEach(el => {
      const target = Number(el.dataset.target);
      const diff = target - Date.now();
      if(diff <= 0){ el.classList.add('bnr-countdown-ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = n => String(n).padStart(2,'0');
      const dEl = el.querySelector('[data-unit="d"] .bnr-cd-num');
      const hEl = el.querySelector('[data-unit="h"] .bnr-cd-num');
      const mEl = el.querySelector('[data-unit="m"] .bnr-cd-num');
      const sEl = el.querySelector('[data-unit="s"] .bnr-cd-num');
      if(dEl) dEl.textContent = pad(d);
      if(hEl) hEl.textContent = pad(h);
      if(mEl) mEl.textContent = pad(m);
      if(sEl) sEl.textContent = pad(s);
    });
  }
  setInterval(tickCountdowns, 1000);

  function ctaMarkup(b){
    let html = '';
    if(b.cta_primary && b.cta_primary.label){
      html += `<button class="btn btn-cta bnr-cta bnr-cta-primary" data-action="${esc(b.cta_primary.link||'')}">${esc(b.cta_primary.label)}</button>`;
    }
    if(b.cta_secondary && b.cta_secondary.label){
      html += `<button class="btn btn-outline bnr-cta bnr-cta-secondary" data-action="${esc(b.cta_secondary.link||'')}">${esc(b.cta_secondary.label)}</button>`;
    }
    return html ? `<div class="bnr-ctas">${html}</div>` : '';
  }

  function cardMarkup(b, i){
    const accent = themeFor(b);
    const hasBg = !!b.background_video || !!b.background_image;
    const bgSrc = pickImg(b.background_image);
    const bgSrcset = srcsetFor(b.background_image);
    const bgLayer = b.background_video
      ? `<video class="bnr-bg-media" autoplay muted loop playsinline preload="${i===0?'auto':'none'}" poster="${esc(bgSrc)}"><source src="${esc(b.background_video)}" type="video/mp4"></video>`
      : (bgSrc ? `<img class="bnr-bg-media" src="${esc(bgSrc)}" ${bgSrcset?`srcset="${esc(bgSrcset)}" sizes="100vw"`:''} alt="${esc(b.alt)}" loading="${i===0?'eager':'lazy'}" fetchpriority="${i===0?'high':'low'}">` : '');
    const badge = b.badge ? `<span class="bnr-badge">${esc(b.badge)}</span>` : '';
    // No product PNG uploaded -> product area simply doesn't render (background still shows full width).
    const product = b.product_image ? `<div class="bnr-product"><img src="${esc(b.product_image)}" alt="${esc(b.title||'منتج')}" loading="lazy"></div>` : '';
    const cssVars = [
      `--bnr-accent:${esc(accent)}`,
      b.content_width ? `--bnr-content-w:${Math.max(20,Math.min(100,b.content_width))}%` : '',
      (b.product_position === 'custom' && b.product_x != null) ? `--bnr-product-x:${b.product_x}%` : '',
      (b.product_position === 'custom' && b.product_y != null) ? `--bnr-product-y:${b.product_y}%` : ''
    ].filter(Boolean).join(';');
    const dataAttrs = [
      `data-id="${esc(b.id)}"`,
      `data-animation="${esc(b.animation||'fade')}"`,
      `data-theme="${esc(b.theme_preset||'dark')}"`,
      `data-mobile-layout="${esc(b.mobile_layout||'stack')}"`,
      b.text_align ? `data-align="${esc(b.text_align)}"` : '',
      b.product_position ? `data-product-pos="${esc(b.product_position)}"` : ''
    ].filter(Boolean).join(' ');
    return `
      <div class="pbs-slide bnr-card bnr-layout-${esc(b.layout)}" ${dataAttrs} style="${cssVars};">
        <div class="bnr-skeleton"></div>
        <div class="bnr-bg-wrap">${bgLayer}<span class="bnr-overlay" style="--bnr-overlay-a:${Math.max(0,Math.min(100,b.overlay))/100}"></span></div>
        ${effectMarkup(b.effect)}
        <div class="bnr-content">
          ${badge}
          ${b.title ? `<h3 class="bnr-title">${esc(b.title)}</h3>` : ''}
          ${b.subtitle ? `<p class="bnr-subtitle">${esc(b.subtitle)}</p>` : ''}
          ${countdownMarkup(b)}
          ${ctaMarkup(b)}
        </div>
        ${product}
      </div>`;
  }

  /* ---------- state + engine ---------- */
  let banners = [];
  let idx = 0;
  let timer = null;
  let progressStart = 0;
  let paused = false;

  function go(action){
    if(!action) return;
    if(/^https?:\/\//i.test(action)) window.open(action, '_blank');
    else if(typeof navigateTo === 'function') navigateTo(action);
  }

  function buildProgressBar(){
    const host = document.getElementById('pbsDots');
    if(!host) return;
    host.className = 'pbs-progress';
    host.innerHTML = banners.map((b,i) => `<span class="pbs-progress-seg" data-i="${i}"><i style="animation-duration:${b.duration}s;"></i></span>`).join('');
  }

  function markActiveSlide(){
    document.querySelectorAll('#pbsTrack .pbs-slide').forEach((el,i)=>el.classList.toggle('active', i===idx));
    document.querySelectorAll('#pbsDots .pbs-progress-seg').forEach((el,i)=>{
      el.classList.toggle('done', i < idx);
      el.classList.toggle('active', i === idx);
      const bar = el.querySelector('i');
      if(bar){ bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = i===idx ? `pbsFill ${banners[i].duration}s linear forwards` : 'none'; }
    });
  }

  function update(track){
    track.style.transform = `translateX(${idx * -100}%)`;
    markActiveSlide();
    const b = banners[idx];
    if(b) logEvent(b, 'view');
    // preload the *next* slide's media just before it's needed
    const next = banners[(idx+1) % banners.length];
    const nextSrc = next && pickImg(next.background_image);
    if(nextSrc){ const im = new Image(); im.src = nextSrc; }
  }

  function next(){ idx = (idx+1) % banners.length; update(track); }
  function prev(){ idx = (idx-1+banners.length) % banners.length; update(track); }
  function restart(){
    if(timer) clearTimeout(timer);
    if(paused || banners.length < 2) return;
    const b = banners[idx];
    timer = setTimeout(next, (b.duration||5) * 1000);
  }

  function render(){
    banners.sort((a,b)=> (b.priority||0) - (a.priority||0));
    track.innerHTML = banners.map(cardMarkup).join('');
    tickCountdowns();
    buildProgressBar();
    root.classList.toggle('has-banners', banners.length > 0);
    root.setAttribute('aria-hidden', banners.length ? 'false' : 'true');
    root.classList.remove('loading');
    if(prevBtn && nextBtn){
      const show = banners.length > 1;
      prevBtn.style.display = show ? 'flex' : 'none';
      nextBtn.style.display = show ? 'flex' : 'none';
    }
    idx = 0;
    update(track);
    restart();
  }
  if(prevBtn) prevBtn.addEventListener('click', (e)=>{ e.stopPropagation(); prev(); restart(); });
  if(nextBtn) nextBtn.addEventListener('click', (e)=>{ e.stopPropagation(); next(); restart(); });

  // clicks: CTA buttons + whole-card fallback + progress segments (manual nav)
  root.addEventListener('click', (e) => {
    const seg = e.target.closest('.pbs-progress-seg');
    if(seg){ idx = Number(seg.dataset.i)||0; update(track); restart(); return; }
    const cta = e.target.closest('.bnr-cta');
    const card = e.target.closest('.bnr-card');
    if(cta || card){
      const action = cta ? cta.dataset.action : (banners.find(b=>b.id===card.dataset.id)||{}).cta_primary?.link;
      const b = banners.find(b => b.id === card.dataset.id);
      if(b) logEvent(b, 'click');
      go(action);
    }
  });
  root.addEventListener('mouseenter', ()=>{ paused = true; if(timer) clearTimeout(timer); });
  root.addEventListener('mouseleave', ()=>{ paused = false; restart(); });

  // swipe gestures (mobile)
  let touchX = null;
  track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive:true });
  track.addEventListener('touchend', e => {
    if(touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if(Math.abs(dx) > 40){ dx < 0 ? next() : prev(); restart(); }
    touchX = null;
  }, { passive:true });

  window.addEventListener('resize', () => { /* layout is fluid via clamp(), nothing to recompute */ });

  root.classList.add('loading'); // skeleton shows until data resolves

  sb.from('site_settings').select('value').eq('key','hero_banners').maybeSingle()
    .then(({ data }) => {
      const list = data && Array.isArray(data.value) ? data.value.filter(b => b && (b.image || b.background_image || b.background_video)) : [];
      if(!list.length){ root.classList.remove('loading'); return; } // section stays hidden
      banners = applyABFilter(list.map(normalize).filter(isLive));
      if(!banners.length){ root.classList.remove('loading'); return; }
      setTimeout(()=>{ root.classList.add('show'); document.body.classList.add('has-promo'); render(); }, 100);
    })
    .catch(()=>{ root.classList.remove('loading'); });
})();
