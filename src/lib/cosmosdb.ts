import { CosmosClient, Database, Container } from '@azure/cosmos';
import { RequestData } from './storage';

// Initialize Cosmos DB client
const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = "FloodReliefDB"; // Hardcoded for reliability
const containerId = "tsRequests"; // Actual container name in Azure

const client = new CosmosClient({ endpoint, key });
let database: Database;
let container: Container;

// Initialize database and container
async function initCosmosDB() {
    if (!database) {
        database = client.database(databaseId);
    }
    if (!container) {
        container = database.container(containerId);
    }
}

export async function getEvacueesContainer() {
    await initCosmosDB();
    // Reuse existing container to avoid quota limits
    return database.container("tsRequests");
}

// Get all requests
export async function getAllRequests(): Promise<RequestData[]> {
    await initCosmosDB();

    const querySpec = {
        query: "SELECT * FROM c WHERE (NOT IS_DEFINED(c.type) OR (c.type != 'evacuee' AND c.type != 'news')) ORDER BY c.timestamp DESC"
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources as RequestData[];
}

// Create a new request
export async function createRequest(request: RequestData): Promise<RequestData> {
    await initCosmosDB();

    console.log('Creating request with data:', request);
    console.log('Database:', databaseId, 'Container:', containerId);
    console.log('Endpoint:', endpoint);

    try {
        const { resource } = await container.items.create(request);
        console.log('Successfully created:', resource);
        return resource as RequestData;
    } catch (error: any) {
        console.error('Cosmos DB Error Details:', {
            code: error.code,
            message: error.message,
            body: error.body
        });
        throw error;
    }
}

// Update a request
export async function updateRequest(id: string, updates: Partial<RequestData>): Promise<RequestData> {
    await initCosmosDB();

    // First, get the existing item
    const { resource: existingItem } = await container.item(id, id).read();

    // Merge updates
    const updatedItem = { ...existingItem, ...updates };

    // Replace the item
    const { resource } = await container.item(id, id).replace(updatedItem);
    return resource as RequestData;
}

// Delete a request (optional, for future use)
export async function deleteRequest(id: string): Promise<void> {
    await initCosmosDB();
    await container.item(id, id).delete();
}

// Get container instance (for bulk operations)
export async function getContainer(): Promise<Container> {
    await initCosmosDB();
    return container;
}
