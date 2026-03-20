import { createClient } from 'redis';
import { env } from '../../config/env';

export async function sseHandler(
    req: any,
    reply: any
) {
    const { examId } = req.params;
    const sessionToken = req.headers['x-session-token'] as string;

    if (!sessionToken) {
        return reply.code(401).send({ error: 'Session token required' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({ examId, sessionToken })}\n\n`);

    const subscriber = createClient({ url: env.REDIS_URL });
    await subscriber.connect();

    await subscriber.subscribe(`realtime:rankings:${examId}`, (message) => {
        const data = JSON.parse(message);
        reply.raw.write(`event: ${data.event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    req.raw.on('close', async () => {
        await subscriber.unsubscribe(`realtime:rankings:${examId}`);
        await subscriber.quit();
        reply.raw.end();
    });
}

export default async function sseRoutes(server: any) {
    server.get('/sse/:examId', sseHandler);
}
