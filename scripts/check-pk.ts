import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

const client = new CosmosClient({ endpoint, key });

async function checkContainer() {
    const container = client.database(databaseName).container("tsRequests");
    const { resource } = await container.read();
    console.log("Container ID:", resource?.id);
    console.log("Partition Key:", resource?.partitionKey);
}

checkContainer();
