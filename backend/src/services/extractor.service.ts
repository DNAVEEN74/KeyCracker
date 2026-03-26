import { env } from '../config/env';

export type ExtractedImage = {
    filename: string;
    index: number;
    page: number | null;
    url: string;
    buffer: Buffer;
};

type ExtractedImageResponse = {
    index: number;
    page: number | null;
    filename: string;
    data: string; // Base64 data URI
};

type ExtractorUploadResponse = {
    success: boolean;
    question_count: number;
    images: ExtractedImageResponse[];
    error?: string;
};

function joinUrl(base: string, path: string): string {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function callExtractor(route: string, pdfBuffer: Buffer): Promise<ExtractedImage[]> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), 'upload.pdf');

    const uploadUrl = joinUrl(env.EXTRACTOR_URL, route);
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!uploadResponse.ok) {
        throw new Error(`Extractor API failed (${uploadResponse.status}) at ${uploadUrl}`);
    }

    const payload = await uploadResponse.json() as ExtractorUploadResponse;
    if (!payload.success || !payload.images) {
        throw new Error(payload.error || 'Extractor response missing required fields.');
    }

    const images: ExtractedImage[] = [];
    for (const item of payload.images) {
        const base64Data = item.data.split(',')[1] || item.data;
        images.push({
            filename: item.filename,
            index: item.index,
            page: item.page,
            url: '', // Unused in new architecture, images are inline
            buffer: Buffer.from(base64Data, 'base64')
        });
    }

    return images.sort((a, b) => a.index - b.index);
}

export async function extractQuestionAndHeaderImages(pdfBuffer: Buffer): Promise<{
    headerImage: ExtractedImage | null;
    questionImages: ExtractedImage[];
}> {
    const allImages = await callExtractor('/extract/questions', pdfBuffer);
    const headerIdx = env.EXTRACTOR_HEADER_IMAGE_INDEX;

    const headerImage = allImages[headerIdx] ?? null;
    const questionImages = allImages.filter((_, idx) => idx !== headerIdx);
    return { headerImage, questionImages };
}

export async function extractAnswerBlockImages(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
    return callExtractor('/extract/answers', pdfBuffer);
}
