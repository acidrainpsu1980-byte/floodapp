// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Expose required environment variables at build/runtime
    env: {
        COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
        COSMOS_KEY: process.env.COSMOS_KEY,
        COSMOS_DATABASE: process.env.COSMOS_DATABASE,
        COSMOS_CONTAINER: process.env.COSMOS_CONTAINER,
    },
    // Optional: silence middleware deprecation warning (if you have middleware files)
    // You can migrate them to "proxy" later.
};

module.exports = nextConfig;
