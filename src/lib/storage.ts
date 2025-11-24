import fs from 'fs';
import path from 'path';

export interface RequestData {
    id: string;
    name: string;
    phone: string;
    location: {
        address: string;
        lat?: number;
        lng?: number;
    };
    peopleCount: number;
    needs: string[];
    status: 'pending' | 'in-progress' | 'completed';
    assignedUnit: 'Medical' | 'Water Rescue' | 'Supply' | 'General';
    priority: 'High' | 'Normal';
    timestamp: string;
}

const DATA_FILE = path.join(process.cwd(), 'data.json');

export function getRequests(): RequestData[] {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export function saveRequest(request: Omit<RequestData, 'id' | 'timestamp' | 'status'>): RequestData {
    const requests = getRequests();
    const newRequest: RequestData = {
        ...request,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        status: 'pending',
    };

    requests.push(newRequest);
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
    return newRequest;
}

export function updateRequestStatus(id: string, status: RequestData['status']): RequestData | null {
    const requests = getRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index === -1) return null;

    requests[index].status = status;
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
    return requests[index];
}
