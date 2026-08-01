# Brand logos

The brand strip on the homepage ("الماركات اللي بنتعامل معاها") shows a logo image
for every partner brand instead of plain text.

By default, since we don't have the rights to embed the real official logos here,
each brand gets an auto-generated placeholder badge (its name as a clean wordmark)
so nothing ever looks broken or empty.

## Recommended: upload from the admin panel (no redeploy needed)
Go to `admin.html` → **إعدادات الموقع** → **🤝 الماركات الشريكة (اللي بنتعامل معاها)**.
From there you can add/remove/reorder brands and upload a real logo file for each
one directly — it's stored in Supabase and shows on the live site immediately,
with no code change or redeploy. This is also the only way to add a *new* brand
that has no products in the catalog yet (e.g. a freshly signed agency).

This list is independent from the products table: `modules/brands.js` prefers it
whenever it has at least one active entry, and only falls back to auto-detecting
brands from existing products if the admin hasn't set up a partner list yet.

## Alternative: static files in this folder
For brands that already have products in the catalog, you can still drop a logo
file here instead, named with the brand's slug (lowercase, spaces replaced with `-`):

```
assets/brands/hikvision.png
assets/brands/dahua.png
assets/brands/honeywell.png
assets/brands/zkteco.png
...
```

`.png` is tried first, then `.svg`. This path requires adding the slug to
`BRAND_LOGO_FILES` in `modules/brands.js` and a redeploy — the admin panel route
above is faster for day-to-day use. Square images (e.g. 256x256) with a
transparent or white background work best either way.
