import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

const client = new CosmosClient({ endpoint, key });

async function switchToManual() {
    const database = client.database(databaseName);
    const container = database.container("tsRequests");

    try {
        // Get container RID
        const { resource: containerDef } = await container.read();
        if (!containerDef) {
            console.log("Container not found.");
            return;
        }
        console.log(`Container RID: ${containerDef._rid}`);

        const { resources: offers } = await client.offers.readAll().fetchAll() as { resources: any[] };
        // Match offer resource to container RID (Self Link usually contains RID but offer resource is just the RID path)
        // Offer resource looks like: dbs/RID/colls/RID/
        // Container _self looks like: dbs/RID/colls/RID/

        const offer = offers.find((o: any) => o.resource === containerDef._self);

        if (offer) {
            console.log("Found offer for tsRequests.");
            console.log("Current settings:", offer.content);

            // Check if autoscale
            if (offer.content.offerAutopilotSettings) {
                console.log("Container is using Autoscale. Switching to Manual 400 RU/s...");

                const newOffer = {
                    ...offer,
                    content: {
                        offerThroughput: 400,
                        offerAutopilotSettings: undefined // Remove autoscale
                    }
                };

                // Note: Removing a property might require sending the object without it.
                // Let's try to just set offerThroughput and remove the autopilot key entirely if possible.
                // Actually, replacing the offer with a standard one should work.

                delete newOffer.content.offerAutopilotSettings;

                // Add required header for migration
                await client.offer(offer.id).replace(newOffer, {
                    initialHeaders: {
                        'x-ms-cosmos-migrate-offer-to-manual-throughput': 'true'
                    }
                });
                console.log("Successfully switched to Manual 400 RU/s.");
            } else {
                console.log("Container is already using Manual throughput.");
                if (offer.content.offerThroughput > 400) {
                    console.log("Reducing to 400...");
                    const reducedOffer = { ...offer, content: { ...offer.content, offerThroughput: 400 } };
                    await client.offer(offer.id).replace(reducedOffer);
                    console.log("Reduced to 400.");
                }
            }
        } else {
            console.log("Offer not found.");
        }

    } catch (error: any) {
        console.error("Error switching throughput:", error.message);
    }
}

switchToManual();
