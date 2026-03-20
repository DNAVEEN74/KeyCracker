import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type ParsedAnswerBlock = {
    questionId: string;
    status: string;
    optionIds: Record<string, string>;
    chosenOptionNumber: string | null;
    chosenOptionId: string | null;
};

function cleanText(value: string): string {
    return value.replace(/[\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function ocrImageWithTesseract(imageBuffer: Buffer, psm: number = 6): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keycracker-img-ocr-'));
    const imagePath = path.join(tempDir, 'input.png');

    try {
        await fs.writeFile(imagePath, imageBuffer);
        const { stdout } = await execFileAsync('tesseract', [imagePath, 'stdout', '-l', 'eng', '--psm', String(psm)], {
            maxBuffer: 20 * 1024 * 1024,
        });
        return stdout || '';
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

export function parseAnswerBlock(text: string): ParsedAnswerBlock | null {
    const normalized = text.replace(/\r/g, '');

    const questionId = normalized.match(/question\s*id\s*:?\s*([0-9]{5,})/i)?.[1] || '';
    if (!questionId) return null;

    const optionIds: Record<string, string> = {};
    for (const opt of ['1', '2', '3', '4', '5']) {
        const optionId = normalized.match(new RegExp(`option\\s*${opt}\\s*id\\s*:?\\s*([0-9]{5,})`, 'i'))?.[1];
        if (optionId) optionIds[opt] = optionId;
    }

    const status = cleanText(normalized.match(/status\s*:?\s*([^\n]+)/i)?.[1] || '');
    const chosenOptionNumberRaw = cleanText(normalized.match(/chosen\s*option\s*:?\s*([^\n]+)/i)?.[1] || '');
    const chosenOptionNumber = chosenOptionNumberRaw.match(/[1-5]/)?.[0] || null;
    const chosenOptionId = chosenOptionNumber ? (optionIds[chosenOptionNumber] || null) : null;

    return {
        questionId,
        status,
        optionIds,
        chosenOptionNumber,
        chosenOptionId,
    };
}

export function isSkippedStatus(status: string): boolean {
    const s = status.toLowerCase();
    return s.includes('not answered') || s.includes('not visited') || s.includes('not attempted') || s.includes('marked for review');
}

