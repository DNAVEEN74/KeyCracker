import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

async function diagnose() {
    // 1. Check recent sessions
    const sessions = await prisma.userSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, parsingStatus: true, examId: true, createdAt: true, schemaUsed: true }
    });
    console.log('\n=== RECENT SESSIONS ===');
    sessions.forEach(s => console.log(JSON.stringify(s)));

    // 2. Check BullMQ queue
    const schemaQ = new Queue('schema-extraction', { connection: { host: 'localhost', port: 6379 } });
    const failed = await schemaQ.getFailed(0, 5);
    const active = await schemaQ.getActive(0, 5);
    const waiting = await schemaQ.getWaiting(0, 5);

    console.log('\n=== SCHEMA QUEUE ===');
    console.log('Active:', active.length);
    console.log('Waiting:', waiting.length);
    console.log('Failed:', failed.length);
    failed.forEach(j => console.log('  FAILED JOB failedReason:', j.failedReason, 'stacktrace:', j.stacktrace));

    await schemaQ.close();
    await prisma.$disconnect();
}

diagnose().catch(e => { console.error('ERROR:', e); process.exit(1); });
