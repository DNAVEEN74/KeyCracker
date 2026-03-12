import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { redisClient } from '../config/redis';
import { prisma } from '../config/database';

export const rankingWorker = new Worker(
    'ranking-calculation',
    async (job) => {
        const { examId } = job.data;
        console.log(`Syncing rankings for exam: ${examId}`);

        // Sync Redis sorted set to PostgreSQL
        const redisRankings = await redisClient.zRangeWithScores(`rankings:${examId}`, 0, -1, { REV: true });

        const updates = [];
        for (let i = 0; i < redisRankings.length; i++) {
            const item = redisRankings[i];
            updates.push(
                prisma.userSession.update({
                    where: { id: item.value },
                    data: { currentRank: i + 1, totalScore: item.score }
                })
            );
        }

        await Promise.all(updates);

        return { updatedCount: updates.length };
    },
    {
        connection: redisConnection,
        concurrency: 1,
    }
);
