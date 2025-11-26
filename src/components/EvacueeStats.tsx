"use client";

import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function EvacueeStats() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/evacuees/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="text-center py-8 text-slate-400 animate-pulse">กำลังโหลดข้อมูลสถิติ...</div>;
    if (!stats) return null;

    const genderData = {
        labels: stats.byGender.map((g: any) => g.gender || 'ไม่ระบุ'),
        datasets: [
            {
                data: stats.byGender.map((g: any) => g.count),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const districtData = {
        labels: stats.byDistrict.map((d: any) => d.district || 'ไม่ระบุ'),
        datasets: [
            {
                label: 'จำนวนผู้อพยพ (คน)',
                data: stats.byDistrict.map((d: any) => d.count),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">📊 สรุปยอดผู้อพยพ (Real-time)</h2>

            <div className="grid md:grid-cols-3 gap-8 items-center">
                {/* Total Count */}
                <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-slate-500 font-medium mb-2">ยอดรวมทั้งหมด</p>
                    <p className="text-5xl font-extrabold text-blue-600">{stats.total.toLocaleString()}</p>
                    <p className="text-sm text-slate-400 mt-2">คน</p>
                </div>

                {/* Gender Chart */}
                <div className="h-64 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-bold text-slate-600 mb-4">จำแนกตามเพศ</h3>
                    <div className="w-full h-full max-w-[200px]">
                        <Pie data={genderData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>

                {/* District Chart */}
                <div className="h-64 flex flex-col items-center justify-center w-full">
                    <h3 className="text-sm font-bold text-slate-600 mb-4">จำแนกตามอำเภอ</h3>
                    <div className="w-full h-full">
                        <Bar
                            data={districtData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true } }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
