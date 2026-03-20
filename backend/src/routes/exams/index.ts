import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

export default async function examRoutes(server: FastifyInstance) {
    server.get('/', async (request: any, reply: any) => {
        try {
            const exams = await prisma.exam.findMany({
                orderBy: { examDate: 'desc' },
            });
            return { exams };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch exams' });
        }
    });

    server.get('/:slug', async (request: any, reply: any) => {
        const { slug } = request.params as { slug: string };

        try {
            const exam = await prisma.exam.findUnique({
                where: { slug },
            });

            if (!exam) {
                return reply.code(404).send({ error: 'Exam not found' });
            }

            return { exam };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch exam details' });
        }
    });
}
