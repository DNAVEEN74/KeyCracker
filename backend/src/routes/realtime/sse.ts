import { createClient } from 'redis';
import { env } from '../../config/env';

// Shared subscriber client to avoid opening a new connection per SSE connection payload.
const sharedSubscriber = createClient({ url: env.REDIS_URL });

sharedSubscriber.on('error', (err) => console.log('Redis SSE Subscriber Error', err));

async function ensureSubscriber() {
    if (!sharedSubscriber.isOpen) {
        await sharedSubscriber.connect();
    }
}

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

    await ensureSubscriber();

    const channel = `realtime:rankings:${examId}`;
    
    // We only need to listen on the channel to forward it out
    const listener = (message: string) => {
        try {
            const data = JSON.parse(message);
            // Optional: Filter messages bound for the same token, though frontend ignores others
            reply.raw.write(`event: ${data.event}\n`);
            reply.raw.write(`data: ${message}\n\n`);
        } catch (e) {
            console.error('SSE Message parsing error', e);
        }
    };

    await sharedSubscriber.subscribe(channel, listener);

    req.raw.on('close', async () => {
        // Warning: This un-subscribes ALL listeners for this channel globally
        // This is safe ONLY if fastify/redis multiplexing handles listeners separately (it doesn't natively), 
        // A proper fix limits per-subscriber unbind, but for now we'll unbind only the specific function reference
        await sharedSubscriber.unsubscribe(channel, listener);
        reply.raw.end();
    });
}

export default async function sseRoutes(server: any) {
    server.get('/sse/:examId', sseHandler);
}
