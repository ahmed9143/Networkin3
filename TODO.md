# TODO — prioritized backlog

Ordered per the standing priorities: bugs > stabilization > UX > mobile >
dedupe > perf > a11y > SEO > architecture > new modules.

## 1. Bugs
- [x] Merge `fix-checkout-coupon-bug.sql` fix into `supabase-setup-FINAL.sql`
      (done 2026-07-24 — see IMPLEMENTATION_LOG.md)
- [ ] Verify no other file in the repo (e.g. `supabase-migration-002-enterprise-tools.sql`)
      carries a second, conflicting definition of `create_order_secure`
      (the comments in `supabase-setup-FINAL.sql` mention this was a past
      problem — worth a follow-up grep across all `.sql` files).
- [ ] Run the full `.sql` files through a linter/dry-run against a scratch
      Postgres instance to catch further latent bugs before deploy.

## 2. Stabilization
- [ ] Confirm `admin.html` (160K, largest file in repo) isn't hiding
      duplicated inline script — worth a dedicated pass, it's too large to
      safely eyeball in one sweep.
- [ ] Add automated integrity check script (broken links/IDs, missing
      module references) to run after each future change.

## 3. UX / Mobile
- [ ] Navbar, mega menu, search, filters, product cards/gallery, cart,
      checkout, admin panel/dashboard/tables — mobile pass, per spec.
- [ ] Swipe, bottom-sheet filters, sticky actions, floating quick actions.

## 4. Dedupe / Perf / A11y / SEO
- [ ] No urgent duplication found in JS/CSS (see log). Re-check after
      admin.html audit above.
- [ ] Lazy-load heavy sections, image optimization, skeleton loaders.
- [ ] Lighthouse + Core Web Vitals pass.

## 5. Architecture
- [ ] Keep Vue-migration-readiness in mind for any new module.

## 6. New modules (large, tackled one at a time, each fully built —
       schema + RLS + Supabase + UI + admin + search + analytics + notif)
- [ ] Smart filtering / Arabic NL search
- [ ] AI engineering tools (calculators, planners, generators)
- [~] Projects module — DB layer done (`supabase-migration-003-projects.sql`:
      projects, project_gallery, project_devices, view-counter RPC, RLS).
      Still needed: public gallery/detail page, admin CRUD UI, PDF export,
      WhatsApp inquiry button, search/filter wiring, analytics hooks,
      storage bucket + policy for project images.
- [ ] Customer dashboard
- [ ] Asset management / QR tracking
- [ ] Workflow engine
- [ ] Enterprise analytics
- [ ] Knowledge center
- [ ] Notification center
- [ ] Admin panel upgrades
- [ ] UI/UX system-wide polish (dark mode, command palette, etc.)
