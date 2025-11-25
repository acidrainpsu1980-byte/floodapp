"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { RequestData } from "@/lib/storage";
import { useEffect } from "react";

// Helper to get icon based on status/priority
const getIcon = (status: string, priority: string) => {
    let color = 'blue';
    if (status === 'completed') color = 'green';
    else if (status === 'in-progress') color = 'gold';
    else if (priority === 'High') color = 'red'; // Pending + High Priority
    else if (status === 'pending') color = 'orange'; // Pending + Normal

    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

// Component to handle map interactions
const MapController = ({ selectedRequestId, requests }: { selectedRequestId?: string | null, requests: RequestData[] }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedRequestId) {
            const target = requests.find(r => r.id === selectedRequestId);
            if (target?.location?.lat && target?.location?.lng) {
                map.flyTo([target.location.lat, target.location.lng], 16, {
                    animate: true,
                    duration: 1.5
                });
            }
        }
    }, [selectedRequestId, requests, map]);

    return null;
};

interface MapViewerProps {
    requests: RequestData[];
    selectedRequestId?: string | null;
}

export default function MapViewer({ requests, selectedRequestId }: MapViewerProps) {
    // Default to Hat Yai coordinates
    const defaultCenter: [number, number] = [7.0086, 100.4747];

    // Filter requests that have location data
    const validRequests = requests.filter(r => r.location.lat && r.location.lng);

    console.log("MapViewer rendering with requests:", requests.length);

    return (
        <div style={{ height: '600px', width: '100%', display: 'block' }} className="rounded-lg overflow-hidden border border-[var(--border)] shadow-md bg-slate-100 relative">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <MapController selectedRequestId={selectedRequestId} requests={requests} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validRequests.map(request => (
                    <Marker
                        key={request.id}
                        position={[request.location.lat!, request.location.lng!]}
                        icon={getIcon(request.status, request.priority)}
                    >
                        <Popup>
                            <div className="p-1">
                                <strong className="text-base block mb-1">{request.name}</strong>
                                <div className="text-sm text-gray-600 mb-2">
                                    <p>📞 {request.phone}</p>
                                    <p>👥 {request.peopleCount} คน</p>
                                    <p>🚑 {request.needs.join(", ")}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${request.status === 'pending' ? 'bg-red-500' :
                                        request.status === 'in-progress' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}>
                                        {request.status === 'pending' ? 'รอช่วยเหลือ' :
                                            request.status === 'in-progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                                    </span>
                                    {request.priority === 'High' && (
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                                            ด่วน
                                        </span>
                                    )}
                                </div>
                                {request.note && (
                                    <p className="mt-2 text-xs text-gray-500 border-t pt-1">
                                        📝 {request.note}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow-lg text-xs z-[1000] opacity-90">
                <div className="font-bold mb-1">สัญลักษณ์</div>
                <div className="flex items-center gap-1 mb-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> ด่วน / รอช่วยเหลือ</div>
                <div className="flex items-center gap-1 mb-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span> รอช่วยเหลือ (ปกติ)</div>
                <div className="flex items-center gap-1 mb-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> กำลังดำเนินการ</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> เสร็จสิ้น</div>
            </div>
        </div>
    );
}
