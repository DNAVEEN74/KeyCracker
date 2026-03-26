import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Queue definitions
export const imagePipelineQueue = new Queue('image-pipeline', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 30_000,
        },
    },
});

export const rankingQueue = new Queue('ranking-calculation', { connection: redisConnection });
