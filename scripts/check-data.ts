import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

const client = new CosmosClient({ endpoint, key });

async function checkData() {
    const container = client.database(databaseName).container("tsRequests");
    const { resources } = await container.items.query("SELECT TOP 1 * FROM c").fetchAll();
    console.log("Sample Data:", resources[0]);
}

checkData();
