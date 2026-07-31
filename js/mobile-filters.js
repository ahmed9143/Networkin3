/* mobile-filters.js — Phase 1 (Mobile Redesign)
   Controls the filters bottom-sheet on the products (catalog) page for mobile/tablet.
   Desktop is untouched: the panel is only ever visually a sheet under the
   `.catalog-layout` mobile CSS in css/mobile-redesign.css (max-width:980px).
   Safe no-ops if the catalog markup isn't present on a given page. */
(function () {
  'use strict';

  function els() {
    return {
      panel: document.getElementById('filtersPanel'),
      backdrop: document.getElementById('filtersBackdrop'),
      toggleBtn: document.getElementById('filtersToggleBtn'),
      body: document.body
    };
  }

  function isMobileLayout() {
    return window.matchMedia('(max-width:980px)').matches;
  }

  window.toggleMobileFilters = function (open) {
    var e = els();
    if (!e.panel) return;

    // On desktop/tablet-wide layouts the panel is always inline (no sheet) — ignore.
    if (open && !isMobileLayout()) return;

    var willOpen = typeof open === 'boolean' ? open : !e.panel.classList.contains('is-open');

    e.panel.classList.toggle('is-open', willOpen);
    if (e.backdrop) e.backdrop.classList.toggle('is-open', willOpen);
    if (e.toggleBtn) e.toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    e.body.classList.toggle('filters-sheet-open', willOpen);

    if (willOpen && e.panel) {
      // Move focus into the sheet for accessibility.
      var closeBtn = e.panel.querySelector('.filters-panel-close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    } else if (e.toggleBtn) {
      e.toggleBtn.focus({ preventScroll: true });
    }
  };

  // Close on ESC.
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      var panel = document.getElementById('filtersPanel');
      if (panel && panel.classList.contains('is-open')) window.toggleMobileFilters(false);
    }
  });

  // If the viewport is resized/rotated past the mobile breakpoint while the
  // sheet is open (e.g. tablet rotation to landscape-wide), close it so it
  // doesn't get stuck as an overlay on a layout that no longer needs it.
  window.addEventListener('resize', function () {
    if (!isMobileLayout()) window.toggleMobileFilters(false);
  });

  // Reflect the active filter count on the toggle button badge, if the
  // product filtering module exposes active filter buttons via .active class.
  function refreshFilterBadge() {
    var count = document.querySelectorAll(
      '#filtersBar .filter-btn.active, #brandFilterBar .filter-btn.active'
    ).length;
    var badge = document.getElementById('filtersToggleCount');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  var panelBody = document.querySelector('.filters-panel-body');
  if (panelBody && window.MutationObserver) {
    new MutationObserver(refreshFilterBadge).observe(panelBody, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true
    });
  }
})();
