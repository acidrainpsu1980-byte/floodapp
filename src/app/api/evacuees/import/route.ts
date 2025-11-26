import { NextRequest, NextResponse } from 'next/server';
import { getEvacueesContainer } from '@/lib/cosmosdb';

export async function POST(request: NextRequest) {
    try {
        const { evacuees } = await request.json();

        if (!Array.isArray(evacuees) || evacuees.length === 0) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        const container = await getEvacueesContainer();

        // Ensure container exists
        await container.database.containers.createIfNotExists({ id: "Evacuees", partitionKey: "/district" });

        let successCount = 0;
        let errorCount = 0;
        let firstError = null;

        // Process in batches to avoid timeouts
        const batchSize = 50;
        for (let i = 0; i < evacuees.length; i += batchSize) {
            const batch = evacuees.slice(i, i + batchSize);
            await Promise.all(batch.map(async (evacuee: any) => {
                try {
                    // Ensure ID exists
                    if (!evacuee.id) {
                        evacuee.id = `evac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    }
                    evacuee.importedAt = new Date().toISOString();

                    await container.items.create(evacuee);
                    successCount++;
                } catch (err: any) {
                    console.error("Error importing item:", err);
                    if (!firstError) firstError = err.message || err;
                    errorCount++;
                }
            }));
        }

        return NextResponse.json({
            message: "Import completed",
            successCount,
            errorCount,
            firstError
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
