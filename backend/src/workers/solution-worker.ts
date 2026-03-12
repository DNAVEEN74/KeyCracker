import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { generateDetailedSolution } from '../services/gemini.service';

export const solutionWorker = new Worker(
    'solution-generation',
    async (job: any) => {
        const { examId, questionNumber, questionText, options, correctAnswer } = job.data;

        console.log(`Generating solution for question ${questionNumber} of exam ${examId}`);

        try {
            // Check if solution already exists
            const existingSolution = await prisma.solution.findUnique({
                where: { examId_questionNumber: { examId, questionNumber } }
            });

            if (existingSolution && existingSolution.generationStatus === 'completed') {
                return { solutionId: existingSolution.id, cached: true };
            }

            // Call Gemini
            const detailedSolution = await generateDetailedSolution(questionText || 'No text extracted', options || {}, correctAnswer);

            const solutionData = {
                examId,
                questionNumber,
                questionText: questionText || 'No text extracted',
                options: options || {},
                correctAnswer,
                explanation: detailedSolution, // We store full markdown here
                latexContent: detailedSolution, // For backward compatibility or if frontend strictly uses latexContent
                generationStatus: 'completed',
                aiModel: 'gemini-3-flash', // As requested by user
                confidence: 0.9,
            };

            let solution;
            if (existingSolution) {
                solution = await prisma.solution.update({
                    where: { id: existingSolution.id },
                    data: solutionData
                });
            } else {
                solution = await prisma.solution.create({ data: solutionData });
            }

            return { solutionId: solution.id, cached: false };
        } catch (error: any) {
            console.error(`Failed generating solution for exam ${examId} question ${questionNumber}:`, error);

            // If Gemini returned a retry delay in the error message, wait before re-throwing
            // so BullMQ's retry mechanism waits the appropriate time
            const retryMatch = error?.message?.match(/retry in ([\d.]+)s/i);
            if (retryMatch) {
                const waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000);
                console.log(`[SolutionWorker] Rate limited — waiting ${waitMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }

            throw error;
        }
    },
    {
        connection: redisConnection,
        // Run only 1 job at a time to avoid burst-firing all 99 questions at once
        concurrency: 1,
        // BullMQ built-in rate limiter: max 4 jobs per 60 seconds (free tier = 5 RPM)
        limiter: {
            max: 4,
            duration: 60_000, // 1 minute in ms
        },
    }
);
