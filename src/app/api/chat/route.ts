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

// ─── HuggingFace model endpoint ────────────────────────────────────────────
const HF_API_URL =
  "https://api-inference.huggingface.co/models/alhakimia54/my-qwen2.5-custom-model";

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

  // 3. Build the prompt in the chat-ml format that Qwen2.5 expects
  const fullPrompt = `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${message}<|im_end|>\n<|im_start|>assistant\n`;

  // 4. Call Hugging Face Serverless Inference API
  try {
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          repetition_penalty: 1.2,
          return_full_text: false,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errorBody = await hfResponse.text();
      console.error("[Chat] HuggingFace API error:", hfResponse.status, errorBody);
      throw new Error(`HF API responded with status ${hfResponse.status}`);
    }

    const data = await hfResponse.json();

    // HF text-generation returns an array: [{ generated_text: "..." }]
    let responseText: string =
      (Array.isArray(data) && data[0]?.generated_text) ||
      data?.generated_text ||
      "";

    // Strip any trailing stop tokens the model might emit (no regex flags needed)
    const endIdx = responseText.indexOf("<|im_end|>");
    if (endIdx !== -1) responseText = responseText.slice(0, endIdx);
    const startIdx = responseText.indexOf("<|im_start|>");
    if (startIdx !== -1) responseText = responseText.slice(0, startIdx);
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