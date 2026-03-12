import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

export default async function answerRoutes(server: FastifyInstance) {
    server.get('/', async (request, reply) => {
        const { sessionToken } = request.query as { sessionToken: string };

        try {
            const session = await prisma.userSession.findUnique({
                where: { sessionToken },
                include: { answers: true },
            });

            if (!session) return reply.code(404).send({ error: 'Session not found' });

            return { answers: session.answers };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch answers' });
        }
    });

    server.get('/stats/:examId', async (request, reply) => {
        const { examId } = request.params as { examId: string };

        try {
            const stats = await prisma.questionStatistics.findMany({
                where: { examId },
                orderBy: { questionNumber: 'asc' },
            });

            return { stats };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch statistics' });
        }
    });
}
