import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Invalid text input" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing in environment variables");
            return NextResponse.json(
                { error: "Configuration Error", details: "GEMINI_API_KEY is missing on server" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        console.log("Using Gemini Model: gemini-1.5-flash-001");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        const prompt = `คุณเป็น AI ผู้ช่วยในการแยกข้อมูลผู้ประสบภัยน้ำท่วมจาก Facebook comments

วิเคราะห์ความคิดเห็นต่อไปนี้และแยกข้อมูลเป็น JSON array โดยแต่ละรายการต้องมี:
- name: ชื่อผู้ร้องขอ
- phone: เบอร์โทรศัพท์ (รูปแบบไทย)
- location: ที่อยู่แบบละเอียด (รวมบ้านเลขที, ซอย, ถนน, หมู่, ตำบล, อำเภอ, จังหวัด)
- peopleCount: จำนวนคน (ตัวเลข)
- needs: array ของความต้องการ เช่น ["น้ำดื่ม", "อาหาร", "ยา", "รับ-ส่ง", "เสื้อผ้า"]
- priority: "High" ถ้าด่วนมาก มี "ด่วน" "ฉุกเฉิน" หรือ "Normal"
- note: หมายเหตุเพิ่มเติม (สูงสุด 150 ตัวอักษร)

กฎสำคัญ:
1. ถ้าไม่มีข้อมูลไหน ให้ใส่ค่าเริ่มต้นที่เหมาะสม
2. เบอร์โทร: ถ้าไม่มีให้เว้นว่าง ""
3. peopleCount: ถ้าไม่มีให้ใช้ 1
4. location: พยายามเก็บที่อยู่ให้ละเอียดที่สุด รวมหมู่บ้าน ซอย ตำบล อำเภอ จังหวัด
5. needs: แปลงเป็นคำที่เป็นมาตรฐาน
6. แต่ละ comment แยกกันด้วยบรรทัดว่าง หรือเครื่องหมาย --- 

ตอบเป็น valid JSON array เท่านั้น ไม่ต้องมีคำอธิบายอื่น

Comments:
${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        // Extract JSON from response (in case AI adds extra text)
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return NextResponse.json(
                { error: "AI did not return valid JSON", details: aiText.substring(0, 100) },
                { status: 500 }
            );
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and normalize data
        const normalized = parsed.map((item: any) => ({
            name: item.name || "ไม่ระบุชื่อ",
            phone: item.phone || "",
            location: {
                address: item.location || "ไม่ระบุที่อยู่",
                lat: undefined,
                lng: undefined
            },
            peopleCount: parseInt(item.peopleCount) || 1,
            needs: Array.isArray(item.needs) && item.needs.length > 0 ? item.needs : ["อื่นๆ"],
            priority: item.priority === "High" ? "High" : "Normal",
            note: item.note || ""
        }));

        return NextResponse.json({
            success: true,
            data: normalized,
            count: normalized.length
        });

    } catch (error: any) {
        console.error("AI parsing error:", error);
        return NextResponse.json(
            { error: "AI parsing failed", details: error.message || JSON.stringify(error) },
            { status: 500 }
        );
    }
}
