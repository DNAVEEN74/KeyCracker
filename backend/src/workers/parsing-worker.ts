import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { solutionQueue } from '../queues';
import { fetchTcsIonResponseSheet } from '../services/tcsIonFetcher.service';
import { parseResponseSheetWithSchema } from '../services/cheerioParser.service';
import { extractTextFromPdfOcr, parseOcrTextWithRegexSchema } from '../services/ocrParser.service';

export const parsingWorker = new Worker(
    'answer-parsing',
    async (job: any) => {
        const { examId, sessionId, externalUrl, schemaId, pdfUrl } = job.data;
        console.log(`Parsing answers for session: ${sessionId}`);

        try {
            let parsedQuestions: any[] = [];

            if (pdfUrl) {
                // Flow 2 (Execution Phase): Fetch Schema, run OCR, parse deterministically
                console.log('Parsing user answers directly from OCR pipeline...');
                const examSchema = await prisma.examSchema.findUnique({ where: { id: schemaId } });
                if (!examSchema) throw new Error('Schema not found');

                const rawText = await extractTextFromPdfOcr(pdfUrl);
                parsedQuestions = parseOcrTextWithRegexSchema(rawText, examSchema.extractedSchema);
            } else if (externalUrl) {
                // 1. Fetch HTML
                const { content: htmlContent } = await fetchTcsIonResponseSheet(externalUrl);

                // 2. Fetch Schema
                const examSchema = await prisma.examSchema.findUnique({ where: { id: schemaId } });
                if (!examSchema) throw new Error('Schema not found');

                // 3. Parse with Cheerio locally
                console.log('Parsing user answers from HTML using Cheerio...');
                parsedQuestions = parseResponseSheetWithSchema(htmlContent, examSchema.extractedSchema);
            } else {
                throw new Error('Missing externalUrl or pdfUrl for parsing.');
            }

            if (!parsedQuestions || parsedQuestions.length === 0) {
                throw new Error('No questions parsed from input. Check schema compatibility and OCR output.');
            }

            // 4. Calculate Scores
            let totalScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let skippedCount = 0;

            // Helper: strip control characters that cause PostgreSQL UTF-8 errors
            const sanitize = (s: string | null | undefined): string | null => {
                if (s == null) return null;
                return s.replace(/[\x00-\x1F]/g, '').trim();
            };

            const answersData = parsedQuestions.map(q => {
                totalScore += q.marksAwarded;
                if (q.isCorrect) correctCount++;
                else if (q.userAnswer === null) skippedCount++;
                else wrongCount++;

                // Sanitize options object
                const cleanOptions: Record<string, string> = {};
                for (const [k, v] of Object.entries(q.options || {})) {
                    cleanOptions[k] = sanitize(v as string) ?? '';
                }

                return {
                    sessionId,
                    examId,
                    questionNumber: q.questionNumber,
                    questionText: sanitize(q.questionText) ?? '',
                    options: cleanOptions,
                    userAnswer: sanitize(q.userAnswer),
                    correctAnswer: sanitize(q.correctAnswer) ?? 'A',
                    isCorrect: q.isCorrect,
                    marksAwarded: q.marksAwarded,
                };
            });

            // 5. Save Answers in DB
            await prisma.userAnswer.createMany({
                data: answersData,
                skipDuplicates: true
            });

            // 5b. Update per-question aggregate statistics for analytics
            await Promise.all(parsedQuestions.map((q) => {
                const inc = {
                    totalAttempts: 1,
                    correctAttempts: q.isCorrect ? 1 : 0,
                    wrongAttempts: !q.isCorrect && q.userAnswer !== null ? 1 : 0,
                    skippedAttempts: q.userAnswer === null ? 1 : 0,
                };

                return prisma.questionStatistics.upsert({
                    where: {
                        examId_questionNumber: {
                            examId,
                            questionNumber: q.questionNumber,
                        }
                    },
                    create: {
                        examId,
                        questionNumber: q.questionNumber,
                        ...inc,
                        accuracyRate: q.isCorrect ? 1 : 0,
                    },
                    update: {
                        totalAttempts: { increment: inc.totalAttempts },
                        correctAttempts: { increment: inc.correctAttempts },
                        wrongAttempts: { increment: inc.wrongAttempts },
                        skippedAttempts: { increment: inc.skippedAttempts },
                    }
                });
            }));

            const touchedStats = await prisma.questionStatistics.findMany({
                where: {
                    examId,
                    questionNumber: { in: parsedQuestions.map((q) => q.questionNumber) },
                },
                select: { id: true, totalAttempts: true, correctAttempts: true },
            });

            await Promise.all(touchedStats.map((s) =>
                prisma.questionStatistics.update({
                    where: { id: s.id },
                    data: {
                        accuracyRate: s.totalAttempts > 0 ? s.correctAttempts / s.totalAttempts : 0,
                    }
                })
            ));

            // 6. Update Session
            await prisma.userSession.update({
                where: { id: sessionId },
                data: {
                    parsingStatus: 'completed',
                    totalScore,
                    correctCount,
                    wrongCount,
                    skippedCount,
                }
            });

            // 7. Enqueue Solutions for each question (Phase 2)
            for (const q of parsedQuestions) {
                await solutionQueue.add('solution-generation', {
                    examId,
                    questionNumber: q.questionNumber,
                    questionText: q.questionText,
                    options: q.options,
                    correctAnswer: q.correctAnswer
                });
            }

            return { totalScore };
        } catch (error) {
            console.error('Parsing failed:', error);
            await prisma.userSession.update({
                where: { id: sessionId },
                data: { parsingStatus: 'failed' }
            });
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 10,
    }
);
