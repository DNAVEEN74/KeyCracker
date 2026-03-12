import { Queue } from 'bullmq';

async function cleanAll() {
    const connection = { host: 'localhost', port: 6379 };

    const queues = [
        new Queue('schema-extraction', { connection }),
        new Queue('answer-parsing', { connection }),
        new Queue('solution-generation', { connection }),
    ];

    for (const q of queues) {
        const name = (q as any).name;
        // Drain waiting jobs
        await q.drain();
        // Clean completed jobs
        await q.clean(0, 1000, 'completed');
        // Clean failed jobs
        await q.clean(0, 1000, 'failed');

        const remaining = await q.getJobCounts();
        console.log(`${name}:`, remaining);
        await q.close();
    }

    console.log('All queues cleaned.');
}

cleanAll().catch(e => { console.error(e); process.exit(1); });
