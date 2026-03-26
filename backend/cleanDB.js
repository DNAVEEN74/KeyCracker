const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
    try {
        console.log("Cleaning database...");
        
        // Delete in order to respect foreign key constraints
        const answers = await prisma.userAnswer.deleteMany();
        console.log(`Deleted ${answers.count} UserAnswers`);

        const solutions = await prisma.solution.deleteMany();
        console.log(`Deleted ${solutions.count} Solutions`);

        const sessions = await prisma.userSession.deleteMany();
        console.log(`Deleted ${sessions.count} UserSessions`);

        const stats = await prisma.questionStatistics.deleteMany();
        console.log(`Deleted ${stats.count} QuestionStatistics`);

        if (prisma.ranking) {
            const rankings = await prisma.ranking.deleteMany();
            console.log(`Deleted ${rankings.count} Rankings`);
        }

        const exams = await prisma.exam.deleteMany();
        console.log(`Deleted ${exams.count} Exams`);

        console.log("\n✅ Database cleaned successfully! You are ready for a fresh start.");
    } catch (e) {
        console.error("Failed to clean database:", e);
    }
}

clean().finally(() => prisma.$disconnect());
