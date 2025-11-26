import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });

async function listDatabases() {
    const { resources: dbs } = await client.databases.readAll().fetchAll();
    console.log(`Found ${dbs.length} databases:`);
    for (const db of dbs) {
        console.log(`- ${db.id}`);
        const { resources: containers } = await client.database(db.id).containers.readAll().fetchAll();
        for (const c of containers) {
            console.log(`  - Container: ${c.id}`);
        }
    }
}

listDatabases();
