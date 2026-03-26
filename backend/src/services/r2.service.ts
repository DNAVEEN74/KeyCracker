import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

let client: S3Client | null = null;

function getClient(): S3Client {
    if (client) return client;
    client = new S3Client({
        region: env.AWS_REGION || 'auto',
        endpoint: env.R2_ENDPOINT,
        forcePathStyle: true,
        credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
            : undefined,
    });
    return client;
}

function ensureConfigured() {
    if (!env.R2_ENDPOINT || !env.R2_BUCKET_NAME || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.');
    }
}

function buildPublicUrl(key: string): string {
    if (env.R2_PUBLIC_BASE_URL) {
        return `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}`;
    }

    const endpointHost = new URL(env.R2_ENDPOINT as string).host;
    return `https://${env.R2_BUCKET_NAME}.${endpointHost}/${key}`;
}

export async function uploadImageToR2(key: string, buffer: Buffer, contentType: string = 'image/png'): Promise<string> {
    ensureConfigured();
    const s3 = getClient();

    await s3.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    return buildPublicUrl(key);
}

export async function uploadFileToR2(key: string, buffer: Buffer, contentType: string = 'application/pdf'): Promise<string> {
    ensureConfigured();
    const s3 = getClient();

    await s3.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'private, max-age=31536000, immutable',
    }));

    return buildPublicUrl(key);
}

import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function downloadFileFromR2(key: string): Promise<Buffer> {
    ensureConfigured();
    const s3 = getClient();

    const response = await s3.send(new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
    }));

    if (!response.Body) {
        throw new Error(`Failed to download ${key} from R2`);
    }

    const arrayBuffer = await response.Body.transformToByteArray();
    return Buffer.from(arrayBuffer);
}


