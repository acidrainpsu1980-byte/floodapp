"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { RequestData } from "@/lib/storage";
import { convertToCSV } from "@/lib/csv";
import ReportChart from '@/components/ReportChart';

// Stat Card Component
const StatCard = ({ title, value, color, icon }: { title: string, value: number | string, color: string, icon: string }) => (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${color} flex items-center justify-between`}>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="text-3xl opacity-20">{icon}</div>
    </div>
);

export default function DashboardPage() {
    const router = useRouter();
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [loading, setLoading] = useState(true);
    const [showMap, setShowMap] = useState(true);

    const MapViewer = useMemo(() => dynamic(
        () => import('@/components/MapViewer'),
        {
            loading: () => <div style={{ height: '600px' }} className="w-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">กำลังโหลดแผนที่...</div>,
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

    // Calculate Stats
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        critical: requests.filter(r => r.priority === 'High' && r.status !== 'completed').length,
        people: requests.reduce((sum, r) => sum + r.peopleCount, 0),
        completed: requests.filter(r => r.status === 'completed').length
    };

    const handleViewOnMap = (id: string) => {
        setSelectedRequestId(id);
        setShowMap(true); // Ensure map is visible
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top where map is
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            🚨 War Room กู้ภัยน้ำท่วม
                            <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">Live Status</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">ศูนย์บัญชาการและติดตามสถานการณ์แบบเรียลไทม์</p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                        <Button variant="outline" size="sm" onClick={handleExport} className="border-green-600 text-green-600 hover:bg-green-50">
                            📥 Export CSV
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:bg-red-50">
                            ออกจากระบบ
                        </Button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="คำขอทั้งหมด"
                        value={stats.total}
                        color="border-blue-500"
                        icon="📋"
                    />
                    <StatCard
                        title="รอการช่วยเหลือ"
                        value={stats.pending}
                        color="border-red-500"
                        icon="🆘"
                    />
                    <StatCard
                        title="เคสวิกฤต/ด่วน"
                        value={stats.critical}
                        color="border-orange-500"
                        icon="⚡"
                    />
                    <StatCard
                        title="ผู้ประสบภัย (คน)"
                        value={stats.people}
                        color="border-purple-500"
                        icon="👥"
                    />
                </div>

                {/* Main Content: Map & Charts */}
                <div className="space-y-6">
                    {/* Map Section (Full Width) */}
                    <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-700">📍 แผนที่สถานการณ์</h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
                                {showMap ? 'ซ่อนแผนที่' : 'แสดงแผนที่'}
                            </Button>
                        </div>
                        {showMap && <MapViewer requests={requests} selectedRequestId={selectedRequestId} />}
                    </div>

                    {/* Charts & Activity Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Chart */}
                        <ReportChart />

                        {/* Right: Activity Feed */}
                        <div className="bg-white p-4 rounded-lg shadow border border-slate-200 h-[400px] overflow-hidden flex flex-col">
                            <h2 className="text-lg font-bold text-slate-700 mb-3">📢 ความเคลื่อนไหวล่าสุด</h2>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {requests.slice(0, 10).map(req => (
                                    <div key={req.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 cursor-pointer hover:bg-slate-50 p-1 rounded" onClick={() => handleViewOnMap(req.id)}>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-800 truncate w-2/3">{req.name}</span>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(req.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${req.status === 'pending' ? 'bg-red-100 text-red-600' :
                                                req.status === 'in-progress' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                                }`}>
                                                {req.status === 'pending' ? 'รอ' : req.status === 'in-progress' ? 'กำลังทำ' : 'เสร็จ'}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate max-w-[100px]">{req.needs[0]}...</span>
                                        </div>
                                    </div>
                                ))}
                                {requests.length === 0 && <p className="text-center text-slate-400 py-4">ยังไม่มีข้อมูล</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed List Section */}
                <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-slate-800">📋 รายการคำร้องขอ ({filteredRequests.length})</h2>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            {(['all', 'pending', 'completed'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'รอช่วยเหลือ' : 'เสร็จสิ้น'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredRequests.map(request => (
                                <Card key={request.id} className="flex flex-col h-full border hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${request.status === 'pending' ? 'bg-red-100 text-red-600' :
                                            request.status === 'in-progress' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                            {request.status === 'pending' ? 'รอช่วยเหลือ' :
                                                request.status === 'in-progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                                        </span>
                                        {request.priority === 'High' && (
                                            <span className="text-xs font-bold text-red-600 animate-pulse">⚡ ด่วน</span>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2 mb-4">
                                        <h3 className="font-bold text-slate-800 truncate">{request.name}</h3>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <p className="flex items-center gap-2">📞 <a href={`tel:${request.phone}`} className="hover:underline">{request.phone}</a></p>
                                            <div className="flex items-center gap-1">
                                                <p className="truncate flex-1">📍 {request.location.address}</p>
                                                {request.location.lat && request.location.lng && (
                                                    <button
                                                        onClick={() => handleViewOnMap(request.id)}
                                                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 whitespace-nowrap"
                                                    >
                                                        🗺️ ดูแผนที่
                                                    </button>
                                                )}
                                            </div>
                                            <p>👥 {request.peopleCount} คน • <span className="text-blue-600">{request.assignedUnit}</span></p>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {request.needs.map(need => (
                                                <span key={need} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                                    {need}
                                                </span>
                                            ))}
                                        </div>

                                        {request.note && (
                                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800 border border-yellow-100">
                                                📝 {request.note}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 mt-auto flex gap-2">
                                        {request.status === 'pending' && (
                                            <Button variant="primary" size="sm" fullWidth onClick={() => updateStatus(request.id, 'in-progress')}>
                                                รับงาน
                                            </Button>
                                        )}
                                        {request.status === 'in-progress' && (
                                            <Button variant="secondary" size="sm" fullWidth onClick={() => updateStatus(request.id, 'completed')}>
                                                ปิดงาน
                                            </Button>
                                        )}
                                        {request.status === 'completed' && (
                                            <span className="text-center w-full text-xs text-green-600 font-medium py-1">
                                                ✓ เรียบร้อยแล้ว
                                            </span>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {filteredRequests.length === 0 && (
                                <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    ไม่พบรายการคำร้องขอ
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
