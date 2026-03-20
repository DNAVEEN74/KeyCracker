import { env } from '../config/env';

export type ExtractedImage = {
    filename: string;
    index: number;
    page: number | null;
    url: string;
    buffer: Buffer;
};

type ExtractorUploadResponse = {
    success?: boolean;
    images?: string[];
    folder?: string;
    question_count?: number;
    error?: string;
};

function joinUrl(base: string, path: string): string {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function parseImageMeta(filename: string, fallbackIndex: number): { index: number; page: number | null } {
    const match = filename.match(/question_(\d+)_page(\d+)/i);
    if (!match) return { index: fallbackIndex, page: null };
    return { index: parseInt(match[1], 10), page: parseInt(match[2], 10) };
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Extractor image fetch failed (${response.status}) for ${url}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

async function callExtractor(baseUrl: string, pdfBuffer: Buffer): Promise<ExtractedImage[]> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), 'upload.pdf');

    const uploadUrl = joinUrl(baseUrl, env.EXTRACTOR_UPLOAD_PATH);
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!uploadResponse.ok) {
        throw new Error(`Extractor upload failed (${uploadResponse.status}) at ${uploadUrl}`);
    }

    const payload = await uploadResponse.json() as ExtractorUploadResponse;
    if (!payload.success || !payload.images || !payload.folder) {
        throw new Error(payload.error || 'Extractor response missing required fields.');
    }

    const images: ExtractedImage[] = [];
    for (let i = 0; i < payload.images.length; i += 1) {
        const filename = payload.images[i];
        const escapedFolder = encodeURIComponent(payload.folder);
        const escapedFile = encodeURIComponent(filename);
        const url = joinUrl(baseUrl, `${env.EXTRACTOR_OUTPUT_PATH}/${escapedFolder}/${escapedFile}`);
        const buffer = await fetchImageBuffer(url);
        const { index, page } = parseImageMeta(filename, i + 1);
        images.push({ filename, index, page, url, buffer });
    }

    return images.sort((a, b) => a.index - b.index);
}

export async function extractQuestionAndHeaderImages(pdfBuffer: Buffer): Promise<{
    headerImage: ExtractedImage | null;
    questionImages: ExtractedImage[];
}> {
    const allImages = await callExtractor(env.EXTRACTOR_APP2_URL, pdfBuffer);
    const headerIdx = env.EXTRACTOR_HEADER_IMAGE_INDEX;

    const headerImage = allImages[headerIdx] ?? null;
    const questionImages = allImages.filter((_, idx) => idx !== headerIdx);
    return { headerImage, questionImages };
}

export async function extractAnswerBlockImages(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
    return callExtractor(env.EXTRACTOR_APP_URL, pdfBuffer);
}
