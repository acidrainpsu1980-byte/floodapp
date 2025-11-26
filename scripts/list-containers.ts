import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

const client = new CosmosClient({ endpoint, key });

async function listContainers() {
    const database = client.database(databaseName);
    const { resources } = await database.containers.readAll().fetchAll();
    console.log(`Containers in ${databaseName}:`);
    for (const c of resources) {
        console.log(`- ${c.id}`);
        // Try to read offer (throughput)
        try {
            // This is a bit complex in SDK, simplified check:
            // const offer = await client.offers.readAll()... 
            // We'll just list names for now.
        } catch (e) { }
    }
}

listContainers();
