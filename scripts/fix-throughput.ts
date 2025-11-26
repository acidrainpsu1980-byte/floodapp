import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

const client = new CosmosClient({ endpoint, key });

async function fixThroughput() {
    const database = client.database(databaseName);
    const container = database.container("tsRequests");

    try {
        // Get current offer
        const { resources: offers } = await client.offers.readAll().fetchAll() as { resources: any[] };
        const offer = offers.find((o: any) => o.resource === container.url);

        if (offer) {
            console.log(`Current throughput for tsRequests: ${offer.content.offerThroughput}`);

            // Try to reduce to 400
            if (offer.content.offerThroughput > 400) {
                console.log("Reducing throughput to 400...");
                const newOffer = { ...offer, content: { ...offer.content, offerThroughput: 400 } };
                await client.offer(offer.id).replace(newOffer);
                console.log("Throughput reduced to 400 RU/s.");
            } else {
                console.log("Throughput is already at minimum (400).");
            }
        } else {
            console.log("Could not find offer for container. It might be using database-level shared throughput.");
            // Check database offer
            const dbOffer = offers.find((o: any) => o.resource === database.url);
            if (dbOffer) {
                console.log(`Database shared throughput: ${dbOffer.content.offerThroughput}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

fixThroughput();
