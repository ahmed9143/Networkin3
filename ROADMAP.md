# Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Platform stabilization | Audited — codebase is cleaner than assumed; 1 critical bug found & fixed (checkout coupon crash). No dedupe/broken-link work was needed. See IMPLEMENTATION_LOG.md. |
| 2 | Projects module | In progress — DB layer + RLS shipped (`supabase-migration-003-projects.sql`). Next: public UI, admin CRUD, PDF export, search/filter, analytics/notification hooks. |
| 3 | Customer dashboard | Not started |
| 4 | Asset management | Not started |
| 5 | Notification center | Not started |
| 6 | Enterprise analytics | Not started |
| 7 | Workflow engine | Not started |
| 8 | Knowledge center | Not started |
| 9 | AI engineering tools | Not started |
| 10 | Final polish | Not started |

Each phase is genuinely large (schema + RLS + Supabase + full UI + admin +
search + analytics + notifications, per the project's own module
requirements). They're built one at a time, each to production quality,
rather than all at once — a single pass covering all 10 phases at real
production quality isn't something that fits in one response; this file is
the persistent tracker across passes so nothing gets lost or re-asked.
