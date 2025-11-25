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
                alert(`❌ AI วิเคราะห์ไม่สำเร็จ: ${error.error}\nกรุณาลองใช้วิธีปกติ`);
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
        <main className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="bg-white p-4 rounded-lg shadow border border-slate-200">
                    <h1 className="text-2xl font-bold text-slate-800">📥 นำเข้าข้อมูลจาก Facebook</h1>
                    <p className="text-slate-500 text-sm mt-1">Copy comments จาก Facebook แล้ววางลงในช่องด้านล่าง</p>
                </header>

                {/* Input Section - Full Width */}
                <Card>
                    <h2 className="text-lg font-bold mb-3">1️⃣ วาง Comments จาก Facebook ที่นี่</h2>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="วาง comments จาก Facebook ที่นี่...&#x0A;&#x0A;ตัวอย่าง:&#x0A;ชื่อ: สมชาย ใจดี&#x0A;เบอร์: 081-234-5678&#x0A;ที่อยู่: 123 ซอยลาดพร้าว อำเภอหาดใหญ่&#x0A;จำนวน: 5 คน&#x0A;ต้องการ: น้ำดื่ม อาหาร ด่วน!&#x0A;&#x0A;---&#x0A;&#x0A;ชื่อ: สมหญิง รักสงบ&#x0A;เบอร์: 062-987-6543&#x0A;ที่อยู่: 456 ถนนนิพัทธ์อุทิศ 3 ตำบลคูเต่า&#x0A;จำนวน: 3 คน&#x0A;ต้องการ: เรือ น้ำดื่ม ด่วนมาก!"
                        className="w-full h-96 p-4 border rounded-lg font-mono text-sm resize-y"
                    />
                    <div className="mt-4 flex gap-2 flex-wrap">
                        <Button
                            variant="primary"
                            onClick={handleParseWithAI}
                            disabled={!inputText.trim() || parsing}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {parsing ? "🤖 AI กำลังวิเคราะห์..." : "🤖 วิเคราะห์ด้วย AI (ฟรี)"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleParse}
                            disabled={!inputText.trim()}
                        >
                            🔍 วิเคราะห์แบบปกติ
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setInputText("")}
                        >
                            ล้างข้อมูล
                        </Button>
                        <div className="flex-1"></div>
                        <span className="text-xs text-slate-500 self-center">
                            {inputText.trim().split(/\n\n+/).filter(x => x.length > 10).length} comments
                        </span>
                    </div>
                </Card>

                {/* Preview Section - Full Width */}
                <Card>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold">2️⃣ ข้อมูลที่วิเคราะห์ได้ ({parsedData.length} รายการ)</h2>
                        {parsedData.length > 0 && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                                    📄 Download CSV
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleBulkImport}
                                    disabled={importing}
                                >
                                    {importing ? "กำลังนำเข้า..." : `✅ นำเข้า ${parsedData.length} รายการ`}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                        {parsedData.length === 0 ? (
                            <p className="col-span-full text-center text-slate-400 py-12">ยังไม่มีข้อมูล - กดปุ่ม "วิเคราะห์ข้อมูล" ด้านบน</p>
                        ) : (
                            parsedData.map((item, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm">#{idx + 1}</span>
                                        <button
                                            onClick={() => removeParsedItem(idx)}
                                            className="text-red-500 text-xs hover:bg-red-50 px-2 py-1 rounded"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="font-semibold text-slate-600">ชื่อ:</label>
                                            <input
                                                value={item.name}
                                                onChange={(e) => updateParsedItem(idx, 'name', e.target.value)}
                                                className="w-full px-2 py-1 border rounded mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600">เบอร์:</label>
                                            <input
                                                value={item.phone}
                                                onChange={(e) => updateParsedItem(idx, 'phone', e.target.value)}
                                                className="w-full px-2 py-1 border rounded mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600">ที่อยู่:</label>
                                            <input
                                                value={item.location.address}
                                                onChange={(e) => updateParsedItem(idx, 'location', { ...item.location, address: e.target.value })}
                                                className="w-full px-2 py-1 border rounded mt-1"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="font-semibold text-slate-600">จำนวนคน:</label>
                                                <input
                                                    type="number"
                                                    value={item.peopleCount}
                                                    onChange={(e) => updateParsedItem(idx, 'peopleCount', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 border rounded mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-semibold text-slate-600">ความเร่งด่วน:</label>
                                                <select
                                                    value={item.priority}
                                                    onChange={(e) => updateParsedItem(idx, 'priority', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded mt-1"
                                                >
                                                    <option value="Normal">ปกติ</option>
                                                    <option value="High">ด่วน</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600">ความต้องการ:</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {item.needs.map((need, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                                                        {need}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Instructions */}
                <Card>
                    <h3 className="font-bold mb-3">📖 วิธีใช้งาน</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                        <li>เปิด Facebook group post ที่มี comments</li>
                        <li>Copy ข้อความ comments ทั้งหมด (หรือเลือกเฉพาะที่ต้องการ)</li>
                        <li>Paste ลงในช่องด้านซ้าย</li>
                        <li>กดปุ่ม "วิเคราะห์ข้อมูล"</li>
                        <li>ตรวจสอบและแก้ไขข้อมูลที่วิเคราะห์ได้</li>
                        <li>กด "นำเข้า" เพื่อบันทึกเข้าระบบ หรือ "Download CSV" เพื่อบันทึกเป็นไฟล์</li>
                    </ol>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <strong>💡 เคล็ดลับ:</strong> ระบบจะพยายามดึงข้อมูลดังนี้
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                            <li>ชื่อ: หาคำที่เป็นภาษาไทย 3-30 ตัวอักษร</li>
                            <li>เบอร์: รูปแบบ 0X-XXXX-XXXX หรือ 081234567</li>
                            <li>ที่อยู่: หาคำว่า "ที่อยู่", "อยู่", "ซอย", "ถนน"</li>
                            <li>จำนวนคน: หาตัวเลขที่ตามด้วย "คน"</li>
                            <li>ความต้องการ: น้ำ, อาหาร, ยา, เรือ, เสื้อผ้า</li>
                        </ul>
                    </div>
                </Card>
            </div>
        </main>
    );
}
