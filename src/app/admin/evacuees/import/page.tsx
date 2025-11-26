"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ImportEvacueesPage() {
    const [inputData, setInputData] = useState("");
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number, error: number } | null>(null);

    // Simple CSV Parser that handles quotes
    const parseCSVLine = (line: string) => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                let field = line.substring(start, i).trim();
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.substring(1, field.length - 1);
                }
                result.push(field);
                start = i + 1;
            }
        }
        let lastField = line.substring(start).trim();
        if (lastField.startsWith('"') && lastField.endsWith('"')) {
            lastField = lastField.substring(1, lastField.length - 1);
        }
        result.push(lastField);
        return result;
    };

    const processData = (text: string) => {
        const lines = text.trim().split('\n');

        const data = [];

        for (const line of lines) {
            // Skip empty lines or lines with just commas
            if (!line.trim() || line.replace(/,/g, '').trim().length === 0) continue;

            const cols = parseCSVLine(line);

            // Try to detect column offset
            let offset = 0;
            if (cols[0] === '' && cols[1]?.includes('/')) offset = 1; // Starts with empty col
            else if (cols[0]?.includes('/')) offset = 0; // Starts directly with timestamp
            else if (cols[1]?.includes('/') && !isNaN(parseInt(cols[0]))) offset = 1; // Starts with index number
            else continue; // Not a data line

            const firstName = cols[offset + 2];
            const lastName = cols[offset + 3];

            if (!firstName || !lastName || firstName === 'ชื่อ') continue; // Skip header or invalid

            const districtParts = cols[offset + 5] ? cols[offset + 5].split('|') : [];

            data.push({
                timestamp: cols[offset],
                shelter: cols[offset + 1],
                firstName: firstName,
                lastName: lastName,
                gender: cols[offset + 4],
                district: districtParts[0]?.trim() || 'Unknown',
                subDistrict: districtParts[1]?.trim() || '',
                address: cols[offset + 6] || "",
                status: "safe"
            });
        }

        setPreviewData(data);
        setImportResult(null);
    };

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setInputData(text); // Keep for reference if needed, or remove
            processData(text);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsImporting(true);
        try {
            const response = await fetch('/api/evacuees/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evacuees: previewData })
            });

            const result = await response.json();
            if (response.ok) {
                setImportResult({ success: result.successCount, error: result.errorCount });
                let msg = `นำเข้าสำเร็จ: ${result.successCount} รายการ (ผิดพลาด: ${result.errorCount})`;
                if (result.errorCount > 0 && result.firstError) {
                    msg += `\n\nตัวอย่างข้อผิดพลาด: ${JSON.stringify(result.firstError)}`;
                }
                alert(msg);
                if (result.successCount > 0) {
                    setInputData(""); // Clear input
                    setPreviewData([]); // Clear preview
                }
            } else {
                alert(`เกิดข้อผิดพลาด: ${result.error}`);
            }
        } catch (error) {
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            📥 นำเข้าข้อมูลผู้อพยพ (CSV Format)
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">รองรับรูปแบบข้อมูลจาก Google Sheets / Excel (data.csv)</p>
                    </div>
                    <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">
                        ⬅️ กลับ Dashboard
                    </Link>
                </header>

                <div className="grid lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                            <h2 className="font-bold mb-2">1. เลือกไฟล์ CSV</h2>
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative min-h-[300px]"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFileUpload(file);
                                }}
                            >
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file);
                                    }}
                                />
                                <div className="text-center p-6 pointer-events-none">
                                    <div className="text-4xl mb-3">📄</div>
                                    <p className="font-medium text-slate-700">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                                    <p className="text-sm text-slate-500 mt-1">รองรับไฟล์ .csv (UTF-8)</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                * ไฟล์ต้องมีรูปแบบตาม data.csv (มีคอลัมน์เวลา, ชื่อ, นามสกุล, ฯลฯ)
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold">2. ตัวอย่างข้อมูล ({previewData.length} รายการ)</h2>
                                {previewData.length > 0 && (
                                    <button
                                        onClick={handleImport}
                                        disabled={isImporting}
                                        className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${isImporting ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                    >
                                        {isImporting ? 'กำลังบันทึก...' : 'ยืนยันการนำเข้า'}
                                    </button>
                                )}
                            </div>

                            {importResult && (
                                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                    ✅ นำเข้าเสร็จสิ้น: สำเร็จ {importResult.success} รายการ, ผิดพลาด {importResult.error} รายการ
                                </div>
                            )}

                            <div className="flex-1 overflow-auto border rounded-lg bg-slate-50 relative">
                                {previewData.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        ยังไม่มีข้อมูล
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-700 font-medium sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="p-3 border-b">เวลา</th>
                                                <th className="p-3 border-b">ชื่อ-สกุล</th>
                                                <th className="p-3 border-b">ศูนย์พักพิง</th>
                                                <th className="p-3 border-b">อำเภอ/ตำบล</th>
                                                <th className="p-3 border-b">ที่อยู่</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i} className="border-b hover:bg-white transition-colors">
                                                    <td className="p-3 text-slate-500">{row.timestamp}</td>
                                                    <td className="p-3 font-medium">{row.firstName} {row.lastName}</td>
                                                    <td className="p-3 text-blue-600">{row.shelter}</td>
                                                    <td className="p-3">
                                                        <span className="bg-slate-200 px-2 py-1 rounded text-xs">{row.district}</span>
                                                        <span className="ml-1 text-slate-500 text-xs">{row.subDistrict}</span>
                                                    </td>
                                                    <td className="p-3 text-slate-500 max-w-[200px] truncate" title={row.address}>{row.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
