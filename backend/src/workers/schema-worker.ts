import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { generateExamSchema, generateExamSchemaFromPdf } from '../services/gemini.service';
import { fetchTcsIonResponseSheet } from '../services/tcsIonFetcher.service';
import { parsingQueue } from '../queues';

function hasPdfRegexSchema(schema: any): boolean {
    const root = schema?.questions ?? schema;
    return Boolean(root?.blockRegex && root?.fields);
}

function hasHtmlSelectorSchema(schema: any): boolean {
    const root = schema?.questions ?? schema;
    return Boolean(root?.containerSelector && root?.fields);
}

function isSchemaCompatibleWithInput(schema: any, isPdfInput: boolean): boolean {
    return isPdfInput ? hasPdfRegexSchema(schema) : hasHtmlSelectorSchema(schema);
}

function isKnownDigiAlmUrl(url?: string): boolean {
    if (!url) return false;
    return /digialm\.com/i.test(url) && /AssessmentQPHTMLMode1/i.test(url);
}

function getKnownDigiAlmParsingSchema() {
    return {
        containerSelector: '.question-pnl',
        fields: {
            questionText: 'table.questionRowTbl tr td.bold[style*="overflow-x"]',
            options: 'td.wrngAns, td.rightAns',
            correctOption: 'td.rightAns',
            userOption: 'table.menu-tbl tr:contains("Chosen Option") td.bold',
            status: 'table.menu-tbl tr:contains("Status") td.bold',
        }
    };
}

export const schemaWorker = new Worker(
    'schema-extraction',
    async (job: any) => {
        const { examId, pdfUrl, sessionId, externalUrl } = job.data;
        console.log(`[SchemaWorker] Processing exam: ${examId}, session: ${sessionId}`);

        try {
            // ─── STEP 1: CHECK IF A CACHED SCHEMA ALREADY EXISTS FOR THIS EXAM ───
            const cachedSchema = await prisma.examSchema.findFirst({
                where: { examId },
                orderBy: { createdAt: 'desc' },
            });

            const isPdfInput = Boolean(pdfUrl);
            if (cachedSchema && isSchemaCompatibleWithInput(cachedSchema.extractedSchema, isPdfInput)) {
                console.log(`[SchemaWorker] ✅ Found compatible cached schema (${cachedSchema.schemaVersion}) for exam ${examId}. Skipping AI call.`);

                // Update session with the cached schema version
                await prisma.userSession.update({
                    where: { id: sessionId },
                    data: { schemaUsed: cachedSchema.schemaVersion }
                });

                // Enqueue parsing job directly with the cached schema
                await parsingQueue.add('answer-parsing', {
                    examId,
                    sessionId,
                    schemaId: cachedSchema.id,
                    externalUrl,
                    pdfUrl,
                });

                return { schemaId: cachedSchema.id, cached: true };
            }

            if (cachedSchema) {
                console.log('[SchemaWorker] Cached schema exists but is incompatible with this input type. Regenerating...');
            }

            // ─── STEP 2: NO CACHED SCHEMA — ASK AI TO GENERATE ONE ───
            console.log('[SchemaWorker] No compatible cached schema found. Asking Gemini to generate one...');
            let aiResult: any;

            if (pdfUrl) {
                console.log('[SchemaWorker] Processing Base64 PDF via Gemini Vision...');
                aiResult = await generateExamSchemaFromPdf(pdfUrl);
            } else if (externalUrl) {
                if (isKnownDigiAlmUrl(externalUrl)) {
                    console.log('[SchemaWorker] Recognized DigiAlm HTML format. Using built-in deterministic schema.');
                    aiResult = {
                        examDetails: null,
                        parsingSchema: getKnownDigiAlmParsingSchema(),
                    };
                } else {
                    console.log('[SchemaWorker] Fetching HTML from TCS iON Link...');
                    const { content } = await fetchTcsIonResponseSheet(externalUrl);
                    aiResult = await generateExamSchema(content);
                }
            } else {
                throw new Error('No externalUrl or pdfUrl provided to Schema Worker.');
            }

            console.log('[SchemaWorker] AI schema generated successfully.');

            // ─── STEP 3: EXTRACT EXAM METADATA FROM AI RESPONSE ───
            const { examDetails, parsingSchema } = aiResult;

            // Update the Exam DB row with real metadata from AI
            if (examDetails) {
                const slugFromAI = examDetails.name
                    ?.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') || undefined;

                // Fetch current exam to check if slug needs updating
                const currentExam = await prisma.exam.findUnique({ where: { id: examId } });
                const shouldUpdateSlug = currentExam && currentExam.slug === 'new-upload' && slugFromAI;

                await prisma.exam.update({
                    where: { id: examId },
                    data: {
                        name: examDetails.name || undefined,
                        board: examDetails.board || undefined,
                        examDate: examDetails.examDate ? new Date(examDetails.examDate) : undefined,
                        totalQuestions: examDetails.totalQuestions || undefined,
                        totalMarks: examDetails.totalMarks || undefined,
                        duration: examDetails.duration || undefined,
                        markingScheme: examDetails.markingScheme || undefined,
                        ...(shouldUpdateSlug ? { slug: slugFromAI } : {}),
                    }
                });
                console.log(`[SchemaWorker] Updated Exam metadata in DB: ${examDetails.name || 'unknown'}`);
            }

            // ─── STEP 4: SAVE THE PARSING SCHEMA TO DB FOR FUTURE REUSE ───
            const examSchema = await prisma.examSchema.create({
                data: {
                    examId,
                    schemaVersion: `v-${Date.now()}`,
                    extractedSchema: parsingSchema || aiResult, // Fallback to full AI response if no split
                    samplePdfUrl: externalUrl || 'pdf-upload',
                    confidence: 0.9,
                }
            });
            console.log(`[SchemaWorker] Schema cached in DB as version ${examSchema.schemaVersion}`);

            // ─── STEP 5: UPDATE SESSION AND ENQUEUE PARSING ───
            await prisma.userSession.update({
                where: { id: sessionId },
                data: { schemaUsed: examSchema.schemaVersion }
            });

            await parsingQueue.add('answer-parsing', {
                examId,
                sessionId,
                schemaId: examSchema.id,
                externalUrl,
                pdfUrl,
            });

            return { schemaId: examSchema.id, cached: false };
        } catch (error) {
            console.error('[SchemaWorker] ❌ Schema extraction failed:', error);
            await prisma.userSession.update({
                where: { id: sessionId },
                data: { parsingStatus: 'failed' }
            });
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);
