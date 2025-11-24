"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { RequestData } from "@/lib/storage";
import { convertToCSV } from "@/lib/csv";

export default function DashboardPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(true);

    const MapViewer = useMemo(() => dynamic(
        () => import('@/components/MapViewer'),
        {
            loading: () => <div style={{ height: "400px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", marginBottom: "1.5rem" }}>กำลังโหลดแผนที่...</div>,
            ssr: false
        }
    ), []);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/requests");
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (id: string, newStatus: RequestData['status']) => {
        try {
            const res = await fetch(`/api/requests`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });

            if (res.ok) {
                setRequests(prev => prev.map(r =>
                    r.id === id ? { ...r, status: newStatus } : r
                ));
            }
        } catch (error) {
            alert("ไม่สามารถอัปเดตสถานะได้");
        }
    };

    const handleExport = () => {
        const csvContent = convertToCSV(requests);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `flood-requests-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const filteredRequests = requests.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'pending') return r.status === 'pending';
        if (filter === 'completed') return r.status === 'completed';
        return true;
    });

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <main className="min-h-screen p-4 bg-[var(--background)]">
            <div className="container mx-auto animate-fade-in">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--primary)]">แดชบอร์ดกู้ภัย</h1>
                        <p className="text-[var(--text-secondary)]">
                            รอการช่วยเหลือ {pendingCount} รายการ
                        </p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            📥 Export CSV
                        </Button>
                        <div className="w-px h-8 bg-slate-300 mx-2 hidden md:block"></div>
                        <Button
                            variant={showMap ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setShowMap(!showMap)}
                        >
                            {showMap ? 'ซ่อนแผนที่' : 'แสดงแผนที่'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-red-600 hover:bg-red-50"
                        >
                            ออกจากระบบ
                        </Button>
                    </div>
                </header>

                <div className="flex justify-end mb-4 gap-2">
                    <Button
                        variant={filter === 'all' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        ทั้งหมด
                    </Button>
                    <Button
                        variant={filter === 'pending' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('pending')}
                    >
                        รอช่วยเหลือ
                    </Button>
                    <Button
                        variant={filter === 'completed' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('completed')}
                    >
                        เสร็จสิ้น
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">กำลังโหลด...</div>
                ) : (
                    <>
                        {showMap && <MapViewer requests={filteredRequests} />}

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRequests.map(request => (
                                <Card key={request.id} className="flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`
                                            px-2 py-1 rounded text-xs font-bold uppercase
                                            ${request.status === 'pending' ? 'bg-red-100 text-red-600' :
                                                request.status === 'in-progress' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-green-100 text-green-600'
                                            }
                                        `}>
                                            {request.status === 'pending' ? 'รอช่วยเหลือ' :
                                                request.status === 'in-progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {new Date(request.timestamp).toLocaleTimeString('th-TH')}
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-2 mb-6">
                                        <h3 className="text-lg font-bold">{request.name}</h3>

                                        {/* Unit & Priority Badges */}
                                        <div className="flex gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${request.priority === 'High'
                                                ? 'bg-red-50 text-red-600 border-red-200'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                ความสำคัญ: {request.priority === 'High' ? 'สูง' : 'ปกติ'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-medium border bg-blue-50 text-blue-600 border-blue-200">
                                                ทีม: {
                                                    request.assignedUnit === 'Medical' ? 'ทีมแพทย์' :
                                                        request.assignedUnit === 'Water Rescue' ? 'กู้ชีพทางน้ำ' :
                                                            request.assignedUnit === 'Supply' ? 'ทีมเสบียง' : 'ทีมทั่วไป'
                                                }
                                            </span>
                                        </div>

                                        <p className="text-sm">📞 <a href={`tel:${request.phone}`} className="hover:underline">{request.phone}</a></p>
                                        <p className="text-sm">📍 {request.location.address}</p>
                                        <p className="text-sm">👥 {request.peopleCount} คน</p>

                                        {request.location.lat && request.location.lng && (
                                            <a
                                                href={`https://www.openstreetmap.org/?mlat=${request.location.lat}&mlon=${request.location.lng}#map=16/${request.location.lat}/${request.location.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline block mt-1"
                                            >
                                                ดูแผนที่ (OpenStreetMap) ↗
                                            </a>
                                        )}

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {request.needs.map(need => (
                                                <span key={need} className="text-xs bg-slate-100 px-2 py-1 rounded">
                                                    {need}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-auto pt-4 border-t border-[var(--border)]">
                                        {request.status === 'pending' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                fullWidth
                                                onClick={() => updateStatus(request.id, 'in-progress')}
                                            >
                                                รับเรื่อง
                                            </Button>
                                        )}
                                        {request.status === 'in-progress' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                fullWidth
                                                onClick={() => updateStatus(request.id, 'completed')}
                                            >
                                                เสร็จสิ้นภารกิจ
                                            </Button>
                                        )}
                                        {request.status === 'completed' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                fullWidth
                                                disabled
                                            >
                                                เรียบร้อย
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}

                            {
                                filteredRequests.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                                        ไม่พบรายการคำร้องขอ
                                    </div>
                                )
                            }
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
