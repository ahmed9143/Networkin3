# analyze-drawing (Supabase Edge Function)

يشغّل ميزة "قارئ المخططات الذكي" (ai-drawing-reader.html) عن طريق تحليل صورة المخطط بموديل Claude
مع الرؤية (vision) على السيرفر، عشان مفتاح الـAPI يفضل مخفي وميظهرش في كود المتصفح.

## النشر

```bash
supabase login
supabase link --project-ref <project-ref-بتاعك>
supabase functions deploy analyze-drawing
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

بعد كده الصفحة `ai-drawing-reader.html` هتشتغل تلقائيًا لأنها بتنادي:
```js
sb.functions.invoke('analyze-drawing', { body: { image_base64, mime_type } })
```

## ملاحظات
- محتاج تحصل على مفتاح Anthropic API من https://console.anthropic.com
- الدالة بترجع JSON بالشكل: `room_count`, `estimated_area_sqm`, `rooms[]`,
  `suggested_camera_count`, `suggested_network_points`, `suggested_devices[]`.
- الصفحة بتربط كل `suggested_devices[].keywords` بمنتج حقيقي من جدول `products` في Supabase
  عن طريق `findBestProduct()`، فأي اقتراح مالوش منتج مطابق هيتعرض كـ"يحتاج تحديد من فريقنا"
  بدل ما يظهر سعر وهمي.
