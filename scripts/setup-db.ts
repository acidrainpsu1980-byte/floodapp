import { CosmosClient } from "@azure/cosmos";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'FloodReliefDB';

if (!endpoint || !key) {
    console.error("Please set COSMOS_ENDPOINT and COSMOS_KEY in .env.local");
    process.exit(1);
}

const client = new CosmosClient({ endpoint, key });

async function setupDB() {
    try {
        const database = client.database(databaseName);
        console.log(`Checking database: ${databaseName}`);

        // Check if database exists
        try {
            await database.read();
            console.log("Database exists.");
        } catch (e) {
            console.log("Database does not exist, creating...");
            await client.databases.create({ id: databaseName });
        }

        // Try to create Evacuees container
        console.log("Creating/Checking 'Evacuees' container...");
        try {
            // Try to create with shared throughput (no explicit throughput)
            // If the database has shared throughput, this will work.
            // If not, it will default to 400 RU/s dedicated.
            await database.containers.createIfNotExists({
                id: "Evacuees",
                partitionKey: "/district"
            });
            console.log("Container 'Evacuees' is ready.");
        } catch (err: any) {
            console.error("Failed to create 'Evacuees' container.");
            console.error("Error:", err.message);

            if (err.message.includes("throughput limit")) {
                console.log("\n⚠️  QUOTA EXCEEDED: Your Azure Cosmos DB account has a limit of 1000 RU/s.");
                console.log("You are likely using 1000 RU/s already (e.g., 400 for 'tsRequests' + others).");
                console.log("To fix this, you have two options:");
                console.log("1. Go to Azure Portal -> Cosmos DB -> Data Explorer -> Scale Settings");
                console.log("2. Increase the total throughput limit.");
                console.log("OR delete an unused container if you have one.");
            }
        }

    } catch (error) {
        console.error("Setup failed:", error);
    }
}

setupDB();
