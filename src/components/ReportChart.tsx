"use client";
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface RequestData {
    id: string;
    name: string;
    phone: string;
    location: { address: string; lat: number; lng: number };
    peopleCount: number;
    needs: string[];
    status: string;
    assignedUnit: string;
    priority: string;
    timestamp: string;
}

export default function ReportChart() {
    const [data, setData] = useState<RequestData[]>([]);
    const [chartData, setChartData] = useState<any>(null);

    useEffect(() => {
        async function fetchRequests() {
            try {
                const res = await fetch('/api/requests');
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error('Failed to fetch requests for report', e);
            }
        }
        fetchRequests();
    }, []);

    useEffect(() => {
        if (!data.length) return;
        // Aggregate counts per need
        const needCounts: Record<string, number> = {};
        data.forEach((req) => {
            req.needs.forEach((need) => {
                needCounts[need] = (needCounts[need] || 0) + 1;
            });
        });
        const labels = Object.keys(needCounts);
        const counts = labels.map((label) => needCounts[label]);
        setChartData({
            labels,
            datasets: [
                {
                    label: 'จำนวนคำขอ (ตามความต้องการ)',
                    data: counts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
            ],
        });
    }, [data]);

    if (!chartData) {
        return <p className="text-center">กำลังโหลดกราฟ...</p>;
    }

    return (
        <div className="my-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-center">สรุปความต้องการ (กราฟ)</h2>
            <Bar
                data={chartData}
                options={{
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: false },
                    },
                }}
            />
        </div>
    );
}
