import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import crypto from 'crypto';
import { schemaQueue } from '../../queues';
import { fetchTcsIonResponseSheet } from '../../services/tcsIonFetcher.service';

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
                data: { parsingStatus: 'parsing' },
            });

            // Enqueue Schema Extraction Worker but pass the Base64 directly
            await schemaQueue.add('schema-extraction', {
                examId: session.examId,
                sessionId: session.id,
                pdfUrl: pdfBase64 // We're passing the base64 string inside the pdfUrl variable for MVP
            });

            return {
                message: 'PDF successfully queued for AI processing',
                status: 'queued'
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to initiate upload' });
        }
    });

    server.post('/:token/parse', async (request: any, reply: any) => {
        const { token } = (request.params as any) || {};
        const { url } = (request.body as any) || {};

        if (!url) {
            return reply.code(400).send({ error: 'URL is required' });
        }

        try {
            const session = await prisma.userSession.findUnique({ where: { sessionToken: token } });
            if (!session) return reply.code(404).send({ error: 'Session not found' });

            // 1. Fetch the URL content
            const { content, contentType } = await fetchTcsIonResponseSheet(url);

            // 2. We will save the HTML to S3 or just pass it in job for MVP. 
            // In a real app, large HTML should go to S3. We'll simulate S3 upload by passing the URL to workers, 
            // but the worker actually needs the HTML. Let's just save externalUrl in DB and worker will fetch it, OR we pass it.
            // Since `fetchTcsIonResponseSheet` worked, we know it's accessible. So the worker can fetch it again, 
            // OR for safety we store `externalUrl` and let worker do the fetch.
            // But we already fetched it to validate. Let's just pass `externalUrl` to worker.

            await prisma.userSession.update({
                where: { id: session.id },
                data: {
                    parsingStatus: 'parsing',
                    externalUrl: url
                },
            });

            await schemaQueue.add('schema-extraction', {
                examId: session.examId,
                sessionId: session.id,
                externalUrl: url,
            });

            return {
                status: 'queued',
                message: 'URL successfully parsed and queued for AI analysis',
            };
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: error instanceof Error ? error.message : 'Failed to parse URL' });
        }
    });
}
