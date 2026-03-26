import { Worker } from 'bullmq';
import { redisClient, redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { extractAnswerBlockImages, extractQuestionAndHeaderImages, ExtractedImage } from '../services/extractor.service';
import { buildExamIdentity, extractHeaderExamMetadata, parseExamDate } from '../services/examIdentity.service';
import { generateSolutionFromQuestionImage } from '../services/gemini.service';
import { isSkippedStatus, ocrImageWithTesseract, parseAnswerBlock } from '../services/imageOcr.service';
import { uploadImageToR2, downloadFileFromR2 } from '../services/r2.service';

type MarkingScheme = {
    correct: number;
    wrong: number;
    unattempted: number;
};

function extractMarkingScheme(markingScheme: unknown): MarkingScheme {
    const fallback: MarkingScheme = { correct: 2, wrong: -0.5, unattempted: 0 };
    if (!markingScheme || typeof markingScheme !== 'object') return fallback;

    const obj = markingScheme as Record<string, unknown>;
    const correct = Number(obj.correct);
    const wrong = Number(obj.wrong);
    const unattempted = Number(obj.unattempted);

    return {
        correct: Number.isFinite(correct) ? correct : fallback.correct,
        wrong: Number.isFinite(wrong) ? wrong : fallback.wrong,
        unattempted: Number.isFinite(unattempted) ? unattempted : fallback.unattempted,
    };
}

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function optionNumberToLetter(optionNumber: string | null | undefined): string | null {
    if (!optionNumber) return null;
    const n = parseInt(optionNumber, 10);
    if (!Number.isFinite(n) || n < 1 || n > 5) return null;
    return String.fromCharCode(64 + n);
}

function isPotentiallyUsableImage(img: ExtractedImage): boolean {
    return img.buffer.byteLength >= env.IMAGE_MIN_VALID_BYTES;
}

function sanitize(value: string | null | undefined): string | null {
    if (value == null) return null;
    const cleaned = value.replace(/[\x00-\x1F]/g, ' ').trim();
    return cleaned || null;
}

async function updateSessionProgress(sessionId: string, data: Record<string, unknown>) {
    await prisma.userSession.update({
        where: { id: sessionId },
        data: data as any,
    });
}

export const imagePipelineWorker = new Worker(
    'image-pipeline',
    async (job: any) => {
        const { sessionId, examId, pdfKey } = job.data as { sessionId: string; examId: string; pdfKey: string };
        
        await updateSessionProgress(sessionId, {
            parsingStatus: 'processing',
            processingStage: 'processing',
            processedQuestions: 0,
        });

        try {
            const sessionExam = await prisma.exam.findUnique({ where: { id: examId } });
            if (!sessionExam) throw new Error('Session exam not found.');

            const isPrimedExam = sessionExam.examState === 'ready' && sessionExam.identityHash != null;
            const pdfBuffer = await downloadFileFromR2(pdfKey);

            let questionExtraction: { headerImage: ExtractedImage | null; questionImages: ExtractedImage[] } | null = null;
            let usableQuestionImages: ExtractedImage[] = [];

            // FAST FLOW: If we already know the exact exam and it's primed, skip question extraction entirely
            const [answerBlockImages, maybeQuestionExtraction] = await Promise.all([
                extractAnswerBlockImages(pdfBuffer),
                isPrimedExam ? Promise.resolve(null) : extractQuestionAndHeaderImages(pdfBuffer),
            ]);

            const usableAnswerBlocks = answerBlockImages.filter(isPotentiallyUsableImage);
            let exam = sessionExam;
            let isFirstTimeExam = false;

            if (!isPrimedExam) {
                questionExtraction = maybeQuestionExtraction!;
                if (!questionExtraction.headerImage) {
                    throw new Error('Header image not found in app2 output.');
                }

                const headerText = await ocrImageWithTesseract(questionExtraction.headerImage.buffer, 6);
                const headerMetadata = extractHeaderExamMetadata(headerText);
                const identity = buildExamIdentity(headerMetadata);

                usableQuestionImages = questionExtraction.questionImages.filter(isPotentiallyUsableImage);

                await updateSessionProgress(sessionId, {
                    totalQuestionsDetected: usableQuestionImages.length,
                    processingStage: 'awaiting_exam_priming',
                });

                if (!identity.identityHash) {
                    throw new Error('Unable to compute exam identity from header OCR.');
                }

                const examDate = parseExamDate(headerMetadata.date);
                const title = sanitize(headerMetadata.title) || 'Unknown Exam';
                const subject = sanitize(headerMetadata.subject) || 'Unknown Subject';

                // UPSERT: Prevents concurrent worker identityHash duplication race condition
                exam = await prisma.exam.upsert({
                    where: { identityHash: identity.identityHash },
                    update: {}, // We don't overwrite existing exam data on concurrent uploads
                    create: {
                        slug: `${slugify(title)}-${Date.now()}`,
                        name: title,
                        board: headerMetadata.board,
                        examDate,
                        totalQuestions: usableQuestionImages.length || 100,
                        totalMarks: (usableQuestionImages.length || 100) * 2,
                        duration: 120,
                        markingScheme: { correct: 2, wrong: -0.5, unattempted: 0 },
                        identityHash: identity.identityHash,
                        normalizedTitle: identity.normalizedTitle,
                        normalizedDate: identity.normalizedDate,
                        normalizedTime: identity.normalizedTime,
                        normalizedSubject: identity.normalizedSubject || subject.toLowerCase(),
                        examState: 'priming', // Safely locked
                    }
                });

                await updateSessionProgress(sessionId, {
                    examId: exam.id, // Migrate session to the true identity exam
                });

                if (exam.examState === 'priming') {
                    // Try to acquire priming lock to designate ONE master worker to run Gemini
                    const lockKey = `priming-lock:${exam.id}`;
                    const acquired = await redisClient.set(lockKey, '1', { NX: true, EX: 600 }); // 10 min lock

                    if (acquired) {
                        isFirstTimeExam = true;
                    } else {
                        // Wait for the prime master worker to finish
                        console.log(`Exam ${exam.id} is currently being primed by another worker. Waiting...`);
                        let attempts = 0;
                        while (attempts < 60) {
                            await new Promise(r => setTimeout(r, 5000));
                            const checkExam = await prisma.exam.findUnique({ where: { id: exam.id } });
                            if (checkExam?.examState === 'ready') {
                                exam = checkExam;
                                break;
                            }
                            if (checkExam?.examState === 'failed') throw new Error('Exam priming failed by another process.');
                            attempts++;
                        }
                        if (attempts >= 60) {
                            throw new Error('Timeout waiting for exam priming by another process.');
                        }
                    }
                }

                await updateSessionProgress(sessionId, { isFirstTimeExam });

                if (isFirstTimeExam) {
                    const headerKey = `exams/${exam.id}/header/header.png`;
                    const headerImageUrl = await uploadImageToR2(headerKey, questionExtraction.headerImage.buffer);
                    await prisma.exam.update({
                        where: { id: exam.id },
                        data: { headerImageUrl, examState: 'priming' },
                    });

                    let processedCount = 0;
                    for (let i = 0; i < usableQuestionImages.length; i += 1) {
                        const questionImage = usableQuestionImages[i];
                        const imageKey = `exams/${exam.id}/questions/source-${questionImage.index}.png`;
                        const questionImageUrl = await uploadImageToR2(imageKey, questionImage.buffer);

                        let attempts = 0;
                        let success = false;
                        
                        while (!success && attempts < 5) {
                            try {
                                const parsed = await generateSolutionFromQuestionImage(questionImage.buffer.toString('base64'));
                                const questionId = sanitize(parsed.questionId);
                                const correctOptionId = sanitize(parsed.correctOptionId);
                                const correctOptionNumber = sanitize(parsed.correctOptionNumber);

                                if (!questionId || !correctOptionNumber || !correctOptionId) {
                                    console.warn(`Skipping question ${i + 1}: Gemini failed to extract required IDs`);
                                    break;
                                }

                                const existing = await prisma.solution.findFirst({
                                    where: { examId: exam.id, questionId },
                                });

                                const solutionPayload: any = {
                                    examId: exam.id,
                                    questionId,
                                    questionNumber: i + 1,
                                    questionText: sanitize(parsed.questionText) || `Question ID ${questionId}`,
                                    options: {},
                                    optionIds: parsed.optionIds || {},
                                    correctOptionId,
                                    correctOptionNumber,
                                    correctAnswer: optionNumberToLetter(correctOptionNumber) || 'A',
                                    explanation: sanitize(parsed.solutionMarkdown) || 'Solution not available.',
                                    latexContent: sanitize(parsed.solutionMarkdown),
                                    generationStatus: 'completed',
                                    aiModel: 'gemini-3-flash',
                                    confidence: 0.9,
                                    questionImageUrl,
                                    sourceImageIndex: questionImage.index,
                                };

                                if (existing) {
                                    await prisma.solution.update({
                                        where: { id: existing.id },
                                        data: solutionPayload,
                                    });
                                } else {
                                    await prisma.solution.create({ data: solutionPayload });
                                }

                                processedCount += 1;
                                await updateSessionProgress(sessionId, { processedQuestions: processedCount });

                                // STRICT RATE LIMIT ENFORCEMENT for Free Tier (10 RPM limit)
                                await new Promise((resolve) => setTimeout(resolve, 6500));
                                success = true;
                            } catch (err: any) {
                                attempts += 1;
                                console.error(`Failed to prime question ${i + 1} (Attempt ${attempts} of 5)`, err.message || err);
                                
                                if (attempts >= 5) {
                                    console.error(`Question ${i + 1} permanently skipped after 5 attempts.`);
                                    break;
                                } else {
                                    let delaySeconds = 15;
                                    const match = err?.message?.match(/Please retry in ([\d.]+)s/);
                                    if (match) {
                                        delaySeconds = Math.ceil(parseFloat(match[1])) + 2; 
                                    } else if (err?.message?.includes('429')) {
                                        delaySeconds = 15;
                                    } else {
                                        delaySeconds = 5;
                                    }
                                    
                                    console.log(`Waiting exactly ${delaySeconds} seconds requested by API to clear rate limit lock...`);
                                    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
                                }
                            }
                        }
                    }

                    if (processedCount === 0 && usableQuestionImages.length > 0) {
                        await prisma.exam.update({ where: { id: exam.id }, data: { examState: 'failed' } });
                        throw new Error(`Exam priming completely failed: 0/${usableQuestionImages.length} question solutions created.`);
                    }

                    exam = await prisma.exam.update({
                        where: { id: exam.id },
                        data: {
                            examState: 'ready',
                            totalQuestions: usableQuestionImages.length,
                            totalMarks: usableQuestionImages.length * 2,
                        },
                    });
                }
            } else {
                console.log(`Exam ${exam.id} already primed. Skipping question extraction.`);
            }

            // --- Phase 2: Evaluating the student's attempt ---
            await updateSessionProgress(sessionId, {
                processingStage: 'evaluating_attempt',
                parsingStatus: 'parsing',
            });

            const latestExam = await prisma.exam.findUnique({ where: { id: exam.id } });
            if (!latestExam) throw new Error('Exam disappeared before attempt evaluation.');
            const marking = extractMarkingScheme(latestExam.markingScheme);

            const answerRows: any[] = [];
            for (const answerBlock of usableAnswerBlocks) {
                const text = await ocrImageWithTesseract(answerBlock.buffer, 6);
                const parsed = parseAnswerBlock(text);
                if (!parsed?.questionId) continue;

                const solution = await prisma.solution.findFirst({
                    where: { examId: exam.id, questionId: parsed.questionId },
                });
                if (!solution) continue;

                const skipped = !parsed.chosenOptionId && isSkippedStatus(parsed.status);
                const isCorrect = skipped
                    ? false
                    : (
                        (parsed.chosenOptionId && solution.correctOptionId && parsed.chosenOptionId === solution.correctOptionId)
                        || (parsed.chosenOptionNumber && solution.correctOptionNumber && parsed.chosenOptionNumber === solution.correctOptionNumber)
                    );

                const marksAwarded = skipped ? marking.unattempted : (isCorrect ? marking.correct : marking.wrong);
                const userAnswerLetter = optionNumberToLetter(parsed.chosenOptionNumber);

                let defaultCorrectAnswerMarker = solution.correctAnswer || optionNumberToLetter(solution.correctOptionNumber);
                if (!defaultCorrectAnswerMarker) {
                    console.warn(`[Evaluation] Silent default 'A' used for exam ${exam.id} Q${solution.questionNumber} because real correctAnswer was missing`);
                    defaultCorrectAnswerMarker = 'A';
                }

                answerRows.push({
                    sessionId,
                    examId: exam.id,
                    questionNumber: solution.questionNumber,
                    questionId: parsed.questionId,
                    questionText: solution.questionText || '',
                    options: solution.options || {},
                    userAnswer: skipped ? null : userAnswerLetter,
                    chosenOptionId: skipped ? null : parsed.chosenOptionId,
                    rawStatus: parsed.status || null,
                    correctAnswer: defaultCorrectAnswerMarker,
                    isCorrect: Boolean(isCorrect),
                    marksAwarded,
                });
            }

            if (answerRows.length === 0) {
                throw new Error('No usable answer blocks found for evaluation.');
            }

            // Deduplicate answer rows to prevent Prisma UniqueConstraint errors
            // if OCR extracted multiple cropped blocks referencing the same question number.
            const uniqueAnswerRowsMap = new Map();
            for (const row of answerRows) {
                if (!uniqueAnswerRowsMap.has(row.questionNumber)) {
                    uniqueAnswerRowsMap.set(row.questionNumber, row);
                }
            }
            const uniqueAnswerRows = Array.from(uniqueAnswerRowsMap.values());

            await prisma.userAnswer.deleteMany({ where: { sessionId } });
            await prisma.userAnswer.createMany({ data: uniqueAnswerRows });

            let totalScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let skippedCount = 0;

            for (const row of uniqueAnswerRows) {
                totalScore += row.marksAwarded;
                if (row.userAnswer == null) skippedCount += 1;
                else if (row.isCorrect) correctCount += 1;
                else wrongCount += 1;
            }

            await Promise.all(answerRows.map((row) => prisma.questionStatistics.upsert({
                where: {
                    examId_questionNumber: {
                        examId: exam.id,
                        questionNumber: row.questionNumber,
                    }
                },
                create: {
                    examId: exam.id,
                    questionNumber: row.questionNumber,
                    totalAttempts: 1,
                    correctAttempts: row.isCorrect ? 1 : 0,
                    wrongAttempts: row.userAnswer != null && !row.isCorrect ? 1 : 0,
                    skippedAttempts: row.userAnswer == null ? 1 : 0,
                    accuracyRate: row.isCorrect ? 1 : 0,
                },
                update: {
                    totalAttempts: { increment: 1 },
                    correctAttempts: { increment: row.isCorrect ? 1 : 0 },
                    wrongAttempts: { increment: row.userAnswer != null && !row.isCorrect ? 1 : 0 },
                    skippedAttempts: { increment: row.userAnswer == null ? 1 : 0 },
                },
            })));

            // Fixed N+1 Race Condition: Atomically compute accuracyRate in one query
            await prisma.$executeRawUnsafe(`
                UPDATE "QuestionStatistics"
                SET "accuracyRate" = CASE WHEN "totalAttempts" > 0 THEN ("correctAttempts"::float / "totalAttempts") ELSE 0 END
                WHERE "examId" = $1;
            `, exam.id);

            await updateSessionProgress(sessionId, {
                examId: exam.id,
                parsingStatus: 'completed',
                processingStage: null,
                totalScore,
                correctCount,
                wrongCount,
                skippedCount,
                processedQuestions: answerRows.length,
            });

            // Trigger Realtime SSE Event
            try {
                await redisClient.publish(`realtime:rankings:${exam.id}`, JSON.stringify({
                    event: 'session_completed',
                    sessionId,
                    totalScore,
                }));
            } catch (e) {
                console.error('Failed to dispatch SSE trigger', e);
            }

            return { totalScore, questionCount: answerRows.length };
        } catch (error) {
            console.error('[ImagePipelineWorker] Processing failed:', error);
            await updateSessionProgress(sessionId, {
                parsingStatus: 'failed',
                processingStage: 'failed',
            });
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 2,
    }
);
