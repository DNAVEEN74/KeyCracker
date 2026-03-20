-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "identityHash" TEXT,
    "normalizedTitle" TEXT,
    "normalizedDate" TEXT,
    "normalizedTime" TEXT,
    "normalizedSubject" TEXT,
    "headerImageUrl" TEXT,
    "examState" TEXT NOT NULL DEFAULT 'ready',
    "examDate" TIMESTAMP(3) NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "negativeMarking" BOOLEAN NOT NULL DEFAULT true,
    "markingScheme" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSchema" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "extractedSchema" JSONB NOT NULL,
    "samplePdfUrl" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "externalUrl" TEXT,
    "parsingStatus" TEXT NOT NULL,
    "schemaUsed" TEXT,
    "processingStage" TEXT,
    "totalQuestionsDetected" INTEGER NOT NULL DEFAULT 0,
    "processedQuestions" INTEGER NOT NULL DEFAULT 0,
    "isFirstTimeExam" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "currentRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionId" TEXT,
    "questionText" TEXT,
    "options" JSONB,
    "userAnswer" TEXT,
    "chosenOptionId" TEXT,
    "rawStatus" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "marksAwarded" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionId" TEXT,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "optionIds" JSONB,
    "correctOptionId" TEXT,
    "correctOptionNumber" TEXT,
    "questionImageUrl" TEXT,
    "sourceImageIndex" INTEGER,
    "explanation" TEXT NOT NULL,
    "latexContent" TEXT,
    "imageUrls" JSONB,
    "generationStatus" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-3-flash',
    "confidence" DOUBLE PRECISION,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionStatistics" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "wrongAttempts" INTEGER NOT NULL DEFAULT 0,
    "skippedAttempts" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "challengeType" TEXT NOT NULL,
    "description" TEXT,
    "totalChallenges" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exam_slug_key" ON "Exam"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_identityHash_key" ON "Exam"("identityHash");

-- CreateIndex
CREATE INDEX "Exam_board_examDate_idx" ON "Exam"("board", "examDate");

-- CreateIndex
CREATE INDEX "Exam_slug_idx" ON "Exam"("slug");

-- CreateIndex
CREATE INDEX "Exam_normalizedTitle_normalizedDate_normalizedTime_normaliz_idx" ON "Exam"("normalizedTitle", "normalizedDate", "normalizedTime", "normalizedSubject");

-- CreateIndex
CREATE INDEX "ExamSchema_examId_confidence_idx" ON "ExamSchema"("examId", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSchema_examId_schemaVersion_key" ON "ExamSchema"("examId", "schemaVersion");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_examId_totalScore_idx" ON "UserSession"("examId", "totalScore");

-- CreateIndex
CREATE INDEX "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "UserAnswer_examId_questionNumber_idx" ON "UserAnswer"("examId", "questionNumber");

-- CreateIndex
CREATE INDEX "UserAnswer_examId_sessionId_marksAwarded_idx" ON "UserAnswer"("examId", "sessionId", "marksAwarded");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_sessionId_questionNumber_key" ON "UserAnswer"("sessionId", "questionNumber");

-- CreateIndex
CREATE INDEX "Solution_examId_questionNumber_idx" ON "Solution"("examId", "questionNumber");

-- CreateIndex
CREATE INDEX "Solution_examId_questionId_idx" ON "Solution"("examId", "questionId");

-- CreateIndex
CREATE INDEX "Solution_generationStatus_idx" ON "Solution"("generationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_examId_questionNumber_key" ON "Solution"("examId", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_examId_questionId_key" ON "Solution"("examId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionStatistics_examId_accuracyRate_idx" ON "QuestionStatistics"("examId", "accuracyRate");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionStatistics_examId_questionNumber_key" ON "QuestionStatistics"("examId", "questionNumber");

-- CreateIndex
CREATE INDEX "Challenge_examId_totalChallenges_idx" ON "Challenge"("examId", "totalChallenges");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_examId_questionNumber_key" ON "Challenge"("examId", "questionNumber");

-- AddForeignKey
ALTER TABLE "ExamSchema" ADD CONSTRAINT "ExamSchema_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionStatistics" ADD CONSTRAINT "QuestionStatistics_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
