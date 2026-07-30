# Implementation Log

## 2026-07-24 — Autonomous audit pass #1

### Fixed
- **Checkout crash bug (critical).** `supabase-setup-FINAL.sql`, function
  `create_order_secure`, still contained the pre-hotfix version of the order
  INSERT: it read `v_coupon.code` directly inside a `CASE` expression at
  insert time. Since `v_coupon` is a `%ROWTYPE` record that is *never
  assigned* when a customer checks out without a coupon, Postgres fails to
  resolve the record's row type when planning the INSERT, raising
  `record "v_coupon" is not assigned yet`. This meant **every
  no-coupon checkout was broken** in the canonical setup file, even though a
  correct fix already existed in the separate `fix-checkout-coupon-bug.sql`
  file — it had never been merged back into the source of truth.
  - Added `v_coupon_code_used text := null` to the `declare` block.
  - Capture `v_coupon.code` into it immediately after the coupon is looked
    up and validated (the only branch where the record is populated).
  - INSERT now references `v_coupon_code_used` instead of the record.
  - `CREATE OR REPLACE`, no data touched, safe to re-run.

### Audited, no action needed
- Scanned `modules/*.js` and `js/*.js` for duplicated function definitions:
  no meaningful copy-paste duplication found. A few common utility names
  (`render`, `start`, `esc`, `step`) repeat across files but are scoped
  inside separate modules/IIFEs — not duplication in the harmful sense.
- Scanned `css/styles.css` (1502 lines) for duplicate top-level selectors:
  none found.

### Cleanup
- Archived `fix-checkout-coupon-bug.sql` → `archive/fix-checkout-coupon-bug.sql.applied`
  (superseded now that its fix lives in `supabase-setup-FINAL.sql`; kept for
  history, should not be re-applied).
- Confirmed no other `.sql` file redefines `create_order_secure` or any other
  function — no conflicting signatures found across the repo.

## 2026-07-24 — Phase 2 start: Projects module, database layer

Added `supabase-migration-003-projects.sql`:
- `public.projects` — slug, status (draft/published), customer/location/
  engineer fields, timeline + BOQ as jsonb, related products, featured flag,
  view counter, `updated_at` auto-touch trigger.
- `public.project_gallery` — multi-image gallery per project.
- `public.project_devices` — links installed equipment to `public.products`,
  admin-only visibility (serials/notes shouldn't be public).
- `public.increment_project_views(slug)` — SECURITY DEFINER RPC so the
  public site can bump view counts without needing write access to the
  table directly (same pattern as `order_rate_limit` writes).

RLS follows the exact convention already established in
`supabase-setup-FINAL.sql`: public `select` only for published content,
`auth.role() = 'authenticated'` required for all writes, `drop policy if
exists` before `create policy` so the file is safely re-runnable.

Not yet done for Phase 2: frontend gallery/detail page UI, admin CRUD UI,
PDF export, WhatsApp inquiry button, search/filter integration, analytics
hooks, storage bucket policies for image uploads. These are next.

### Not done yet (see TODO.md)
Everything else in the original feature list (mobile redesign, homepage
upgrade, smart filtering, AI engineering tools, projects module, asset
management, workflow engine, analytics, knowledge center, notifications,
admin upgrades) is unbuilt. These are large, separable modules — see
TODO.md for the prioritized backlog.

## 2026-07-31 — Dynamic theme + Digital Passport (QR) + Rack Scanner

- **Bug fixes**: added `loading="lazy"` + explicit width/height to the
  wishlist thumbnail in `modules/cart.js` (the one image tag in the repo
  missing it).
- **Dynamic day/night theme**: the existing manual `data-theme` light/dark
  toggle is now time-based by default (`it_theme_mode` in localStorage —
  `auto` follows the device clock, 06:00–18:00 = light / else = dark-cyber;
  a click still forces a theme, a long-press on the toggle returns to
  `auto`). Set before first paint via an inline `<head>` script in
  `index.html` to avoid a flash of the wrong theme; re-checked every 5 min
  and on tab focus in `modules/notifications.js`. `project-passport.html`
  and `rack-scanner.html` also read the same saved mode/time on load.
- **Digital Passport (QR)**: `supabase-migration-004-passport.sql` adds
  `passport_enabled` to `projects`, warranty/maintenance/`qr_token` columns
  to `project_devices`, a new `device_maintenance_log` table, two
  SECURITY DEFINER RPCs for anonymous QR scanners
  (`get_project_passport(slug)`, `get_device_by_qr(token)` — both exclude
  serial numbers on purpose), and a public `projects` storage bucket.
  `project-passport.html` is the public page a customer sees after
  scanning a project's QR: gallery/diagrams, installed devices with a
  warranty-status pill (ok/soon/expired), and maintenance history.
- **Rack Scanner**: `rack-scanner.html` — camera page with two modes:
  (1) live QR scanning via `jsQR` for the "point the phone at the rack"
  flow — decodes a device's sticker and shows its info in a bottom sheet,
  accuracy comes from the QR, not visual AI; (2) an optional "AI تجريبي"
  toggle that loads TensorFlow.js + COCO-SSD (a generic 80-class
  pre-trained model, lazy-loaded only if toggled on) to draw bounding
  boxes as a visual scanning effect — labeled honestly in the UI as
  approximate/generic, since COCO-SSD has no concept of "switch" vs "UPS"
  vs "patch panel". If opened directly from a printed sticker
  (`?device=TOKEN`, e.g. via the phone's stock camera app) it skips
  straight to the device card without needing in-page scanning.
- **Admin**: new "🛂 المشاريع والباسبورت الرقمي" tab in `admin.html` —
  project CRUD (title/slug/customer/category/status/passport toggle),
  per-project device CRUD (name/type/quantity/serial [admin-only]/warranty
  date/last maintenance/notes), and QR generation (client-side via
  `qrcode.js`, downloadable PNG) for both the whole project's passport and
  each individual device.

### Still needed for this feature set
- Maintenance log entries currently have to be inserted directly in
  Supabase (no admin UI yet) — `device_maintenance_log` table exists with
  RLS but no CRUD screen.
- Project gallery image upload UI in admin (table/RPC support it; admin
  currently expects a pasted image URL in the cover field only).
- No PDF export for the passport yet (mentioned in migration 003's
  leftover TODO too).
- Full Lighthouse/mobile pass from TODO.md items 3–4 is still outstanding.
