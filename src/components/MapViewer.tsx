"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip, LayersControl, LayerGroup } from "react-leaflet";
import L from "leaflet";
import { RequestData } from "@/lib/storage";
import { useEffect } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.heat";

// Heatmap Component
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // @ts-ignore - leaflet.heat is not fully typed in some versions
        const heat = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
        });

        heat.addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
};

// Helper to get icon based on status/priority (Colorblind Friendly)
// High Priority: Vermilion (#D55E00) -> Red marker
// Normal Pending: Sky Blue (#56B4E9) -> Blue marker
// In Progress: Orange (#E69F00) -> Gold/Orange marker
// Completed: Bluish Green (#009E73) -> Green marker
const getIcon = (status: string, priority: string) => {
    let color = 'blue'; // Default (Normal Pending)

    if (status === 'completed') color = 'green';
    else if (status === 'in-progress') color = 'gold';
    else if (priority === 'High') color = 'red';
    else if (status === 'pending') color = 'violet'; // Use violet for normal pending to distinguish from default blue

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
                map.flyTo([target.location.lat, target.location.lng], 18, {
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

    // Prepare heatmap data: [lat, lng, intensity]
    // High priority has higher intensity (1.0), Normal (0.5)
    const heatmapPoints: [number, number, number][] = validRequests.map(r => [
        r.location.lat!,
        r.location.lng!,
        r.priority === 'High' ? 1.0 : 0.5
    ]);

    return (
        <div style={{ height: '600px', width: '100%', display: 'block' }} className="rounded-lg overflow-hidden border border-[var(--border)] shadow-md bg-slate-100 relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <MapController selectedRequestId={selectedRequestId} requests={requests} />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Satellite (Esri)">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.Overlay checked name="Markers (Clustered)">
                        <MarkerClusterGroup chunkedLoading>
                            {validRequests.map(request => (
                                <Marker
                                    key={request.id}
                                    position={[request.location.lat!, request.location.lng!]}
                                    icon={getIcon(request.status, request.priority)}
                                >
                                    <Tooltip direction="bottom" offset={[0, 10]} opacity={0.9}>
                                        <span className="font-semibold">{request.name}</span>
                                    </Tooltip>
                                    <Popup>
                                        <div className="p-1 min-w-[200px]">
                                            <strong className="text-base block mb-1">{request.name}</strong>
                                            <div className="text-sm text-gray-600 mb-2 space-y-1">
                                                <p className="flex items-center gap-2">📞 <a href={`tel:${request.phone}`} className="text-blue-600 hover:underline">{request.phone}</a></p>
                                                <p>👥 {request.peopleCount} คน</p>
                                                <p>🚑 {request.needs.join(", ")}</p>
                                            </div>
                                            <div className="flex gap-2 items-center mb-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${request.status === 'pending' ? 'bg-violet-500' :
                                                        request.status === 'in-progress' ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}>
                                                    {request.status === 'pending' ? 'รอช่วยเหลือ' :
                                                        request.status === 'in-progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                                                </span>
                                                {request.priority === 'High' && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white animate-pulse">
                                                        🚨 ด่วน
                                                    </span>
                                                )}
                                            </div>
                                            {request.note && (
                                                <p className="mt-2 text-xs text-gray-500 border-t pt-1 italic">
                                                    "{request.note}"
                                                </p>
                                            )}
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${request.location.lat},${request.location.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block mt-2 text-center bg-blue-600 text-white text-xs py-2 rounded hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                                            >
                                                �️ นำทาง (Google Maps)
                                            </a>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    </LayersControl.Overlay>

                    <LayersControl.Overlay name="Heatmap (พื้นที่วิกฤต)">
                        <LayerGroup>
                            <HeatmapLayer points={heatmapPoints} />
                        </LayerGroup>
                    </LayersControl.Overlay>
                </LayersControl>
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl text-xs z-[400] border border-slate-200">
                <div className="font-bold mb-2 text-slate-700 border-b pb-1">สัญลักษณ์ (Colorblind Friendly)</div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-sm inline-block"></span>
                        <span>🚨 ด่วนมาก (High Priority)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-violet-500 border border-white shadow-sm inline-block"></span>
                        <span>รอช่วยเหลือ (Pending)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-400 border border-white shadow-sm inline-block"></span>
                        <span>กำลังดำเนินการ (In Progress)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm inline-block"></span>
                        <span>เสร็จสิ้น (Completed)</span>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                    *เลือก Layer มุมขวาบนเพื่อเปิด/ปิด Heatmap
                </div>
            </div>
        </div>
    );
}
