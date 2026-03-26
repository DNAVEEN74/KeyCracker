const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const session = await prisma.userSession.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { 
            exam: {
                include: {
                    solutions: { select: { id: true, questionId: true } }
                }
            },
            userAnswers: { select: { id: true, questionId: true, userAnswer: true } }
        }
    });

    console.log("Session Status:", session.parsingStatus);
    console.log("Exam ID:", session.examId);
    console.log("Solutions Generated:", session.exam?.solutions?.length || 0);
    console.log("Answers Parsed:", session.userAnswers?.length || 0);
    console.log("Total Score:", session.totalScore);
    
    // Check if there are any solutions for this exam
    if (session.examId) {
        const anySolutions = await prisma.solution.count({ where: { examId: session.examId } });
        console.log("Solutions actually bound to this exact exam in DB:", anySolutions);
        
        const allSolutions = await prisma.solution.count({});
        console.log("Total solutions in entire DB globally:", allSolutions);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
