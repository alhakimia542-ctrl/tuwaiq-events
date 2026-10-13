import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { eventType, city, guests, budget, theme } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      // Gemini key not configured — return a safe fallback instead of throwing
      return NextResponse.json({
        suggestedTheme: 'ملكي فاخر',
        colors: ['#D4AF37', '#002B5B', '#FDFBF7'],
        estimatedCost: 'تواصل معنا للحصول على عرض سعر',
        equipment: [
          'كوشة ورود طبيعية فاخرة',
          'طاولات VIP مع إضاءة',
          'نظام صوت وإضاءة متكامل',
          'ضيافة فندقية 5 نجوم',
          'تنسيق مكان شامل',
        ],
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash for fast text and JSON generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an elite "Luxury Saudi Event Planner" working for Lamsa Events. 
Generate a premium event plan based on the following details:
- Event Type: ${eventType}
- Region/City: ${city}
- Guests: ${guests}
- Budget: ${budget} Riyals
- Preferred Theme: ${theme}

Return ONLY valid JSON. No markdown formatting, no backticks.
The JSON schema MUST exactly match:
{
  "suggestedTheme": "اسم الطابع المقترح (مثال: ملكي فاخر)",
  "colors": ["#HEX1", "#HEX2", "#HEX3"],
  "estimatedCost": "رقم يمثل التكلفة التقديرية بناءً على المعطيات",
  "equipment": ["تجهيزة 1", "تجهيزة 2", "تجهيزة 3", "تجهيزة 4", "تجهيزة 5"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    console.log("Gemini Raw Response:", text);

    // Clean up markdown block if Gemini ignores instruction
    text = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error) {
    console.error("DETAILED GEMINI API ERROR:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestedTheme: "خطأ في الاتصال",
        colors: [],
        estimatedCost: "غير محدد",
        equipment: []
      },
      { status: 500 }
    );
  }
}
