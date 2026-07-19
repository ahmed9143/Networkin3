# Brand logos

The brand strip on the homepage ("الماركات اللي بنتعامل معاها") now shows a logo image
for every brand instead of plain text.

By default, since we don't have the rights to embed the real official logos here,
each brand gets an auto-generated placeholder badge (colored initials) so nothing
ever looks broken or empty.

## To use the real logos
Drop the actual logo file for each brand into this folder, named with the brand's
slug (lowercase, spaces replaced with `-`):

```
assets/brands/hikvision.png
assets/brands/dahua.png
assets/brands/honeywell.png
assets/brands/zkteco.png
...
```

`.png` is tried first, then `.svg`. No code changes are needed — the page picks the
file up automatically the next time it loads. Square images (e.g. 256x256) with a
transparent or white background work best.
