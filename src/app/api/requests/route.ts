import { NextResponse } from 'next/server';
import { RequestData } from '@/lib/storage';
import { getAllRequests, createRequest, updateRequest } from '@/lib/cosmosdb';

export async function GET() {
    try {
        const requests = await getAllRequests();
        return NextResponse.json(requests);
    } catch (error) {
        console.error("Failed to fetch requests:", error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.phone || !body.location || !body.needs || !Array.isArray(body.needs)) {
            return NextResponse.json({ error: 'Missing required fields or invalid needs format' }, { status: 400 });
        }

        // Auto-Assignment Logic
        let assignedUnit: 'Medical' | 'Water Rescue' | 'Supply' | 'General' = 'General';
        let priority: 'High' | 'Normal' = 'Normal';

        if (body.needs.includes("ยารักษาโรค")) {
            assignedUnit = 'Medical';
            priority = 'High';
        } else if (body.needs.includes("อพยพ")) {
            assignedUnit = 'Water Rescue';
            priority = 'High';
        } else if (body.needs.includes("อาหารและน้ำดื่ม") || body.needs.includes("เสื้อผ้า")) {
            assignedUnit = 'Supply';
        }

        const newRequest: RequestData = {
            id: Math.random().toString(36).substring(7),
            ...body,
            status: 'pending',
            assignedUnit,
            priority,
            timestamp: new Date().toISOString(),
        };

        const savedRequest = await createRequest(newRequest);
        return NextResponse.json(savedRequest, { status: 201 });
    } catch (error) {
        console.error("Failed to process request:", error);
        return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
        }

        const updatedRequest = await updateRequest(id, updates);
        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error("Failed to update request:", error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}

