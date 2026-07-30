## 2026-07-30 — Mobile UI/UX fix pass

Fixed 5 confirmed mobile-only rendering/interaction bugs (reported with on-device
screenshots), see IMPLEMENTATION_LOG.md style notes inline in each diff:

1. **Hero heading bidi mixing** — `index.html`, `css/styles.css`
   Split the merged English/Arabic `<h1>` text into two `unicode-bidi: isolate`d
   lines and removed a duplicate/conflicting process-flow line that collided with
   the `.hero-flow` pills.
2. **Mobile category menu** — `css/styles.css`, `index.html`, `js/bootstrap.js`
   Replaced the unstyled, fully-expanded flat list with a per-section accordion
   (styled rows, one section open at a time, scrollable within the viewport
   instead of stretching the whole page). Also fixed "الحلول" being a dead tap on
   mobile (its only content was a desktop-only showcase panel) by adding a mobile
   fallback list.
3. **WhatsApp floating button** — `css/styles.css`, `js/bootstrap.js`, `modules/router.js`
   Moved to a proper class with safe-area padding; now fades out while the mobile
   menu is open instead of sitting on top of unreachable menu rows.
4. **Promo bar overlap** — `css/styles.css`, `modules/effect-it-ops-canvas.js`
   Bar height is now measured live (`ResizeObserver` → `--promo-h` CSS var) instead
   of a hardcoded `top:52px` guess, so page content below it is never covered
   regardless of offer text length.
5. **Price formatting** — `modules/products.js` + 7 other modules
   Standardized all `toLocaleString('ar-EG')` calls to `toLocaleString('en-US')`
   for consistent Western-digit prices, and added a Cairo font fallback to every
   `JetBrains Mono` rule so "ج.م" next to prices renders as connected Arabic script
   instead of broken glyphs.
# Changelog

## 2026-07-24
- Fixed: checkout crash (`v_coupon is not assigned yet`) when no coupon code
  used, in `create_order_secure` — merged the already-written fix from
  `fix-checkout-coupon-bug.sql` into the canonical `supabase-setup-FINAL.sql`.
- Archived: `fix-checkout-coupon-bug.sql` → `archive/fix-checkout-coupon-bug.sql.applied`
  (superseded, kept for history only).
- Audited: JS/CSS duplication, `admin.html` inline scripts, internal link
  integrity, SQL function signature conflicts — no further issues found in
  Phase 1 scope.
- Added: ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md, TODO.md,
  IMPLEMENTATION_LOG.md as persistent project tracking docs.
- Added: `supabase-migration-003-projects.sql` — Phase 2 (Projects module)
  database layer: `projects`, `project_gallery`, `project_devices` tables,
  RLS policies, `updated_at` trigger, `increment_project_views` RPC.
