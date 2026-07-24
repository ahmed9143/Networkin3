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
