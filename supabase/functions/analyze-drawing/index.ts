// supabase/functions/analyze-drawing/index.ts
//
// Deploy with:
//   supabase functions deploy analyze-drawing
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The frontend (ai-drawing-reader.html) sends the rendered PNG of the first page of the
// uploaded AutoCAD/floor-plan PDF as base64, and this function asks Claude's vision model
// to read it and return a strict JSON shape the frontend can render directly.
//
// Keeping the AI call server-side (instead of in the browser) protects the API key and lets
// us enforce a fixed system prompt / output schema regardless of what the client sends.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت مهندس تصميم أنظمة مراقبة وشبكات محترف. هتستلم صورة لمخطط معماري (AutoCAD مُصدَّر PDF).
اقرأ المخطط وارجع JSON فقط (بدون أي نص إضافي، بدون markdown fences) بالشكل التالي بالضبط:

{
  "room_count": <رقم>,
  "estimated_area_sqm": <رقم أو null لو مش واضح>,
  "rooms": [ { "name": "<اسم الغرفة/المساحة بالعربي>", "cameras_suggested": <رقم> } ],
  "suggested_camera_count": <إجمالي عدد الكاميرات المقترحة>,
  "suggested_network_points": <إجمالي نقاط الشبكة/الاكسس بوينت المقترحة>,
  "suggested_devices": [
    { "label": "<اسم الصنف بالعربي>", "keywords": ["<كلمة مفتاحية بالإنجليزي أو العربي للمطابقة مع الكتالوج>"], "qty": <رقم> }
  ]
}

قواعد:
- لكل مدخل رئيسي أو ممر طويل أو محيط خارجي: كاميرا واحدة على الأقل.
- الغرف الداخلية الصغيرة (حمام، مخزن صغير جدًا) عادة متحتاجش كاميرا.
- suggested_devices لازم يشمل: الكاميرات (مقسّمة داخلي/خارجي لو ممكن)، جهاز NVR بعدد قنوات مناسب، سويتش PoE بعدد منافذ كافي، هارد تخزين مناسب لعدد الكاميرات، وUPS لو المشروع كبير.
- لو المخطط مش واضح كفاية علشان تحدد الغرف بدقة، رجّع أفضل تقدير ممكن ومتسيبش الحقول فاضية، لكن خلي room_count واقعي.
- ارجع JSON صحيح 100% قابل للـparse، من غير أي شرح خارجه.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_base64, mime_type } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "لا يوجد صورة مرفقة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY غير مُعرّف على السيرفر" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mime_type || "image/png",
                  data: image_base64,
                },
              },
              { type: "text", text: "حلل المخطط ده وارجع الـJSON المطلوب بالضبط." },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "فشل استدعاء نموذج الذكاء الاصطناعي", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const textBlock = (aiData.content || []).find((b: any) => b.type === "text");
    const raw = textBlock ? textBlock.text : "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      return new Response(JSON.stringify({ error: "الرد من الذكاء الاصطناعي مش بصيغة JSON صحيحة", raw: cleaned }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
