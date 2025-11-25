"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { RequestData } from "@/lib/storage";

interface ParsedRequest {
    name: string;
    phone: string;
    location: { address: string; lat?: number; lng?: number };
    peopleCount: number;
    needs: string[];
    note: string;
    priority: "Normal" | "High";
}

// Parser function to extract data from Facebook comments
const parseComments = (text: string): ParsedRequest[] => {
    const results: ParsedRequest[] = [];

    // Split by common Facebook comment separators
    const comments = text.split(/\n\n+|\n-{3,}\n/);

    for (const comment of comments) {
        if (comment.trim().length < 10) continue; // Skip very short comments

        const parsed: Partial<ParsedRequest> = {
            needs: [],
            priority: "Normal"
        };

        // Extract phone number (Thai format)
        const phoneMatch = comment.match(/0[0-9]{1,2}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}/);
        if (phoneMatch) {
            parsed.phone = phoneMatch[0].replace(/[-\s]/g, '');
        }

        // Extract name (usually at the start or after "ชื่อ")
        const nameMatch = comment.match(/(?:ชื่อ[:\s]+)?([ก-๙a-zA-Z\s]{3,30})/);
        if (nameMatch) {
            parsed.name = nameMatch[1].trim();
        }

        // Extract address (look for location keywords) - More comprehensive patterns
        let addressText = "";

        // Pattern 1: Explicit "ที่อยู่:" label
        const addressLabelMatch = comment.match(/(?:ที่อยู่|ที่อยุ่|อยู่|บ้าน|สถานที่)[:\s]+([^\n]+(?:\n(?!ชื่อ|เบอร์|จำนวน|ต้องการ)[^\n]+)*)/i);
        if (addressLabelMatch) {
            addressText = addressLabelMatch[1].trim();
        }
        // Pattern 2: Look for house number pattern (เลขที่ XXX, บ้านเลขที่ XXX)
        else {
            const houseNumMatch = comment.match(/(?:เลขที่|บ้านเลขที่|เลข)\s*[\d\/\-]+[^\n]*/i);
            if (houseNumMatch) {
                // Try to capture multiple lines if they contain address keywords
                let startIdx = comment.indexOf(houseNumMatch[0]);
                let endIdx = startIdx + houseNumMatch[0].length;

                // Look ahead for address-related content
                const remaining = comment.substring(endIdx);
                const nextLines = remaining.match(/(?:\n[^\n]*(?:ม\.|หมู่|ซอย|ถนน|ต\.|ตำบล|แขวง|อ\.|อำเภอ|เขต|จ\.|จังหวัด)[^\n]*){0,3}/);
                if (nextLines) {
                    addressText = (houseNumMatch[0] + nextLines[0]).trim();
                } else {
                    addressText = houseNumMatch[0].trim();
                }
            }
            // Pattern 3: Find patterns with location keywords (ซอย, ถนน, ม., ต., etc)
            else {
                const locationMatch = comment.match(/(?:ม\.\s*\d+|หมู่\s*\d+|ซอย[^\s,\n]+|ถนน[^\s,\n]+)[^\n]*(?:\n(?:ต\.|ตำบล|แขวง|อ\.|อำเภอ|เขต|จ\.|จังหวัด)[^\n]+)*/i);
                if (locationMatch) {
                    addressText = locationMatch[0].trim();
                }
            }
        }

        // Clean up the address
        if (addressText) {
            // Remove common noise
            addressText = addressText
                .replace(/กรุณา|ช่วยด้วย|ด่วน/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            // If address is too short and doesn't look like an address, skip it
            if (addressText.length > 10) {
                parsed.location = { address: addressText };
            }
        }

        // Fallback: If still no address, try to find any text with common location keywords
        if (!parsed.location) {
            const fallbackMatch = comment.match(/((?:ซอย|ถนน|ตำบล|อำเภอ|จังหวัด|เขต|แขวง)[^\n]{10,80})/i);
            if (fallbackMatch) {
                parsed.location = { address: fallbackMatch[1].trim() };
            }
        }

        // Extract number of people
        const peopleMatch = comment.match(/([0-9]+)\s*(?:คน|ท่าน|ครอบครัว)/);
        if (peopleMatch) {
            parsed.peopleCount = parseInt(peopleMatch[1]);
        }

        // Extract needs
        if (/น้ำ|น้ำดื่ม|น้ำสะอาด/i.test(comment)) parsed.needs?.push("น้ำดื่ม");
        if (/อาหาร|ข้าว|กิน/i.test(comment)) parsed.needs?.push("อาหาร");
        if (/ยา|แพทย์|หมอ|เจ็บป่วย/i.test(comment)) parsed.needs?.push("ยา/การแพทย์");
        if (/เรือ|รับ|ไป|ย้าย|อพยพ/i.test(comment)) parsed.needs?.push("รับ-ส่ง");
        if (/เสื้อผ้า|ผ้า/i.test(comment)) parsed.needs?.push("เสื้อผ้า");

        // Check if urgent
        if (/ด่วน|เร่งด่วน|ฉุกเฉิน|คริติคอล/i.test(comment)) {
            parsed.priority = "High";
        }

        // Store note as the original comment
        parsed.note = comment.trim().substring(0, 200);

        // Validate minimum required fields
        if (parsed.name && (parsed.phone || parsed.location)) {
            results.push({
                name: parsed.name || "ไม่ระบุชื่อ",
                phone: parsed.phone || "",
                location: parsed.location || { address: "ไม่ระบุที่อยู่" },
                peopleCount: parsed.peopleCount || 1,
                needs: parsed.needs && parsed.needs.length > 0 ? parsed.needs : ["อื่นๆ"],
                note: parsed.note || "",
                priority: parsed.priority || "Normal"
            });
        }
    }

    return results;
};

export default function ImportPage() {
    const [inputText, setInputText] = useState("");
    const [parsedData, setParsedData] = useState<ParsedRequest[]>([]);
    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);

    const handleParse = () => {
        const parsed = parseComments(inputText);
        setParsedData(parsed);
    };

    const handleParseWithAI = async () => {
        if (!inputText.trim()) return;

        setParsing(true);
        try {
            const response = await fetch("/api/parse-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: inputText })
            });

            if (response.ok) {
                const result = await response.json();
                setParsedData(result.data);
                alert(`✅ AI วิเคราะห์สำเร็จ ${result.count} รายการ`);
            } else {
                const error = await response.json();
                alert(`❌ AI วิเคราะห์ไม่สำเร็จ: ${error.error}\nรายละเอียด: ${error.details || 'ไม่ระบุ'}\n\nกรุณาลองใช้วิธีปกติ หรือตรวจสอบ API Key`);
            }
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI - กรุณาลองใช้วิธีปกติ");
        } finally {
            setParsing(false);
        }
    };

    const handleBulkImport = async () => {
        if (parsedData.length === 0) return;

        setImporting(true);
        try {
            const response = await fetch("/api/requests/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requests: parsedData })
            });

            if (response.ok) {
                alert(`นำเข้าข้อมูลสำเร็จ ${parsedData.length} รายการ`);
                setInputText("");
                setParsedData([]);
            } else {
                alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
            }
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadCSV = () => {
        const headers = ["ชื่อ", "เบอร์โทร", "ที่อยู่", "จำนวนคน", "ความต้องการ", "หมายเหตุ", "ความเร่งด่วน"];
        const rows = parsedData.map(req => [
            req.name,
            req.phone,
            req.location.address,
            req.peopleCount,
            req.needs.join(", "),
            req.note,
            req.priority
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `parsed-requests-${Date.now()}.csv`;
        link.click();
    };

    const updateParsedItem = (index: number, field: keyof ParsedRequest, value: any) => {
        const updated = [...parsedData];
        updated[index] = { ...updated[index], [field]: value };
        setParsedData(updated);
    };

    const removeParsedItem = (index: number) => {
        setParsedData(parsedData.filter((_, i) => i !== index));
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            📥 นำเข้าข้อมูลจาก Facebook
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Copy comments จาก Facebook แล้ววางลงในช่องด้านล่างเพื่อวิเคราะห์ข้อมูลอัตโนมัติ</p>
                    </div>
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                        ⬅️ กลับหน้า Dashboard
                    </Button>
                </header>

                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Input Section - 4 Columns */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="h-full flex flex-col">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                                1️⃣ วาง Comments
                            </h2>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="วาง comments จาก Facebook ที่นี่...&#x0A;&#x0A;ตัวอย่าง:&#x0A;ชื่อ: สมชาย ใจดี&#x0A;เบอร์: 081-234-5678&#x0A;ที่อยู่: 123 ซอยลาดพร้าว อำเภอหาดใหญ่&#x0A;จำนวน: 5 คน&#x0A;ต้องการ: น้ำดื่ม อาหาร ด่วน!&#x0A;&#x0A;---&#x0A;&#x0A;ชื่อ: สมหญิง รักสงบ&#x0A;เบอร์: 062-987-6543&#x0A;ที่อยู่: 456 ถนนนิพัทธ์อุทิศ 3 ตำบลคูเต่า&#x0A;จำนวน: 3 คน&#x0A;ต้องการ: เรือ น้ำดื่ม ด่วนมาก!"
                                className="w-full flex-1 min-h-[300px] p-4 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            <div className="mt-4 space-y-3">
                                <Button
                                    variant="primary"
                                    onClick={handleParseWithAI}
                                    disabled={!inputText.trim() || parsing}
                                    className="w-full justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all transform hover:scale-[1.02]"
                                >
                                    {parsing ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            AI กำลังวิเคราะห์...
                                        </span>
                                    ) : "🤖 วิเคราะห์ด้วย AI (แนะนำ)"}
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleParse}
                                        disabled={!inputText.trim()}
                                        className="flex-1 justify-center"
                                    >
                                        🔍 วิเคราะห์ปกติ
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setInputText("")}
                                        className="text-slate-500 hover:text-red-500"
                                    >
                                        ล้าง
                                    </Button>
                                </div>
                                <div className="text-center text-xs text-slate-400">
                                    พบ {inputText.trim().split(/\n\n+/).filter(x => x.length > 10).length} รายการ
                                </div>
                            </div>
                        </Card>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                            <h3 className="font-bold mb-2 flex items-center gap-2">💡 เคล็ดลับ</h3>
                            <ul className="space-y-1 text-xs list-disc list-inside opacity-80">
                                <li>Copy มาทั้งชื่อและข้อความได้เลย</li>
                                <li>AI จะพยายามแยกชื่อ ที่อยู่ เบอร์โทร ให้อัตโนมัติ</li>
                                <li>ควรตรวจสอบความถูกต้องก่อนนำเข้า</li>
                            </ul>
                        </div>
                    </div>

                    {/* Preview Section - 8 Columns */}
                    <div className="lg:col-span-8">
                        <Card className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    2️⃣ ตรวจสอบข้อมูล <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{parsedData.length}</span>
                                </h2>
                                {parsedData.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                                            📄 CSV
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleBulkImport}
                                            disabled={importing}
                                            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        >
                                            {importing ? "⏳ กำลังบันทึก..." : `✅ ยืนยันนำเข้าทั้งหมด`}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                                {parsedData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                        </svg>
                                        <p>ยังไม่มีข้อมูล</p>
                                        <p className="text-sm mt-2">วางข้อความด้านซ้าย แล้วกดวิเคราะห์</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {parsedData.map((item, idx) => (
                                            <div key={idx} className="group relative p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
                                                <button
                                                    onClick={() => removeParsedItem(idx)}
                                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                    title="ลบรายการนี้"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                            {idx + 1}
                                                        </div>
                                                        <input
                                                            value={item.name}
                                                            onChange={(e) => updateParsedItem(idx, 'name', e.target.value)}
                                                            className="flex-1 font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1"
                                                            placeholder="ชื่อผู้ร้องขอ"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-400 flex items-center gap-1">
                                                                📞 เบอร์โทร
                                                            </label>
                                                            <input
                                                                value={item.phone}
                                                                onChange={(e) => updateParsedItem(idx, 'phone', e.target.value)}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-400 flex items-center gap-1">
                                                                👥 จำนวนคน
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={item.peopleCount}
                                                                onChange={(e) => updateParsedItem(idx, 'peopleCount', parseInt(e.target.value))}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400 flex items-center gap-1">
                                                            📍 ที่อยู่
                                                        </label>
                                                        <textarea
                                                            value={item.location.address}
                                                            onChange={(e) => updateParsedItem(idx, 'location', { ...item.location, address: e.target.value })}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none h-16"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                                        <select
                                                            value={item.priority}
                                                            onChange={(e) => updateParsedItem(idx, 'priority', e.target.value)}
                                                            className={`text-xs font-bold px-2 py-1 rounded border outline-none cursor-pointer ${item.priority === 'High'
                                                                    ? 'bg-red-50 text-red-600 border-red-200'
                                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                                                }`}
                                                        >
                                                            <option value="Normal">ปกติ</option>
                                                            <option value="High">🚨 ด่วน</option>
                                                        </select>

                                                        <div className="flex gap-1">
                                                            {item.needs.map((need, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] border border-blue-100">
                                                                    {need}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}
