import { NextRequest, NextResponse } from "next/server";

// ─── System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت ممثل خدمة العملاء الذكي والرسمي لمؤسسة "لمسة إيفنس" المتخصصة في تنظيم وتجهيز المناسبات والحفلات الفاخرة في السعودية.
مهنتك هي مساعدة العملاء والإجابة على استفساراتهم بلطف واحترافية عالية.

يجب عليك الالتزام التام بالمعلومات الرسمية الدقيقة التالية وعدم تغييرها أو اختراع أي معلومات أخرى أبداً:
- اسم المؤسسة: مؤسسة لمسة إيفنس لتنظيم الحفلات والمناسبات.
- رقم التواصل والواتساب الرسمي: 0547498239
- العنوان التفصيلي: المملكة العربية السعودية - الرياض - حي طويق - 3630 أبي القاسم الأنصاري (كود الخريطة: HH72+F2Q).
- رابط موقعنا على خرائط جوجل (Google Maps): https://maps.app.goo.gl/QrMvv7oZLZwQ1iw46?g_st=aw
- حسابنا الرسمي على الانستغرام: https://www.instagram.com/hflatayfns
- حسابنا الرسمي على التيك توك: https://www.tiktok.com/@lamsa.events8
- أبرز خدماتنا: كوش الأفراح، طاولات وضيافة، جلسات ملكية، تنسيق ورود، وتصميم الحفلات والمناسبات.

تعليمات صارمة:
1. إذا سألك العميل عن الرقم أو الواتساب، أعطه الرقم الصحيح حصرياً: 0547498239.
2. إذا سألك عن الموقع أو العنوان، وجهه إلى حي طويق بالرياض مع إرفاق رابط خرائط جوجل.
3. إذا سألك عن السوشيال ميديا، أعطه روابط الانستغرام أو التيك توك المذكورة أعلاه.
4. كن ودوداً، مرحباً، وإذا طلب العميل حجزاً أو تفاصيل إضافية، اطلب منه التواصل مباشرة عبر رقم الواتساب الرسمي.`;

// ─── HuggingFace OpenAI-compatible router endpoint ──────────────────────────
// The legacy /models/<id> inference URL does not support chat-completion
// routing. The /v1/chat/completions router is the modern, stable alternative.
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL   = "Qwen/Qwen2.5-7B-Instruct";

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let message: string | undefined;
  try {
    const body = await request.json();
    message = body.message;
  } catch {
    return NextResponse.json(
      { response: "طلب غير صالح. يرجى إعادة المحاولة." },
      { status: 400 }
    );
  }

  if (!message?.trim()) {
    return NextResponse.json({
      response: "يسعدني مساعدتك! ما الذي تودّ الاستفسار عنه؟",
    });
  }

  // 2. Validate API key
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("[Chat] HUGGINGFACE_API_KEY is not set.");
    return NextResponse.json({
      response:
        "المساعد الذكي غير متاح مؤقتاً. يسعدنا خدمتك مباشرةً عبر الواتساب على الرقم 0547498239 📲",
    });
  }

  // 3. Call HuggingFace via the OpenAI-compatible chat-completions router
  try {
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: message },
        ],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!hfResponse.ok) {
      const errorBody = await hfResponse.text();
      console.error("[Chat] HuggingFace API error:", hfResponse.status, errorBody);
      throw new Error(`HF router responded with status ${hfResponse.status}`);
    }

    const data = await hfResponse.json();

    // OpenAI-compatible response shape: choices[0].message.content
    let responseText: string =
      data?.choices?.[0]?.message?.content ?? "";
    responseText = responseText.trim();

    if (!responseText) {
      responseText =
        "عذراً، لم أتمكن من صياغة الرد. يسعدنا خدمتك عبر الواتساب على الرقم 0547498239.";
    }

    return NextResponse.json({ response: responseText });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Chat] Error calling HuggingFace:", message);
    return NextResponse.json(
      {
        response:
          "عذراً، أواجه صعوبة في الاتصال حالياً. يمكنك التواصل معنا مباشرة عبر الواتساب على الرقم 0547498239 لخدمتك فوراً 📲",
      },
      { status: 500 }
    );
  }
}