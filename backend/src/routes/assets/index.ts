import { FastifyInstance } from 'fastify';

const ALLOWED_HOST_SUFFIXES = ['digialm.com'];

function isAllowedAssetUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        return ALLOWED_HOST_SUFFIXES.some((suffix) => parsed.hostname === suffix || parsed.hostname.endsWith(`.${suffix}`));
    } catch {
        return false;
    }
}

export default async function assetRoutes(server: FastifyInstance) {
    server.get('/proxy', async (request: any, reply: any) => {
        const { url } = (request.query as { url?: string }) || {};
        if (!url) return reply.code(400).send({ error: 'Missing url query parameter' });
        if (!isAllowedAssetUrl(url)) return reply.code(400).send({ error: 'URL host is not allowed' });

        try {
            const upstream = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://ssc.digialm.com/',
                }
            });

            if (!upstream.ok) {
                return reply.code(upstream.status).send({ error: `Upstream fetch failed (${upstream.status})` });
            }

            const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
            const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400';
            const body = Buffer.from(await upstream.arrayBuffer());

            reply.header('Content-Type', contentType);
            reply.header('Cache-Control', cacheControl);
            reply.header('X-Proxy-Source', 'keycracker-assets');
            return reply.send(body);
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: 'Failed to proxy asset' });
        }
    });
}
