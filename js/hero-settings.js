/* =========================================================================
   hero-settings.js — Phase 2A (prerequisite #3)
   Source of truth: Supabase site_settings, key 'hero_settings' (jsonb).
   localStorage key '__hero_settings_cache' is ONLY a cache so the hero
   doesn't flash unstyled on the next visit while Supabase responds — it is
   always overwritten by the DB value and never written to by the admin UI.
   Safe no-op if sb/Supabase client isn't ready or the hero isn't on the page.
   ========================================================================= */
(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const CACHE_KEY = '__hero_settings_cache';
  const DEFAULTS = {
    height_min: 560, height_pref: 85, height_max: 900, // px, vh, px
    glow: 82,         // % — reduced from 100 by default per Phase 2B (still admin-adjustable up to 160%)
    speed: 100,       // %
    overlay_tint: 0,  // %
    hide_particles: false,
    hide_orbit: false,
    hide_badge: false
  };

  function apply(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    const root = document.documentElement.style;
    root.setProperty('--hero-h-min', s.height_min + 'px');
    root.setProperty('--hero-h-pref', s.height_pref + 'vh');
    root.setProperty('--hero-h-max', s.height_max + 'px');
    root.setProperty('--hero-glow', String(Math.max(0, s.glow) / 100));
    root.setProperty('--hero-speed', String(Math.max(0.25, s.speed) / 100));
    root.setProperty('--hero-overlay-tint', String(Math.max(0, Math.min(60, s.overlay_tint))));
    hero.classList.toggle('hero-hide-particles', !!s.hide_particles);
    hero.classList.toggle('hero-hide-orbit', !!s.hide_orbit);
    hero.classList.toggle('hero-hide-badge', !!s.hide_badge);
  }

  // 1) Paint instantly from cache (if any) to avoid flash-of-default-look.
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached) apply(cached);
  } catch (e) { /* ignore malformed cache */ }

  // 2) Always reconcile against the DB — this is the real source of truth.
  if (typeof sb === 'undefined' || !sb || !sb.from) return;
  sb.from('site_settings').select('value').eq('key', 'hero_settings').maybeSingle()
    .then(({ data }) => {
      const settings = data && data.value ? data.value : null;
      apply(settings);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings || DEFAULTS)); } catch (e) {}
    })
    .catch(() => {});
})();
