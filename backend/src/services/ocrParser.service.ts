const pdfParse = require('pdf-parse');
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const MIN_TEXT_LENGTH_FOR_DIRECT_PARSE = 1500;
const MIN_QUESTION_MARKERS_FOR_DIRECT_PARSE = 5;

export interface ParsedQuestion {
    questionNumber: number;
    questionText: string;
    options: Record<string, string>;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
}

const QUESTION_MARKER_REGEX = /Q\.\s*\d+/gi;

function sanitizeRawText(text: string): string {
    if (!text) return '';
    // Strip null bytes and ASCII control chars that commonly break DB writes.
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function shouldUseOcrFallback(text: string): boolean {
    const cleaned = sanitizeRawText(text);
    const qMarkers = cleaned.match(QUESTION_MARKER_REGEX)?.length ?? 0;
    if (!cleaned.trim()) return true;
    if (cleaned.length < MIN_TEXT_LENGTH_FOR_DIRECT_PARSE) return true;
    if (qMarkers < MIN_QUESTION_MARKERS_FOR_DIRECT_PARSE) return true;
    return false;
}

function buildRegex(pattern: string, defaultFlags: string): RegExp {
    try {
        return new RegExp(pattern, defaultFlags);
    } catch {
        const slashWrapped = pattern.match(/^\/([\s\S]+)\/([a-z]*)$/i);
        if (!slashWrapped) {
            throw new Error(`Invalid regex pattern: ${pattern}`);
        }
        const mergedFlags = Array.from(new Set(`${slashWrapped[2]}${defaultFlags}`.split(''))).join('');
        return new RegExp(slashWrapped[1], mergedFlags);
    }
}

function normalizeAnswer(val: string | null | undefined): string | null {
    if (!val) return null;
    const cleaned = val.trim();
    if (!cleaned) return null;

    const lower = cleaned.toLowerCase();
    if (lower === '--' || lower.includes('not answered') || lower.includes('not visited') || lower.includes('not attempted')) {
        return null;
    }

    const match = cleaned.match(/\d+/) || cleaned.match(/[A-D]/i);
    const extracted = match ? match[0] : cleaned;

    const num = parseInt(extracted, 10);
    if (!isNaN(num) && num >= 1 && num <= 4) {
        return String.fromCharCode(64 + num); // 1->A, 2->B...
    }

    const letter = extracted.match(/[A-D]/i);
    return letter ? letter[0].toUpperCase() : null;
}

async function extractTextFromPdfAsImages(base64Pdf: string): Promise<string> {
    const pdfBuffer = Buffer.from(base64Pdf, 'base64');
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keycracker-ocr-'));
    const pdfPath = path.join(tempDir, 'input.pdf');
    const outputPrefix = path.join(tempDir, 'page');

    try {
        await fs.writeFile(pdfPath, pdfBuffer);

        // Render each PDF page to PNG.
        await execFileAsync('pdftoppm', ['-r', '300', '-png', pdfPath, outputPrefix], {
            maxBuffer: 20 * 1024 * 1024,
        });

        const files = await fs.readdir(tempDir);
        const imageFiles = files
            .filter((file) => /^page-\d+\.png$/i.test(file))
            .sort((a, b) => {
                const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
                const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
                return aNum - bNum;
            });

        if (imageFiles.length === 0) {
            throw new Error('No images were generated from PDF during OCR fallback.');
        }

        const textChunks: string[] = new Array(imageFiles.length).fill('');
        const ocrConcurrency = Math.min(2, imageFiles.length);
        let cursor = 0;

        const runOcrWorker = async () => {
            while (true) {
                const index = cursor;
                cursor += 1;
                if (index >= imageFiles.length) return;

                const imagePath = path.join(tempDir, imageFiles[index]);
                const { stdout } = await execFileAsync(
                    'tesseract',
                    [imagePath, 'stdout', '-l', 'eng', '--psm', '11'],
                    { maxBuffer: 20 * 1024 * 1024 }
                );
                textChunks[index] = stdout || '';
            }
        };

        await Promise.all(Array.from({ length: ocrConcurrency }, () => runOcrWorker()));

        return sanitizeRawText(textChunks.join('\n\n'));
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

/**
 * Extracts raw text from a Base64 PDF string using pdf-parse.
 */
export async function extractTextFromPdfOcr(base64Pdf: string): Promise<string> {
    try {
        const pdfBuffer = Buffer.from(base64Pdf, 'base64');
        const data = await pdfParse(pdfBuffer);
        let fullText = sanitizeRawText(data.text || '');

        if (shouldUseOcrFallback(fullText)) {
            console.log('[OCR] Direct PDF text extraction is insufficient. Falling back to image OCR...');
            const ocrText = await extractTextFromPdfAsImages(base64Pdf);
            if (ocrText.trim().length > fullText.trim().length) {
                fullText = ocrText;
            }
        }

        if (!fullText.trim()) {
            console.warn('[OCR] Text extraction returned empty output after fallback.');
        }

        return fullText;

    } catch (error) {
        console.error("Error during PDF text extraction:", error);
        throw new Error('Failed to extract text from PDF.');
    }
}

/**
 * Applies a Gemini-generated Regex schema to deterministically parse questions from raw OCR text.
 */
export function parseOcrTextWithRegexSchema(rawText: string, schema: any): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    const cleanText = sanitizeRawText(rawText);

    const schemaRoot = schema?.questions ? schema.questions : schema;

    // Validate schema
    if (!schemaRoot || !schemaRoot.blockRegex || !schemaRoot.fields) {
        console.error("Invalid Regex schema format:", schema);
        throw new Error('Invalid Regex schema format returned from Gemini for PDF/OCR parsing');
    }

    const { blockRegex, fields } = schemaRoot;

    try {
        // 1. Identify all question blocks in the text using global regex
        const blockPattern = buildRegex(blockRegex, 'gsi');
        let blockMatch;
        let index = 0;

        while ((blockMatch = blockPattern.exec(cleanText)) !== null) {
            const blockText = blockMatch[0];
            index += 1;

            // 2. Extract fields within the block using individual regexes

            // Question Text
            const qStrPattern = buildRegex(fields.questionText, 'si');
            const qTextMatch = qStrPattern.exec(blockText);
            const questionText = sanitizeRawText(qTextMatch?.[1]?.trim() || 'No text extracted');

            // Question number from the block, fallback to running index
            const questionNumberMatch = blockText.match(/Q\.\s*(\d+)/i);
            const questionNumber = questionNumberMatch ? parseInt(questionNumberMatch[1], 10) : index;

            // Options (assuming regex captures 4 groups or matches globally 4 times)
            const options: Record<string, string> = {};
            if (fields.options) {
                const optPattern = buildRegex(fields.options, 'gsi');
                const labels = ['A', 'B', 'C', 'D'];
                let optMatch;
                let optIndex = 0;

                // Keep matching until we find all options or regex exhausts
                while ((optMatch = optPattern.exec(blockText)) !== null && optIndex < 4) {
                    options[labels[optIndex]] = sanitizeRawText((optMatch[1] || optMatch[0]).trim());
                    optIndex++;
                }
            }

            // Correct Answer
            const currentAnsPattern = buildRegex(fields.correctOption, 'si');
            const currentAnsMatch = currentAnsPattern.exec(blockText);
            let correctAnswer = currentAnsMatch ? currentAnsMatch[1]?.trim() : '';
            if (!correctAnswer) {
                const fallbackCorrect = blockText.match(/(?:Correct|Right|Ans(?:wer)?)\s*(?:Option)?\s*[:.\-]?\s*([1-4A-D])/i);
                correctAnswer = fallbackCorrect?.[1] || '';
            }

            // User Answer
            const userAnsPattern = buildRegex(fields.userOption, 'si');
            const userAnsMatch = userAnsPattern.exec(blockText);
            let userAnswerStr = userAnsMatch ? userAnsMatch[1]?.trim() : '';
            if (!userAnswerStr) {
                const fallbackUser = blockText.match(/Chosen\s*Option\s*[:.\-]?\s*([1-4A-D]|--|Not\s+Answered|Not\s+Visited|Not\s+Attempted)/i);
                userAnswerStr = fallbackUser?.[1] || '';
            }

            const safeUserAnswer = normalizeAnswer(userAnswerStr);
            const safeCorrectAnswer = normalizeAnswer(correctAnswer) || 'A';

            // Scoring logic
            const isCorrect = safeUserAnswer === safeCorrectAnswer;
            const marksAwarded = isCorrect ? 2 : (safeUserAnswer === null ? 0 : -0.5);

            questions.push({
                questionNumber,
                questionText,
                options,
                userAnswer: safeUserAnswer,
                correctAnswer: safeCorrectAnswer,
                isCorrect,
                marksAwarded
            });
        }
    } catch (err) {
        console.error(`Failed to apply regex schema to OCR text`, err);
        throw err;
    }

    return questions;
}
