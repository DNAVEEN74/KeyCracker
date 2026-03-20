import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

export default async function rankingsRoutes(server: FastifyInstance) {
    server.get('/:examId', async (request: any, reply: any) => {
        const { examId } = request.params as { examId: string };
        const { sessionToken } = request.query as { sessionToken?: string };

        try {
            let userRank: number | null = null;
            let userScore: number | null = null;
            let userPercentile: number | null = null;

            if (sessionToken) {
                const session = await prisma.userSession.findUnique({
                    where: { sessionToken },
                    select: { id: true, totalScore: true, createdAt: true, examId: true, parsingStatus: true },
                });

                if (session && session.parsingStatus === 'completed' && session.examId === examId) {
                    userScore = session.totalScore;

                    const higherCount = await prisma.userSession.count({
                        where: {
                            examId,
                            parsingStatus: 'completed',
                            OR: [
                                { totalScore: { gt: session.totalScore } },
                                {
                                    AND: [
                                        { totalScore: session.totalScore },
                                        { createdAt: { lt: session.createdAt } },
                                    ]
                                }
                            ]
                        }
                    });

                    userRank = higherCount + 1;
                }
            }

            const totalParticipants = await prisma.userSession.count({
                where: { examId, parsingStatus: 'completed' }
            });

            if (userRank && totalParticipants > 0) {
                // Higher percentile means better performance.
                userPercentile = Number((((totalParticipants - userRank + 1) / totalParticipants) * 100).toFixed(2));
            }

            const topRankings = await prisma.userSession.findMany({
                where: { examId, parsingStatus: 'completed' },
                orderBy: [{ totalScore: 'desc' }, { createdAt: 'asc' }],
                take: 100,
                select: { id: true, totalScore: true, currentRank: true }
            });

            const topRankingsWithRank = topRankings.map((item, index) => ({
                id: item.id,
                score: item.totalScore,
                rank: item.currentRank ?? index + 1,
            }));

            const aggregates = await prisma.userSession.aggregate({
                where: { examId, parsingStatus: 'completed' },
                _avg: { totalScore: true },
                _max: { totalScore: true },
            });

            return {
                topRankings: topRankingsWithRank,
                user: { rank: userRank, score: userScore, percentile: userPercentile },
                metrics: {
                    totalParticipants,
                    averageScore: Number((aggregates._avg.totalScore ?? 0).toFixed(2)),
                    highestScore: Number((aggregates._max.totalScore ?? 0).toFixed(2)),
                }
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch rankings' });
        }
    });

    server.get('/:examId/leaderboard', async (request: any, reply: any) => {
        const { examId } = request.params as { examId: string };

        // Simply wrap the existing logic for the public leaderboard
        try {
            const aggregates = await prisma.userSession.aggregate({
                where: { examId, parsingStatus: 'completed' },
                _avg: { totalScore: true },
                _max: { totalScore: true },
                _count: { _all: true },
            });

            const leaderboard = await prisma.userSession.findMany({
                where: { examId, parsingStatus: 'completed' },
                orderBy: [{ totalScore: 'desc' }, { createdAt: 'asc' }],
                take: 100,
                select: { id: true, totalScore: true, currentRank: true } // Avoid sending tokens
            });

            return {
                leaderboard: leaderboard.map((item, index) => ({
                    id: item.id,
                    rank: item.currentRank ?? index + 1,
                    score: item.totalScore,
                })),
                metrics: {
                    totalParticipants: aggregates._count._all,
                    averageScore: Number((aggregates._avg.totalScore ?? 0).toFixed(2)),
                    highestScore: Number((aggregates._max.totalScore ?? 0).toFixed(2)),
                }
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch leaderboard' });
        }
    });
}
