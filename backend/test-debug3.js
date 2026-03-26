const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const exam = await prisma.exam.findUnique({
        where: { id: "cmn49e7ry0002ssx7h3t1mr4u" }
    });
    
    console.log("Exam State:", exam?.examState);
    console.log("Exam Hash:", exam?.identityHash);
    
    // Check recent errors in the Redis BullMQ Failed queue using redis-cli (via child_process if needed, 
    // or we can just query the BullMQ directly but it's easier to check standard logs if possible, 
    // but here we check DB state)
}

main().finally(() => prisma.$disconnect());
