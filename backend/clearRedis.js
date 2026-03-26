const { createClient } = require('redis');

async function clear() {
    console.log("Connecting to Redis...");
    const client = createClient();
    
    client.on('error', (err) => console.log('Redis Client Error', err));
    
    await client.connect();
    
    console.log("Wiping all Redis keys (BullMQ queues, locks, etc.)...");
    await client.sendCommand(['FLUSHALL']);
    
    console.log("✅ Redis queues completely cleared!");
    process.exit(0);
}

clear();
