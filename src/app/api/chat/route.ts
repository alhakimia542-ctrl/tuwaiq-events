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

// ─── Native HuggingFace Inference API endpoint ──────────────────────────────
const HF_API_URL =
  "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct";

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let userMessage: string | undefined;
  try {
    const body = await request.json();
    userMessage = body.message;
  } catch {
    return NextResponse.json(
      { response: "طلب غير صالح. يرجى إعادة المحاولة." },
      { status: 400 }
    );
  }

  if (!userMessage?.trim()) {
    return NextResponse.json({
      response: "يسعدني مساعدتك! ما الذي تودّ الاستفسار عنه؟",
    });
  }

  // 2. Validate API key
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_huggingface_api_key_here") {
    console.error("[Chat] HUGGINGFACE_API_KEY is missing or still a placeholder.");
    return NextResponse.json({
      response:
        "المساعد الذكي غير متاح مؤقتاً. يسعدنا خدمتك مباشرةً عبر الواتساب على الرقم 0547498239 📲",
    });
  }

  // 3. Build ChatML prompt — the native format Qwen2.5 expects
  const chatMLPrompt =
    "<|im_start|>system\n" +
    SYSTEM_PROMPT +
    "<|im_end|>\n" +
    "<|im_start|>user\n" +
    userMessage +
    "<|im_end|>\n" +
    "<|im_start|>assistant\n";

  // 4. Call the native HuggingFace Inference API
  //    Use AbortController to enforce a 25-second timeout so the request
  //    never hangs indefinitely on cold-start or network issues.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: chatMLPrompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          repetition_penalty: 1.1,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
    });

    // ── 503: Model is loading (cold start) ──────────────────────────────
    if (hfResponse.status === 503) {
      let estimatedTime = "";
      try {
        const loadingBody = await hfResponse.json();
        if (typeof loadingBody?.estimated_time === "number") {
          estimatedTime = ` (الوقت المقدّر: ${Math.ceil(loadingBody.estimated_time)} ثانية)`;
        }
        console.warn("[Chat] Model is loading (503):", JSON.stringify(loadingBody));
      } catch {
        console.warn("[Chat] Model is loading (503) — no JSON body.");
      }

      return NextResponse.json({
        response: `النموذج قيد التشغيل والتحميل الآن${estimatedTime}، يرجى المحاولة بعد ثوانٍ معدودة. 🔄`,
      });
    }

    // ── Other HTTP errors (401, 400, 500, etc.) ─────────────────────────
    if (!hfResponse.ok) {
      let errorDetail = "";
      try {
        const errBody = await hfResponse.json();
        errorDetail =
          (typeof errBody?.error === "string" && errBody.error) ||
          (typeof errBody?.message === "string" && errBody.message) ||
          JSON.stringify(errBody);
      } catch {
        errorDetail = await hfResponse.text().catch(() => "(unreadable body)");
      }

      console.error(
        `[Chat] HuggingFace HTTP ${hfResponse.status}:`,
        errorDetail
      );

      return NextResponse.json({
        response: `عذراً، تعذّر الاتصال بالنموذج (HTTP ${hfResponse.status} — ${errorDetail}). يرجى التواصل معنا عبر الواتساب على الرقم 0547498239 📲`,
      });
    }

    // ── Parse successful response ────────────────────────────────────────
    // The native HF text-generation endpoint returns either:
    //   [{ "generated_text": "..." }]   (array — most common)
    //   { "generated_text": "..." }     (object — some model configs)
    const data: unknown = await hfResponse.json();

    let rawText = "";
    if (Array.isArray(data) && data.length > 0 && typeof data[0]?.generated_text === "string") {
      rawText = data[0].generated_text;
    } else if (
      data !== null &&
      typeof data === "object" &&
      "generated_text" in data &&
      typeof (data as Record<string, unknown>).generated_text === "string"
    ) {
      rawText = (data as Record<string, unknown>).generated_text as string;
    }

    // ── Strip stop tokens safely with indexOf / slice ────────────────────
    const imEndPos = rawText.indexOf("<|im_end|>");
    if (imEndPos !== -1) rawText = rawText.slice(0, imEndPos);

    const imStartPos = rawText.indexOf("<|im_start|>");
    if (imStartPos !== -1) rawText = rawText.slice(0, imStartPos);

    let responseText = rawText.trim();

    if (!responseText) {
      console.warn("[Chat] Empty generated_text from HuggingFace:", JSON.stringify(data));
      responseText =
        "عذراً، لم أتمكن من صياغة الرد. يسعدنا خدمتك عبر الواتساب على الرقم 0547498239.";
    }

    return NextResponse.json({ response: responseText });
  } catch (error: unknown) {
    // ── Timeout (AbortController fired) ─────────────────────────────────
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[Chat] Fetch timed out after 25 seconds.");
      return NextResponse.json({
        response:
          "عذراً، استغرق النموذج وقتاً أطول من المتوقع للردّ. يرجى المحاولة مرة أخرى بعد لحظات. ⏳",
      });
    }

    // ── Network / DNS / TLS / other fetch-level failure ──────────────────
    const errName = error instanceof Error ? error.name : "UnknownError";
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCause = error instanceof Error && error.cause ? String(error.cause) : "";
    console.error(`[Chat] Fetch failed [${errName}]: ${errMsg}`, errCause ? `| cause: ${errCause}` : "");

    return NextResponse.json({
      response:
        "عذراً، تعذّر الاتصال بالخادم. يمكنك التواصل معنا مباشرةً عبر الواتساب على الرقم 0547498239 لخدمتك فوراً 📲",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}