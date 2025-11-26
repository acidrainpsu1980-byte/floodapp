import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });

async function listOffers() {
    try {
        const { resources: offers } = await client.offers.readAll().fetchAll();
        console.log(`Found ${offers.length} offers:`);
        for (const offer of offers) {
            console.log(`- ID: ${offer.id}, Resource: ${offer.resource}, Throughput: ${offer.content?.offerThroughput}`);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listOffers();
