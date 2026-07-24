# Architecture (as audited 2026-07-24)

## Stack
- Static HTML pages (index.html, admin.html, product/article pages) + vanilla JS
- `js/bootstrap.js` — app bootstrap, loaded first
- `js/app.js` — shared app logic
- `modules/*.js` — one file per feature domain (products, cart, boq, rack,
  calculators, ai, categories, brands, search, router, notifications,
  analytics-tracking, effects x3)
- `css/styles.css` — single global stylesheet (1502 lines, no duplicate
  top-level selectors found)
- Supabase (Postgres + RLS) as backend, defined in `supabase-setup-FINAL.sql`
  (canonical schema/functions file) and `supabase-migration-002-enterprise-tools.sql`
  (additive migration)
- Deployed on Vercel

## Findings from Phase 1 audit
- No duplicate `id=` attributes or duplicate inline function names in
  `admin.html` (2727 lines, largest file in repo).
- No duplicate top-level CSS selectors in `styles.css`.
- No broken local `href`/`src` links to `.html`/`.js`/`.css` files.
- No conflicting SQL function signatures across `.sql` files after merging
  the checkout fix (see IMPLEMENTATION_LOG.md) — `archive/fix-checkout-coupon-bug.sql.applied`
  is now historical only, do not re-run it.
- `config.js` at repo root holds shared config — check this first before
  adding new env/config values to avoid creating a second source of truth.

## Conventions for new modules (Phase 2+)
- One `modules/<name>.js` file per domain, same pattern as existing modules.
- SQL: one migration file per phase (`supabase-migration-00N-<name>.sql`),
  never edit `supabase-setup-FINAL.sql` directly for new features — only for
  bugfixes to existing functions (as done for the coupon bug).
- RLS: every new table gets explicit policies in the same migration file
  that creates it, no table ships without RLS.
- Keep DOM structure/class naming consistent with existing pages so a future
  Vue migration can lift components with minimal rewrite (this is called out
  explicitly in the project's own long-term goal).
