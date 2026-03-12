import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import rootRoutes from './routes';

export async function buildApp() {
    const app = Fastify({
        logger: true,
    });

    // Register plugins
    await app.register(cors, {
        origin: '*', // Configure properly for production
    });

    await app.register(helmet);

    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

    await app.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 1,
        },
    });

    // Register all API routes
    await app.register(rootRoutes);

    // Health check route
    app.get('/api/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    return app;
}
