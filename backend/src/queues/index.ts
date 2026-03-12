import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis';

// Queue definitions
export const schemaQueue = new Queue('schema-extraction', { connection: redisConnection });
export const parsingQueue = new Queue('answer-parsing', { connection: redisConnection });
export const solutionQueue = new Queue('solution-generation', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 10, // Retry up to 10 times on failure (429 rate limit)
        backoff: {
            type: 'exponential',
            delay: 45_000, // Start with 45s, then 90s, 180s... stays under 5 RPM
        },
    },
});
export const rankingQueue = new Queue('ranking-calculation', { connection: redisConnection });
export const refreshQueue = new Queue('cache-refresh', { connection: redisConnection });
