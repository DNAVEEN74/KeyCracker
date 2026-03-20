import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.get('/', async (request: any, reply: any) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
};

export default healthRoutes;
