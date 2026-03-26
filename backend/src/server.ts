import { buildApp } from './app';
import { connectRedis } from './config/redis';

// Worker initialization.
import './workers/image-pipeline-worker';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

async function start() {
    await connectRedis();
    const app = await buildApp();

    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        app.log.info(`Server listening on port ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();

