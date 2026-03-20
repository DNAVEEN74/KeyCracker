import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import * as crypto from 'crypto';
import { imagePipelineQueue } from '../../queues';

// Need to implement auth middleware to inject user session or we will just use tokens directly

export default async function sessionRoutes(server: FastifyInstance) {
    server.post('/', async (request: any, reply: any) => {
        const { examId } = request.body as { examId: string };

        try {
            // The frontend passes the URL 'slug' as the examId.
            let exam = await prisma.exam.findUnique({ where: { slug: examId } });

            // Fallback in case they pass actual cuid
            if (!exam) {
                exam = await prisma.exam.findUnique({ where: { id: examId } });
            }

            // AUTO-CREATE: If the exam doesn't exist, dynamically create it to allow AI processing
            if (!exam) {
                const generatedSlug = examId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const generatedName = examId.toUpperCase().replace(/-/g, ' ');

                exam = await prisma.exam.create({
                    data: {
                        slug: generatedSlug,
                        name: generatedName,
                        board: 'UNKNOWN', // Will be determined by AI schema later
                        examDate: new Date(), // AI might refine this
                        totalQuestions: 100,
                        totalMarks: 200,
                        duration: 120,
                        markingScheme: { correct: 2, wrong: -0.5, unattempted: 0 }
                    }
                });
            }

            const sessionToken = crypto.randomBytes(32).toString('base64url');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

            const session = await prisma.userSession.create({
                data: {
                    sessionToken,
                    examId: exam.id, // Use the actual CUID from the DB, not the original URL slug
                    parsingStatus: 'pending',
                    processingStage: null,
                    expiresAt,
                },
            });

            return {
                sessionId: session.id,
                sessionToken,
                exam,
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to create session' });
        }
    });

    server.get('/:token', async (request: any, reply: any) => {
        const { token } = request.params as { token: string };

        try {
            const session = await prisma.userSession.findUnique({
                where: { sessionToken: token },
                include: {
                    exam: true
                }
            });

            if (!session) return reply.code(404).send({ error: 'Session not found' });

            return {
                ...session,
                // Backward-compatible aliases expected by frontend
                correctResponses: session.correctCount,
                wrongResponses: session.wrongCount,
                skippedResponses: session.skippedCount,
                examPrimingProgress: session.totalQuestionsDetected > 0
                    ? `${session.processedQuestions}/${session.totalQuestionsDetected}`
                    : null,
                isFirstTimeExam: session.isFirstTimeExam,
                processingStage: session.processingStage,
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch session metadata' });
        }
    });

    server.post('/:token/upload', async (request: any, reply: any) => {
        const { token } = request.params as { token: string };

        try {
            const session = await prisma.userSession.findUnique({ where: { sessionToken: token } });
            if (!session) return reply.code(404).send({ error: 'Session not found' });

            // Process multipart file upload
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ error: 'No PDF file uploaded' });
            }

            // Convert PDF buffer to Base64 in memory
            const buffer = await data.toBuffer();
            const pdfBase64 = buffer.toString('base64');

            // Set parsing status
            await prisma.userSession.update({
                where: { id: session.id },
                data: {
                    parsingStatus: 'processing',
                    processingStage: 'processing',
                    processedQuestions: 0,
                    totalQuestionsDetected: 0,
                },
            });

            // Enqueue the new image-first processing worker.
            await imagePipelineQueue.add('image-pipeline', {
                sessionId: session.id,
                pdfBase64,
            });

            return {
                message: 'PDF successfully queued for image-first processing',
                status: 'queued'
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to initiate upload' });
        }
    });

    server.post('/:token/parse', async (_request: any, reply: any) => {
        return reply.code(410).send({
            error: 'URL parsing flow has been retired. Use PDF upload with the image-first pipeline.',
        });
    });
}
