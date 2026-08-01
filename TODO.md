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
- [x] Auto Network Documentation generator — شغال بالكامل client-side:
      Network Diagram (SVG), Rack Diagram (SVG), Patch Panel layout,
      Cable numbering, Device naming, IP table, VLAN table, Port mapping,
      Cable labels, Export Excel (.xls), Export PDF (print). See
      `network-doc-generator.html`. لسه مربوطش بـ admin.html أو بقاعدة بيانات —
      حاليًا أداة مستقلة generate-on-the-fly من غير حفظ.
- [x] Compatibility Engine — منطق هندسي حقيقي شغال (PoE budget, عدد البورتات,
      ONVIF/native protocol, codec check, تقدير bandwidth) على قاعدة بيانات
      ابتدائية (2 كاميرا: Hikvision DS-2CD2143G2-I(S) + Dahua IPC-HDW3441T-ZAS،
      1 سويتش: Cisco CBS350-24P-4G، 1 NVR: Hikvision DS-7608NI-K2/8P) — كل رقم
      فيها من الداتاشيت الرسمي ومصدره مكتوب، وأي حقل غير مؤكد اتكتب صراحة
      "غير مؤكد" بدل ما يتلفّق. See `compatibility-engine.html`. لسه محتاج:
      توسيع القاعدة (المزيد من الموديلات/الماركات)، وربطها بـ admin.html
      عشان تتضاف موديلات من غير تعديل كود.
- [x] Vendor Neutral comparator — جدول مقارنة غير متحيز (نفس القاعدة أعلاه،
      حاليًا موديلين بس — يحتاج توسيع بموديلات حقيقية أكتر من كل ماركة
      (Uniview/Axis/Tiandy لسه معملهاش بحث).
- [x] System sound cues — Web Audio API synthesis (مفيش ملفات صوت خارجية،
      فمفيش قلق حقوق ملكية): System Online boot chime, Switching sound,
      Radar ping. كود جاهز للنسخ داخل نفس الصفحة (`compatibility-engine.html`
      تاب "أصوات النظام") — لسه محتاج يتلصق فعليًا في index.html على أحداث
      onmouseenter لروابط الناف بار.
- [ ] Cable Route Estimator (طول الكابل / المواسير / Trays من مخطط مبنى).
- [ ] AI Product Matcher (بالمتطلبات مش بالاسم — "كاميرا تشوف بالليل 40 متر").
- [ ] Security DNA — بصمة 3D فريدة لكل مشروع من مكوناته (كاميرات/شبكات/
      سيرفرات/UPS/access control/بصمة/سنترال/واي فاي).
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
