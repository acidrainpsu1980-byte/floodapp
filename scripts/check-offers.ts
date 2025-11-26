import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });

async function checkOffers() {
    const { resources: offers } = await client.offers.readAll().fetchAll();
    console.log(`Found ${offers.length} offers.`);

    for (const offer of offers) {
        console.log(`Offer ID: ${offer.id}`);
        console.log(`- Resource Link: ${offer.resource}`);
        console.log(`- Throughput: ${offer.content?.offerThroughput}`);
        console.log(`- Offer Type: ${offer.offerType}`);
        console.log(`- Content:`, offer.content);
    }
}

checkOffers();
