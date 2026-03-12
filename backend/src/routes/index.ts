import { FastifyInstance, FastifyPluginAsync } from 'fastify';

import healthRoutes from './health';
import examRoutes from './exams';
import sessionRoutes from './sessions';
import answerRoutes from './answers';
import solutionRoutes from './solutions';
import rankingsRoutes from './rankings';
import sseRoutes from './realtime/sse';
import assetRoutes from './assets';

export default async function rootRoutes(server: FastifyInstance) {
    server.register(healthRoutes, { prefix: '/health' });
    server.register(examRoutes, { prefix: '/exams' });
    server.register(sessionRoutes, { prefix: '/sessions' });
    server.register(answerRoutes, { prefix: '/answers' });
    server.register(solutionRoutes, { prefix: '/solutions' });
    server.register(rankingsRoutes, { prefix: '/rankings' });
    server.register(sseRoutes, { prefix: '/realtime' });
    server.register(assetRoutes, { prefix: '/assets' });
}
