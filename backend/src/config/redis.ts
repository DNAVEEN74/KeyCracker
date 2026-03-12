import { createClient } from 'redis';
import { env } from './env';

export const redisClient = createClient({
    url: env.REDIS_URL,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

// BullMQ expects a slightly different format (ioredis or similar compatible connection),
// the fastify-redis plugin could also be used.
// We will export a basic connection config for BullMQ compatibility logic later.
export const redisConnection = {
    url: env.REDIS_URL,
};
