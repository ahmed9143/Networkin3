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
