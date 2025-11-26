import { NextResponse } from 'next/server';
import { getEvacueesContainer } from '@/lib/cosmosdb';

export async function GET() {
    try {
        const container = await getEvacueesContainer();

        // Get Total Count
        const { resources: totalRes } = await container.items.query(
            "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'evacuee'"
        ).fetchAll();
        const total = totalRes[0] || 0;

        // Get Gender Stats
        const { resources: genderRes } = await container.items.query(
            "SELECT c.gender, COUNT(1) as count FROM c WHERE c.type = 'evacuee' GROUP BY c.gender"
        ).fetchAll();

        // Get District Stats
        const { resources: districtRes } = await container.items.query(
            "SELECT c.district, COUNT(1) as count FROM c WHERE c.type = 'evacuee' GROUP BY c.district"
        ).fetchAll();

        return NextResponse.json({
            total,
            byGender: genderRes,
            byDistrict: districtRes
        });

    } catch (error: any) {
        console.error("Failed to fetch stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
