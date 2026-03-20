import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { extractAnswerBlockImages, extractQuestionAndHeaderImages, ExtractedImage } from '../services/extractor.service';
import { buildExamIdentity, extractHeaderExamMetadata, parseExamDate } from '../services/examIdentity.service';
import { generateSolutionFromQuestionImage } from '../services/gemini.service';
import { isSkippedStatus, ocrImageWithTesseract, parseAnswerBlock } from '../services/imageOcr.service';
import { uploadImageToR2 } from '../services/r2.service';

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
        const { sessionId, pdfBase64 } = job.data as { sessionId: string; pdfBase64: string };
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        await updateSessionProgress(sessionId, {
            parsingStatus: 'processing',
            processingStage: 'processing',
            processedQuestions: 0,
        });

        try {
            const [questionExtraction, answerBlockImages] = await Promise.all([
                extractQuestionAndHeaderImages(pdfBuffer),
                extractAnswerBlockImages(pdfBuffer),
            ]);

            if (!questionExtraction.headerImage) {
                throw new Error('Header image not found in app2 output.');
            }

            const headerText = await ocrImageWithTesseract(questionExtraction.headerImage.buffer, 6);
            const headerMetadata = extractHeaderExamMetadata(headerText);
            const identity = buildExamIdentity(headerMetadata);

            const usableQuestionImages = questionExtraction.questionImages.filter(isPotentiallyUsableImage);
            const usableAnswerBlocks = answerBlockImages.filter(isPotentiallyUsableImage);

            await updateSessionProgress(sessionId, {
                totalQuestionsDetected: usableQuestionImages.length,
                processingStage: 'awaiting_exam_priming',
            });

            if (!identity.identityHash) {
                throw new Error('Unable to compute exam identity from header OCR.');
            }

            let exam = await prisma.exam.findFirst({
                where: { identityHash: identity.identityHash },
            });

            let isFirstTimeExam = false;

            if (!exam) {
                isFirstTimeExam = true;
                const title = sanitize(headerMetadata.title) || 'Unknown Exam';
                const subject = sanitize(headerMetadata.subject) || 'Unknown Subject';
                const examDate = parseExamDate(headerMetadata.date);
                const totalQuestions = usableQuestionImages.length || 100;
                const totalMarks = totalQuestions * 2;

                exam = await prisma.exam.create({
                    data: {
                        slug: `${slugify(title)}-${Date.now()}`,
                        name: title,
                        board: headerMetadata.board,
                        examDate,
                        totalQuestions,
                        totalMarks,
                        duration: 120,
                        markingScheme: { correct: 2, wrong: -0.5, unattempted: 0 },
                        identityHash: identity.identityHash,
                        normalizedTitle: identity.normalizedTitle,
                        normalizedDate: identity.normalizedDate,
                        normalizedTime: identity.normalizedTime,
                        normalizedSubject: identity.normalizedSubject || subject.toLowerCase(),
                        examState: 'priming',
                    }
                });
            }

            await updateSessionProgress(sessionId, {
                examId: exam.id,
                isFirstTimeExam,
            });

            if (exam.examState !== 'ready') {
                isFirstTimeExam = true;
            }

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

                    const parsed = await generateSolutionFromQuestionImage(questionImage.buffer.toString('base64'));
                    const questionId = sanitize(parsed.questionId);
                    const correctOptionId = sanitize(parsed.correctOptionId);
                    const correctOptionNumber = sanitize(parsed.correctOptionNumber);

                    if (!questionId || !correctOptionNumber || !correctOptionId) {
                        continue;
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
                }

                if (processedCount !== usableQuestionImages.length) {
                    throw new Error(`Exam priming incomplete: ${processedCount}/${usableQuestionImages.length} question solutions created.`);
                }

                await prisma.exam.update({
                    where: { id: exam.id },
                    data: {
                        examState: 'ready',
                        totalQuestions: usableQuestionImages.length,
                        totalMarks: usableQuestionImages.length * 2,
                    },
                });
            }

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
                    correctAnswer: solution.correctAnswer || optionNumberToLetter(solution.correctOptionNumber || '') || 'A',
                    isCorrect: Boolean(isCorrect),
                    marksAwarded,
                });
            }

            if (answerRows.length === 0) {
                throw new Error('No usable answer blocks found for evaluation.');
            }

            await prisma.userAnswer.deleteMany({ where: { sessionId } });
            await prisma.userAnswer.createMany({ data: answerRows });

            let totalScore = 0;
            let correctCount = 0;
            let wrongCount = 0;
            let skippedCount = 0;

            for (const row of answerRows) {
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

            const touchedStats = await prisma.questionStatistics.findMany({
                where: {
                    examId: exam.id,
                    questionNumber: { in: answerRows.map((row) => row.questionNumber) },
                },
                select: { id: true, totalAttempts: true, correctAttempts: true },
            });

            await Promise.all(touchedStats.map((s) => prisma.questionStatistics.update({
                where: { id: s.id },
                data: { accuracyRate: s.totalAttempts > 0 ? s.correctAttempts / s.totalAttempts : 0 },
            })));

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

