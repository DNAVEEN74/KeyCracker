import { buildApp } from './app';

// Import workers to initialize them — without these imports, workers never start consuming jobs from the queue
import './workers/schema-worker';
import './workers/parsing-worker';
import './workers/solution-worker';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

async function start() {
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
