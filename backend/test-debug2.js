const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const session = await prisma.userSession.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!session) {
        console.log("No sessions found");
        return;
    }

    console.log("Session Status:", session.parsingStatus);
    console.log("Exam ID:", session.examId);
    console.log("Total Score:", session.totalScore);
    console.log("Processed Questions:", session.processedQuestions);
    console.log("Total Questions Detected:", session.totalQuestionsDetected);
    
    // Check if there are any solutions for this exam
    if (session.examId) {
        const anySolutions = await prisma.solution.count({ where: { examId: session.examId } });
        console.log("Solutions actually bound to this exact exam in DB:", anySolutions);
        
        const answersCount = await prisma.userAnswer.count({ where: { sessionId: session.id } });
        console.log("Answers parsed and stored for this session:", answersCount);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
