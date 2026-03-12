import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

export default async function solutionRoutes(server: FastifyInstance) {
    server.get('/:examId', async (request, reply) => {
        const { examId } = request.params as { examId: string };

        try {
            const solutions = await prisma.solution.findMany({
                where: { examId, generationStatus: 'completed' },
                orderBy: { questionNumber: 'asc' },
            });
            return { solutions };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch solutions' });
        }
    });

    server.get('/:examId/:questionNumber', async (request, reply) => {
        const { examId, questionNumber } = request.params as { examId: string; questionNumber: string };

        try {
            const solution = await prisma.solution.findUnique({
                where: { examId_questionNumber: { examId, questionNumber: parseInt(questionNumber, 10) } },
            });

            if (!solution) return reply.code(404).send({ error: 'Solution not found' });

            // Increment view count asynchronously
            prisma.solution.update({
                where: { id: solution.id },
                data: { viewCount: { increment: 1 } },
            }).catch(server.log.error);

            return { solution };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch solution details' });
        }
    });
}
