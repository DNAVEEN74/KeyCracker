import * as crypto from 'crypto';

export type HeaderExamMetadata = {
    title: string;
    date: string;
    time: string;
    subject: string;
    board: string;
};

function clean(value: string): string {
    return value.replace(/[\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: string): string {
    return clean(value).toLowerCase();
}

export function normalizeDate(value: string): string {
    const raw = clean(value);
    const match = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!match) return normalizeText(raw);

    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    const yyyy = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${yyyy}-${mm}-${dd}`;
}

export function normalizeTime(value: string): string {
    return clean(value)
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-');
}

export function deriveBoard(title: string): string {
    const normalized = normalizeText(title);
    if (normalized.includes('ssc')) return 'SSC';
    if (normalized.includes('rrb')) return 'RRB';
    if (normalized.includes('nta')) return 'NTA';
    if (normalized.includes('upsc')) return 'UPSC';
    return 'UNKNOWN';
}

export function extractHeaderExamMetadata(headerText: string): HeaderExamMetadata {
    const lines = headerText
        .split(/\r?\n/)
        .map((line) => clean(line))
        .filter(Boolean);

    const title = lines[0] || 'Unknown Exam';
    const dateMatch = headerText.match(/exam\s*date\s*:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
    const timeMatch = headerText.match(/exam\s*time\s*:?\s*([0-9:.\-\sAPMapm]+)/i);
    const subjectMatch = headerText.match(/subject\s*:?\s*([^\r\n]+)/i);

    const date = dateMatch?.[1] || '';
    const time = timeMatch?.[1] || '';
    const subject = subjectMatch?.[1] || '';
    const board = deriveBoard(title);

    return { title, date, time, subject, board };
}

export function buildExamIdentity(metadata: HeaderExamMetadata): {
    identityHash: string;
    normalizedTitle: string;
    normalizedDate: string;
    normalizedTime: string;
    normalizedSubject: string;
} {
    const normalizedTitle = normalizeText(metadata.title);
    const normalizedDate = normalizeDate(metadata.date);
    const normalizedTime = normalizeTime(metadata.time);
    const normalizedSubject = normalizeText(metadata.subject);
    const rawKey = `${normalizedTitle}|${normalizedDate}|${normalizedTime}|${normalizedSubject}`;
    const identityHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    return {
        identityHash,
        normalizedTitle,
        normalizedDate,
        normalizedTime,
        normalizedSubject,
    };
}

export function parseExamDate(value: string): Date {
    const normalized = normalizeDate(value);
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
