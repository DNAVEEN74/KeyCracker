# Indian Government Exam Answer Key Analyzer - Architecture Plan

## Context

This platform addresses a critical need in the Indian competitive exam ecosystem. Every year, millions of students take government exams (SSC, RRB, NTA, GATE, CAT) and need to analyze their answer keys when released. Existing tools provide only basic score calculations without explanations or proper scaling infrastructure.

**The Problem:**
- Answer key releases trigger massive traffic spikes (10K-50K users in 10-30 minutes)
- Current tools crash or slow down during peak times
- No integrated AI-powered solutions with step-by-step explanations
- Poor SEO optimization means students can't find these tools easily
- No real-time ranking system as more users upload their keys

**The Opportunity:**
- Market gap: Combine answer key analysis + AI-generated solutions
- SEO-first approach for exam-specific pages (each exam gets dedicated URLs)
- Real-time ranking system that updates as more students join
- Mobile-first design for 95%+ mobile users in India
- Challenge tracking to help students identify disputed questions
- Anonymous access (no login required) for privacy and convenience

**Business Model:**
- Free for all users (no premium tiers)
- Revenue from Google AdSense (sticky bottom ads)
- Target: $3,000-5,000/month from ads once scaled

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER (Mobile/Desktop)            │
│                     95% mobile users in India                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare / Vercel Edge)                │
│              Static assets, ISR pages, Edge caching              │
│              Cache-Control: 95%+ hit rate target                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER (AWS ALB)                      │
│          Distributes traffic across multiple app instances       │
└─────────┬─────────────────────────────────────┬─────────────────┘
          │                                     │
          ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│  NEXT.JS + FASTIFY   │              │  NEXT.JS + FASTIFY   │
│   App Server #1-10   │     ...      │   App Server #N      │
│  (Auto-scaling ECS)  │              │  (Auto-scaling ECS)  │
└──────────┬───────────┘              └──────────┬───────────┘
           │                                     │
           └──────────────┬──────────────────────┘
                          │
          ┌───────────────┼───────────────┬─────────────────┐
          │               │               │                 │
          ▼               ▼               ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│   PGBOUNCER  │  │    REDIS     │  │   S3     │  │   GEMINI AI  │
│ Connection   │  │   Cluster    │  │  Bucket  │  │  Flash API   │
│   Pooling    │  │ (Cache+Jobs) │  │  (PDFs)  │  │  (Solutions) │
└──────┬───────┘  └──────┬───────┘  └──────────┘  └──────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ POSTGRESQL   │  │   BULLMQ     │
│   PRIMARY    │  │   WORKERS    │
│   (Writes)   │  │ (Background  │
└──────────────┘  │    Jobs)     │
       │          └──────────────┘
       ▼
┌──────────────┐
│ POSTGRESQL   │
│ READ REPLICAS│
│   (1-3 nodes)│
└──────────────┘
```

### Traffic Flow Example

**User uploads answer key:**
1. Browser → CDN → Load Balancer → App Server
2. App Server creates session (anonymous, token-based)
3. PDF uploaded to S3
4. BullMQ job queued for schema extraction
5. Redis cache checked for existing schema
6. If no schema: Gemini API called to extract parsing schema
7. Schema saved to PostgreSQL + Redis
8. Answer key parsed using schema
9. User redirected to analysis page
10. SSE connection established for real-time rank updates

**Real-time ranking updates:**
1. User submits answers → Score calculated
2. Redis sorted set updated (O(log N) operation)
3. Event published to Redis pub/sub
4. SSE server broadcasts rank update to connected clients
5. Background job queues PostgreSQL sync (eventual consistency)

---

## Tech Stack

### Frontend
- **Next.js 15+** (App Router, React Server Components)
  - ISR for SEO-optimized dynamic pages
  - Server-Side Rendering for real-time content
  - Static generation for marketing pages
  - Built-in image optimization (`next/image`)
  - Edge runtime support

- **TailwindCSS** - Mobile-first responsive design
- **React Query / SWR** - Client-side data fetching and caching
- **LaTeX Rendering** - KaTeX or MathJax for mathematical solutions
- **TypeScript** - Type safety across frontend

### Backend
- **Fastify** - High-performance Node.js server (30K+ req/s)
  - JSON Schema validation
  - Plugin ecosystem for auth, CORS, rate limiting
  - HTTP/2 support
  - Significantly faster than Express

- **Prisma ORM** - Type-safe database client
- **BullMQ** - Redis-based job queue for background processing
- **TypeScript** - Type safety across backend

### Database
- **PostgreSQL 16+** - Primary database
  - JSONB for flexible schema storage
  - Partitioning for high-volume tables
  - Materialized views for rankings
  - Full-text search capabilities

- **PgBouncer** - Connection pooling (10K app connections → 100 DB connections)

### Caching & Real-Time
- **Redis 7+** - Multi-purpose caching and pub/sub
  - Cache layer for queries and computed results
  - Sorted sets for real-time rankings (O(log N) operations)
  - Pub/sub for SSE broadcasts
  - BullMQ job queue backend
  - Session storage

- **Server-Sent Events (SSE)** - Unidirectional real-time updates
  - More efficient than WebSockets for this use case
  - Built-in reconnection
  - Standard HTTP (no protocol upgrade)

### AI Integration
- **Gemini 3 Flash API** - Google's AI model
  - Schema extraction from PDFs
  - Step-by-step solution generation
  - LaTeX formatting for mathematical content
  - Image analysis for question diagrams

### File Storage
- **AWS S3** - PDF storage with lifecycle policies
  - Standard tier: 0-7 days
  - Glacier: 7-30 days
  - Auto-delete: After 30 days

### Deployment
- **AWS ECS (Fargate)** - Container orchestration
  - Auto-scaling based on CPU/memory
  - Spot instances for background workers (70% cost savings)

- **Vercel** - Next.js frontend deployment (alternative to self-hosted)
  - Edge network for global CDN
  - Automatic HTTPS and SSL
  - Built-in ISR support

- **Cloudflare** - DNS and CDN
  - DDoS protection
  - Cache optimization
  - Analytics

### Monitoring & Analytics
- **Plausible Analytics** - Privacy-friendly, cookie-less analytics
- **CloudWatch** - AWS infrastructure monitoring
- **Sentry** - Error tracking and performance monitoring
- **UptimeRobot** - Uptime monitoring with alerts

### Development Tools
- **Docker** - Containerization for consistent environments
- **GitHub Actions** - CI/CD pipeline
- **ESLint + Prettier** - Code quality and formatting
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing

---

## Database Schema

### Core Tables

```prisma
// prisma/schema.prisma

model Exam {
  id                String   @id @default(cuid())
  slug              String   @unique // "ssc-cgl-2026-tier-1"
  name              String   // "SSC CGL 2026 Tier 1"
  board             String   // "SSC", "RRB", "NTA", "GATE", "CAT"
  examDate          DateTime
  totalQuestions    Int
  totalMarks        Float
  duration          Int      // minutes
  negativeMarking   Boolean  @default(true)
  markingScheme     Json     // { correct: 2, wrong: -0.5, unattempted: 0 }

  schemas           ExamSchema[]
  sessions          UserSession[]
  solutions         Solution[]
  statistics        QuestionStatistics[]
  challenges        Challenge[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([board, examDate])
  @@index([slug])
}

model ExamSchema {
  id                String   @id @default(cuid())
  examId            String
  exam              Exam     @relation(fields: [examId], references: [id])

  schemaVersion     String   // "v1", "v2" - for schema evolution
  extractedSchema   Json     // Gemini-generated parsing instructions
  samplePdfUrl      String   // S3 URL of the sample PDF used
  confidence        Float    // 0-1, Gemini's confidence in schema
  usageCount        Int      @default(0) // How many times reused

  createdAt         DateTime @default(now())

  @@unique([examId, schemaVersion])
  @@index([examId, confidence])
}

model UserSession {
  id                String   @id @default(cuid())
  sessionToken      String   @unique // Anonymous token (not cookie)
  examId            String
  exam              Exam     @relation(fields: [examId], references: [id])

  pdfUrl            String?  // S3 URL if uploaded
  externalUrl       String?  // Original URL if pasted
  parsingStatus     String   // "pending", "parsing", "completed", "failed"
  schemaUsed        String?  // Which schema version was used

  totalScore        Float    @default(0)
  correctCount      Int      @default(0)
  wrongCount        Int      @default(0)
  skippedCount      Int      @default(0)
  currentRank       Int?     // Updated periodically

  answers           UserAnswer[]

  createdAt         DateTime @default(now())
  expiresAt         DateTime // 30 days from creation (GDPR compliance)

  @@index([examId, totalScore])
  @@index([sessionToken])
  @@index([expiresAt]) // For cleanup job
}

// PARTITIONED BY exam_id for scalability (100K+ rows per exam)
model UserAnswer {
  id                String   @id @default(cuid())
  sessionId         String
  session           UserSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  examId            String   // Denormalized for partitioning

  questionNumber    Int
  questionText      String?  // Optional, extracted from PDF
  options           Json?    // { A: "text", B: "text", C: "text", D: "text" }
  userAnswer        String?  // "A", "B", "C", "D", null (skipped)
  correctAnswer     String   // "A", "B", "C", "D"

  isCorrect         Boolean
  marksAwarded      Float

  createdAt         DateTime @default(now())

  @@unique([sessionId, questionNumber])
  @@index([examId, questionNumber])
  @@index([examId, sessionId, marksAwarded])
}

model Solution {
  id                String   @id @default(cuid())
  examId            String
  exam              Exam     @relation(fields: [examId], references: [id])
  questionNumber    Int

  questionText      String   @db.Text
  options           Json     // { A: "text", B: "text", C: "text", D: "text" }
  correctAnswer     String   // "A", "B", "C", "D"

  explanation       String   @db.Text // Gemini-generated explanation
  latexContent      String?  @db.Text // LaTeX for mathematical formulas
  imageUrls         Json?    // Array of S3 URLs for diagrams

  generationStatus  String   // "pending", "generating", "completed", "failed"
  aiModel           String   @default("gemini-3-flash")
  confidence        Float?   // 0-1, Gemini's confidence

  viewCount         Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([examId, questionNumber])
  @@index([examId, questionNumber])
  @@index([generationStatus])
}

model QuestionStatistics {
  id                String   @id @default(cuid())
  examId            String
  exam              Exam     @relation(fields: [examId], references: [id])
  questionNumber    Int

  totalAttempts     Int      @default(0)
  correctAttempts   Int      @default(0)
  wrongAttempts     Int      @default(0)
  skippedAttempts   Int      @default(0)

  accuracyRate      Float    @default(0) // correctAttempts / totalAttempts

  updatedAt         DateTime @updatedAt

  @@unique([examId, questionNumber])
  @@index([examId, accuracyRate])
}

model Challenge {
  id                String   @id @default(cuid())
  examId            String
  exam              Exam     @relation(fields: [examId], references: [id])
  questionNumber    Int

  challengeType     String   // "wrong_answer", "wrong_question", "ambiguous"
  description       String?  @db.Text

  totalChallenges   Int      @default(0) // How many users reported

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([examId, questionNumber])
  @@index([examId, totalChallenges])
}

// Materialized view for rankings (refreshed every 5 minutes)
// CREATE MATERIALIZED VIEW exam_rankings_mv AS
// SELECT
//   exam_id,
//   session_id,
//   total_score,
//   RANK() OVER (PARTITION BY exam_id ORDER BY total_score DESC) as rank
// FROM user_sessions
// WHERE parsing_status = 'completed';
```

### Database Optimizations

**Partitioning Strategy:**
```sql
-- Partition user_answers by exam_id (list partitioning)
CREATE TABLE user_answers_partition_template (
  LIKE user_answers INCLUDING ALL
) PARTITION BY LIST (exam_id);

-- Create partitions dynamically per exam
CREATE TABLE user_answers_exam_123 PARTITION OF user_answers
FOR VALUES IN ('exam_123_id');
```

**Critical Indexes:**
```sql
-- Ranking queries (most frequent)
CREATE INDEX CONCURRENTLY idx_sessions_exam_score
ON user_sessions (exam_id, total_score DESC, created_at DESC);

-- Answer lookup
CREATE INDEX CONCURRENTLY idx_answers_session_question
ON user_answers (session_id, question_number);

-- Statistics aggregation
CREATE INDEX CONCURRENTLY idx_answers_exam_question
ON user_answers (exam_id, question_number)
INCLUDE (is_correct, marks_awarded);

-- Solution caching
CREATE INDEX CONCURRENTLY idx_solutions_exam_question
ON solutions (exam_id, question_number)
WHERE generation_status = 'completed';

-- Challenge tracking
CREATE INDEX CONCURRENTLY idx_challenges_exam_total
ON challenges (exam_id, total_challenges DESC);
```

**Connection Pooling (PgBouncer):**
```ini
[databases]
keycracker = host=localhost port=5432 dbname=keycracker

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 5
```

---

## API Design

### Fastify Route Structure

```
backend/src/routes/
├── exams/
│   ├── list.ts          GET    /api/exams
│   ├── get.ts           GET    /api/exams/:slug
│   └── create.ts        POST   /api/exams (admin only)
├── sessions/
│   ├── create.ts        POST   /api/sessions
│   ├── get.ts           GET    /api/sessions/:token
│   └── upload.ts        POST   /api/sessions/:token/upload
├── answers/
│   ├── submit.ts        POST   /api/answers/submit
│   ├── list.ts          GET    /api/answers?session=:token
│   └── stats.ts         GET    /api/answers/stats/:examId
├── solutions/
│   ├── get.ts           GET    /api/solutions/:examId/:questionNumber
│   └── list.ts          GET    /api/solutions/:examId
├── rankings/
│   ├── get.ts           GET    /api/rankings/:examId?session=:token
│   └── leaderboard.ts   GET    /api/rankings/:examId/leaderboard
├── challenges/
│   ├── create.ts        POST   /api/challenges/:examId/:questionNumber
│   └── list.ts          GET    /api/challenges/:examId
└── realtime/
    └── sse.ts           GET    /api/realtime/sse/:examId
```

### Key Endpoints

**1. Create Session (Start Analysis)**
```typescript
POST /api/sessions
Body: { examId: string }
Response: {
  sessionId: string,
  sessionToken: string,
  exam: Exam
}
```

**2. Upload Answer Key**
```typescript
POST /api/sessions/:token/upload
Headers: { Authorization: Bearer :token }
Body: FormData { file: PDF } OR { url: string }
Response: {
  uploadUrl: string,
  jobId: string,
  status: "queued"
}
```

**3. Submit Parsed Answers**
```typescript
POST /api/answers/submit
Headers: { Authorization: Bearer :token }
Body: {
  sessionToken: string,
  answers: [
    { questionNumber: 1, userAnswer: "A", correctAnswer: "B" },
    ...
  ]
}
Response: {
  totalScore: 85.5,
  correctCount: 45,
  wrongCount: 5,
  skippedCount: 0,
  rank: 234
}
```

**4. Get Solution**
```typescript
GET /api/solutions/:examId/:questionNumber
Response: {
  questionText: string,
  options: { A: string, B: string, C: string, D: string },
  correctAnswer: string,
  explanation: string,
  latexContent: string,
  imageUrls: string[]
}
```

**5. Real-Time Rankings (SSE)**
```typescript
GET /api/realtime/sse/:examId
Headers: { X-Session-Token: :token }
Response: text/event-stream

Event Stream:
event: rank_update
data: { sessionId: "xxx", rank: 234, totalScore: 85.5 }

event: stats_update
data: { totalParticipants: 12543, avgScore: 72.3 }
```

### Rate Limiting Strategy

```typescript
// Fastify rate limiting plugin
fastify.register(fastifyRateLimit, {
  global: true,
  max: 100, // 100 requests
  timeWindow: '1 minute',
  cache: 10000, // Cache 10K IPs
  redis: redisClient, // Shared across instances

  // Custom key generator
  keyGenerator: (req) => {
    return req.headers['x-session-token'] || req.ip;
  },

  // Endpoint-specific limits
  endpoints: {
    '/api/sessions/:token/upload': { max: 5, timeWindow: '15 minutes' },
    '/api/solutions/:examId/:questionNumber': { max: 50, timeWindow: '1 minute' },
    '/api/answers/submit': { max: 10, timeWindow: '5 minutes' },
  }
});
```

### Authentication Middleware

```typescript
// Anonymous session-based auth (no user accounts)
async function sessionAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers.authorization?.replace('Bearer ', '')
             || req.headers['x-session-token'];

  if (!token) {
    return reply.code(401).send({ error: 'Session token required' });
  }

  // Check Redis first (cache)
  const cachedSession = await redis.get(`session:${token}`);
  if (cachedSession) {
    req.session = JSON.parse(cachedSession);
    return;
  }

  // Fallback to database
  const session = await prisma.userSession.findUnique({
    where: { sessionToken: token }
  });

  if (!session || session.expiresAt < new Date()) {
    return reply.code(401).send({ error: 'Invalid or expired session' });
  }

  // Cache for 1 hour
  await redis.setex(`session:${token}`, 3600, JSON.stringify(session));

  req.session = session;
}
```

---

## Caching Strategy

### Multi-Layer Caching

**Layer 1: CDN (Cloudflare/Vercel Edge)**
```typescript
// Cache static assets aggressively
Cache-Control: public, max-age=31536000, immutable
- CSS, JS, images, fonts

// Cache ISR pages with revalidation
Cache-Control: public, s-maxage=60, stale-while-revalidate=3600
- Exam pages, leaderboards, solution pages
```

**Layer 2: Redis (Application Cache)**
```typescript
// Solutions (long-lived, rarely change)
KEY: solution:{examId}:{questionNumber}
TTL: 7 days
VALUE: JSON(Solution)

// Schemas (long-lived)
KEY: schema:{examId}:{version}
TTL: 30 days
VALUE: JSON(ExamSchema)

// Rankings (short-lived, frequently updated)
KEY: rankings:{examId}
TYPE: Sorted Set (ZADD)
TTL: No expiration (eviction by LRU)
MEMBERS: sessionId, SCORE: totalScore

// Session data (medium-lived)
KEY: session:{token}
TTL: 24 hours
VALUE: JSON(UserSession)

// Question statistics (medium-lived)
KEY: stats:{examId}:{questionNumber}
TTL: 5 minutes
VALUE: JSON(QuestionStatistics)
```

**Layer 3: PostgreSQL Query Result Cache**
```typescript
// Materialized views for expensive aggregations
CREATE MATERIALIZED VIEW exam_rankings_mv AS
SELECT
  exam_id,
  session_id,
  total_score,
  correct_count,
  wrong_count,
  RANK() OVER (PARTITION BY exam_id ORDER BY total_score DESC) as rank
FROM user_sessions
WHERE parsing_status = 'completed';

CREATE UNIQUE INDEX ON exam_rankings_mv (exam_id, session_id);

// Refresh every 5 minutes (cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY exam_rankings_mv;
```

### Cache Invalidation Rules

```typescript
// On answer submission
async function invalidateOnAnswerSubmit(examId: string, sessionId: string) {
  // Invalidate session cache
  await redis.del(`session:${sessionId}`);

  // Update rankings (Redis sorted set)
  const totalScore = await calculateScore(examId, sessionId);
  await redis.zadd(`rankings:${examId}`, totalScore, sessionId);

  // Invalidate stats cache
  const affectedQuestions = await getQuestionNumbers(sessionId);
  await Promise.all(
    affectedQuestions.map(q => redis.del(`stats:${examId}:${q}`))
  );

  // Trigger materialized view refresh (async, non-blocking)
  await refreshQueue.add('refresh-rankings', { examId }, { delay: 60000 });
}

// On solution generation
async function invalidateOnSolutionGenerated(examId: string, questionNumber: number) {
  // Solution cache is write-through (cache populated on creation)
  const solution = await prisma.solution.findUnique({
    where: { examId_questionNumber: { examId, questionNumber } }
  });

  await redis.setex(
    `solution:${examId}:${questionNumber}`,
    604800, // 7 days
    JSON.stringify(solution)
  );
}
```

---

## Background Jobs (BullMQ)

### Job Queue Architecture

```typescript
// backend/src/queues/index.ts

import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis';

// Queue definitions
export const schemaQueue = new Queue('schema-extraction', { connection: redisConnection });
export const parsingQueue = new Queue('answer-parsing', { connection: redisConnection });
export const solutionQueue = new Queue('solution-generation', { connection: redisConnection });
export const rankingQueue = new Queue('ranking-calculation', { connection: redisConnection });
export const refreshQueue = new Queue('cache-refresh', { connection: redisConnection });
```

### Job Types and Priorities

**1. Schema Extraction (Highest Priority - User Blocking)**
```typescript
// backend/src/workers/schema-worker.ts

const schemaWorker = new Worker(
  'schema-extraction',
  async (job) => {
    const { examId, pdfUrl, sessionId } = job.data;

    // Check if schema already exists
    const existingSchema = await redis.get(`schema:${examId}:latest`);
    if (existingSchema) {
      return { schemaId: JSON.parse(existingSchema).id, cached: true };
    }

    // Call Gemini API to extract schema
    const pdfBuffer = await downloadFromS3(pdfUrl);
    const schemaPrompt = `
      Analyze this Indian government exam answer key PDF and provide a JSON schema
      for parsing it. Identify the structure of questions, options, correct answers,
      and user responses. Return a parsing schema with field names and positions.
    `;

    const response = await geminiClient.generateContent({
      model: 'gemini-3-flash',
      contents: [
        { role: 'user', parts: [
          { text: schemaPrompt },
          { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } }
        ]}
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for consistent parsing
      }
    });

    const extractedSchema = JSON.parse(response.text);

    // Save schema to database
    const schema = await prisma.examSchema.create({
      data: {
        examId,
        schemaVersion: 'v1',
        extractedSchema,
        samplePdfUrl: pdfUrl,
        confidence: 0.95,
        usageCount: 1,
      }
    });

    // Cache in Redis
    await redis.setex(
      `schema:${examId}:latest`,
      2592000, // 30 days
      JSON.stringify(schema)
    );

    // Queue parsing job
    await parsingQueue.add('parse-answers', {
      examId,
      sessionId,
      pdfUrl,
      schemaId: schema.id,
    }, { priority: 1 });

    return { schemaId: schema.id, cached: false };
  },
  {
    connection: redisConnection,
    concurrency: 5, // Limit to 5 concurrent Gemini API calls
    limiter: {
      max: 10,
      duration: 60000, // 10 requests per minute (Gemini rate limit)
    },
  }
);
```

**2. Answer Parsing (High Priority - User Blocking)**
```typescript
// backend/src/workers/parsing-worker.ts

const parsingWorker = new Worker(
  'answer-parsing',
  async (job) => {
    const { examId, sessionId, pdfUrl, schemaId } = job.data;

    // Get schema from cache or DB
    const schema = await getSchema(examId, schemaId);

    // Parse PDF using schema
    const pdfBuffer = await downloadFromS3(pdfUrl);
    const parsedData = await parsePDF(pdfBuffer, schema.extractedSchema);

    // Validate parsed data
    if (!parsedData.answers || parsedData.answers.length === 0) {
      throw new Error('No answers found in PDF');
    }

    // Get exam for marking scheme
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const markingScheme = exam.markingScheme as any;

    // Save answers to database
    const answers = parsedData.answers.map((answer: any, index: number) => ({
      sessionId,
      examId,
      questionNumber: index + 1,
      questionText: answer.questionText,
      options: answer.options,
      userAnswer: answer.userAnswer,
      correctAnswer: answer.correctAnswer,
      isCorrect: answer.userAnswer === answer.correctAnswer,
      marksAwarded: calculateMarks(
        answer.userAnswer,
        answer.correctAnswer,
        markingScheme
      ),
    }));

    await prisma.userAnswer.createMany({ data: answers });

    // Calculate total score
    const totalScore = answers.reduce((sum, a) => sum + a.marksAwarded, 0);
    const correctCount = answers.filter(a => a.isCorrect).length;
    const wrongCount = answers.filter(a => !a.isCorrect && a.userAnswer).length;
    const skippedCount = answers.filter(a => !a.userAnswer).length;

    // Update session
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        parsingStatus: 'completed',
        totalScore,
        correctCount,
        wrongCount,
        skippedCount,
      }
    });

    // Update Redis rankings
    await redis.zadd(`rankings:${examId}`, totalScore, sessionId);

    // Publish rank update via SSE
    const rank = await redis.zrevrank(`rankings:${examId}`, sessionId);
    await redis.publish(
      `realtime:rankings:${examId}`,
      JSON.stringify({
        event: 'rank_update',
        sessionId,
        rank: rank + 1,
        totalScore,
      })
    );

    // Queue solution generation (low priority, background)
    await queueSolutionGeneration(examId, answers);

    return { totalScore, correctCount, wrongCount, skippedCount, rank: rank + 1 };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

function calculateMarks(userAnswer: string | null, correctAnswer: string, scheme: any): number {
  if (!userAnswer) return scheme.unattempted || 0;
  return userAnswer === correctAnswer ? scheme.correct : scheme.wrong;
}
```

**3. Solution Generation (Low Priority - Background)**
```typescript
// backend/src/workers/solution-worker.ts

const solutionWorker = new Worker(
  'solution-generation',
  async (job) => {
    const { examId, questionNumber, questionText, options, correctAnswer } = job.data;

    // Check if solution already exists
    const existing = await redis.get(`solution:${examId}:${questionNumber}`);
    if (existing) {
      return { solutionId: JSON.parse(existing).id, cached: true };
    }

    // Call Gemini to generate step-by-step solution
    const solutionPrompt = `
      Provide a detailed step-by-step solution for this question:

      Question: ${questionText}
      Options: ${JSON.stringify(options)}
      Correct Answer: ${correctAnswer}

      Requirements:
      1. Explain why the correct answer is correct
      2. Use LaTeX for mathematical formulas (wrap in $..$ or $$..$$)
      3. Provide step-by-step reasoning
      4. Keep explanations clear and concise
      5. Use Indian education context

      Format as JSON:
      {
        "explanation": "...",
        "latexContent": "...",
        "steps": ["step 1", "step 2", ...]
      }
    `;

    const response = await geminiClient.generateContent({
      model: 'gemini-3-flash',
      contents: [{ role: 'user', parts: [{ text: solutionPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const solutionData = JSON.parse(response.text);

    // Save to database
    const solution = await prisma.solution.create({
      data: {
        examId,
        questionNumber,
        questionText,
        options,
        correctAnswer,
        explanation: solutionData.explanation,
        latexContent: solutionData.latexContent,
        generationStatus: 'completed',
        aiModel: 'gemini-3-flash',
        confidence: 0.85,
      }
    });

    // Cache for 7 days
    await redis.setex(
      `solution:${examId}:${questionNumber}`,
      604800,
      JSON.stringify(solution)
    );

    return { solutionId: solution.id, cached: false };
  },
  {
    connection: redisConnection,
    concurrency: 3, // Lower concurrency for background jobs
    limiter: {
      max: 20,
      duration: 60000, // 20 solutions per minute
    },
  }
);
```

**4. Ranking Calculation (Periodic - Every 5 Minutes)**
```typescript
// backend/src/workers/ranking-worker.ts

const rankingWorker = new Worker(
  'ranking-calculation',
  async (job) => {
    const { examId } = job.data;

    // Sync Redis sorted set to PostgreSQL (eventual consistency)
    const redisRankings = await redis.zrevrange(
      `rankings:${examId}`,
      0,
      -1,
      'WITHSCORES'
    );

    // Update currentRank in database
    const updates = [];
    for (let i = 0; i < redisRankings.length; i += 2) {
      const sessionId = redisRankings[i];
      const score = parseFloat(redisRankings[i + 1]);
      const rank = i / 2 + 1;

      updates.push(
        prisma.userSession.update({
          where: { id: sessionId },
          data: { currentRank: rank, totalScore: score }
        })
      );
    }

    await Promise.all(updates);

    // Refresh materialized view
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY exam_rankings_mv');

    return { updatedCount: updates.length };
  },
  {
    connection: redisConnection,
    concurrency: 1, // Sequential processing
  }
);

// Schedule ranking sync every 5 minutes
setInterval(async () => {
  const activeExams = await redis.keys('rankings:*');
  for (const key of activeExams) {
    const examId = key.replace('rankings:', '');
    await rankingQueue.add('ranking-calculation', { examId });
  }
}, 300000); // 5 minutes
```

---

## Real-Time Ranking System

### Server-Sent Events (SSE) Implementation

```typescript
// backend/src/routes/realtime/sse.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from 'redis';

export async function sseHandler(
  req: FastifyRequest<{ Params: { examId: string } }>,
  reply: FastifyReply
) {
  const { examId } = req.params;
  const sessionToken = req.headers['x-session-token'] as string;

  // Validate session
  if (!sessionToken) {
    return reply.code(401).send({ error: 'Session token required' });
  }

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connection message
  reply.raw.write(`event: connected\n`);
  reply.raw.write(`data: ${JSON.stringify({ examId, sessionToken })}\n\n`);

  // Get current rank
  const currentRank = await redis.zrevrank(`rankings:${examId}`, sessionToken);
  reply.raw.write(`event: rank_update\n`);
  reply.raw.write(`data: ${JSON.stringify({ rank: currentRank + 1 })}\n\n`);

  // Subscribe to Redis pub/sub
  const subscriber = createClient({ url: process.env.REDIS_URL });
  await subscriber.connect();

  await subscriber.subscribe(`realtime:rankings:${examId}`, (message) => {
    const data = JSON.parse(message);

    // Send rank update to client
    reply.raw.write(`event: ${data.event}\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Send periodic stats updates (every 10 seconds)
  const statsInterval = setInterval(async () => {
    const totalParticipants = await redis.zcard(`rankings:${examId}`);
    const avgScore = await calculateAvgScore(examId);

    reply.raw.write(`event: stats_update\n`);
    reply.raw.write(`data: ${JSON.stringify({ totalParticipants, avgScore })}\n\n`);
  }, 10000);

  // Cleanup on connection close
  req.raw.on('close', async () => {
    clearInterval(statsInterval);
    await subscriber.unsubscribe(`realtime:rankings:${examId}`);
    await subscriber.quit();
    reply.raw.end();
  });
}

async function calculateAvgScore(examId: string): Promise<number> {
  const cached = await redis.get(`avg_score:${examId}`);
  if (cached) return parseFloat(cached);

  const scores = await redis.zrange(`rankings:${examId}`, 0, -1, { withScores: true });
  const total = scores.reduce((sum, item) => sum + (item.score || 0), 0);
  const avg = total / scores.length;

  await redis.setex(`avg_score:${examId}`, 60, avg.toString()); // Cache 1 min
  return avg;
}
```

### Frontend SSE Client

```typescript
// frontend/lib/hooks/useRealTimeRankings.ts

import { useEffect, useState } from 'react';

export function useRealTimeRankings(examId: string, sessionToken: string) {
  const [rank, setRank] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalParticipants: 0, avgScore: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/realtime/sse/${examId}`,
      {
        headers: { 'X-Session-Token': sessionToken },
        withCredentials: false
      }
    );

    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });

    eventSource.addEventListener('rank_update', (event) => {
      const data = JSON.parse(event.data);
      setRank(data.rank);
    });

    eventSource.addEventListener('stats_update', (event) => {
      const data = JSON.parse(event.data);
      setStats(data);
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect after 5 seconds
      setTimeout(() => {
        // Re-render to trigger useEffect again
        setIsConnected(false);
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, [examId, sessionToken]);

  return { rank, stats, isConnected };
}
```

---

## SEO Architecture

### Dynamic Page Generation with ISR

```typescript
// frontend/app/exams/[slug]/page.tsx

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExamBySlug, getAllExamSlugs } from '@/lib/api/exams';

interface ExamPageProps {
  params: { slug: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ExamPageProps): Promise<Metadata> {
  const exam = await getExamBySlug(params.slug);

  if (!exam) return {};

  return {
    title: `${exam.name} Answer Key Analyzer | KeyCracker`,
    description: `Analyze your ${exam.name} answer key instantly. Get detailed solutions, real-time rankings, and question-wise analysis. Free tool for ${exam.board} exam students.`,
    keywords: [
      exam.name,
      `${exam.board} answer key`,
      `${exam.name} analysis`,
      'answer key analyzer',
      'exam solutions',
      exam.board,
    ],
    openGraph: {
      title: `${exam.name} Answer Key Analyzer`,
      description: `Free tool to analyze ${exam.name} answer keys with AI-generated solutions`,
      type: 'website',
      url: `https://keycracker.in/exams/${params.slug}`,
      images: [{
        url: `/og-images/${params.slug}.jpg`,
        width: 1200,
        height: 630,
        alt: exam.name,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${exam.name} Answer Key Analyzer`,
      description: `Analyze your ${exam.name} answer key for free`,
      images: [`/og-images/${params.slug}.jpg`],
    },
    alternates: {
      canonical: `https://keycracker.in/exams/${params.slug}`,
    },
  };
}

// Generate static params for ISR
export async function generateStaticParams() {
  const slugs = await getAllExamSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

// Page component with ISR
export default async function ExamPage({ params }: ExamPageProps) {
  const exam = await getExamBySlug(params.slug);

  if (!exam) {
    notFound();
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: exam.name,
            description: `${exam.name} exam preparation and answer key analysis`,
            provider: {
              '@type': 'Organization',
              name: 'KeyCracker',
              url: 'https://keycracker.in',
            },
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'Online',
              isAccessibleForFree: true,
            },
          }),
        }}
      />

      {/* Page content */}
      <ExamAnalyzer exam={exam} />
    </>
  );
}

// ISR: Revalidate every 1 hour
export const revalidate = 3600;
```

### URL Structure

```
https://keycracker.in/
├── / (Homepage - Static)
├── /exams (Exam list - ISR, revalidate: 1 hour)
├── /exams/ssc-cgl-2026-tier-1 (Exam page - ISR, revalidate: 1 hour)
├── /exams/ssc-cgl-2026-tier-1/upload (Upload page - SSR)
├── /exams/ssc-cgl-2026-tier-1/analysis (Analysis page - SSR with SSE)
├── /exams/ssc-cgl-2026-tier-1/solutions (Solutions list - ISR, revalidate: 1 day)
├── /exams/ssc-cgl-2026-tier-1/solutions/question-1 (Solution page - ISR, revalidate: 1 day)
├── /exams/ssc-cgl-2026-tier-1/leaderboard (Leaderboard - ISR, revalidate: 5 min)
├── /boards/ssc (Board page - ISR, revalidate: 1 day)
├── /boards/rrb (Board page - ISR, revalidate: 1 day)
└── /privacy-policy (Static)
```

### Sitemap Generation

```typescript
// frontend/app/sitemap.ts

import { MetadataRoute } from 'next';
import { getAllExams } from '@/lib/api/exams';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await getAllExams();

  const examPages = exams.flatMap((exam) => [
    {
      url: `https://keycracker.in/exams/${exam.slug}`,
      lastModified: exam.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `https://keycracker.in/exams/${exam.slug}/solutions`,
      lastModified: exam.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `https://keycracker.in/exams/${exam.slug}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
  ]);

  const staticPages = [
    {
      url: 'https://keycracker.in',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: 'https://keycracker.in/exams',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: 'https://keycracker.in/boards/ssc',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: 'https://keycracker.in/boards/rrb',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: 'https://keycracker.in/boards/nta',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: 'https://keycracker.in/boards/gate',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  return [...staticPages, ...examPages];
}
```

### robots.txt

```typescript
// frontend/app/robots.ts

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: 'https://keycracker.in/sitemap.xml',
  };
}
```

---

## Security & Privacy

### Anonymous Session Management

```typescript
// No cookies, no user accounts - localStorage only

// Frontend: Create session
async function createSession(examId: string) {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId }),
  });

  const { sessionToken, sessionId } = await response.json();

  // Store in localStorage (not cookies for privacy)
  localStorage.setItem('session_token', sessionToken);
  localStorage.setItem('session_id', sessionId);

  return { sessionToken, sessionId };
}

// Backend: Generate secure token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
```

### Data Retention Policy (GDPR Compliance)

```typescript
// Automatic session cleanup after 30 days

// Cron job (runs daily)
async function cleanupExpiredSessions() {
  const expiredSessions = await prisma.userSession.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true, sessionToken: true },
  });

  // Delete associated data
  await Promise.all(
    expiredSessions.map(async (session) => {
      // Delete answers (cascade delete via Prisma)
      await prisma.userAnswer.deleteMany({ where: { sessionId: session.id } });

      // Delete Redis data
      await redis.del(`session:${session.sessionToken}`);
      await redis.zrem(`rankings:*`, session.id);

      // Delete session
      await prisma.userSession.delete({ where: { id: session.id } });
    })
  );

  console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
}

// Schedule: Daily at 2 AM
schedule('0 2 * * *', cleanupExpiredSessions);
```

### API Security

```typescript
// CORS configuration
fastify.register(fastifyCors, {
  origin: ['https://keycracker.in', 'https://www.keycracker.in'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
  credentials: false, // No cookies
});

// Helmet for security headers
fastify.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.gemini.google.com'],
      frameSrc: ["'self'", 'https://googleads.g.doubleclick.net'],
    },
  },
});

// Request size limits (prevent DoS)
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max PDF size
    files: 1, // Only 1 file per request
  },
});
```

### Input Validation

```typescript
// Fastify JSON Schema validation

const uploadSchema = {
  body: {
    type: 'object',
    required: ['examId'],
    properties: {
      examId: { type: 'string', minLength: 10, maxLength: 50 },
    },
  },
};

fastify.post('/api/sessions/:token/upload', { schema: uploadSchema }, async (req, reply) => {
  // Validation happens automatically
  // ...
});
```

---

## Deployment Architecture

### AWS Infrastructure

```yaml
# Production Infrastructure (Mumbai Region: ap-south-1)

VPC:
  CIDR: 10.0.0.0/16
  Subnets:
    - Public: 10.0.1.0/24, 10.0.2.0/24 (2 AZs)
    - Private: 10.0.10.0/24, 10.0.20.0/24 (2 AZs)
    - Database: 10.0.100.0/24, 10.0.200.0/24 (2 AZs)

Compute:
  ECS Cluster (Fargate):
    App Service:
      - Task Definition: 2 vCPU, 4 GB RAM
      - Auto-scaling: 3-10 tasks
      - Target CPU: 70%
      - Target Memory: 80%
      - Deployment: Rolling update (100% capacity)

    Worker Service:
      - Task Definition: 1 vCPU, 2 GB RAM
      - Spot instances (70% cost savings)
      - Auto-scaling: 5-20 tasks
      - Queue-based scaling (BullMQ queue length)

Load Balancer:
  ALB:
    - Type: Application Load Balancer
    - Health check: /api/health
    - SSL: ACM certificate (auto-renewal)
    - Idle timeout: 120s (for SSE connections)

Database:
  RDS PostgreSQL 16:
    Primary:
      - Instance: db.r7g.2xlarge (8 vCPU, 64 GB RAM)
      - Storage: 500 GB GP3 (12,000 IOPS)
      - Multi-AZ: Yes
      - Backup: 7 days retention
      - Encryption: AES-256

    Read Replicas:
      - Count: 2 (auto-scaling to 3 at peak)
      - Instance: db.r7g.xlarge (4 vCPU, 32 GB RAM)
      - Cross-AZ: Yes

    PgBouncer:
      - Deployed on ECS (sidecar container)
      - Pool mode: Transaction
      - Max connections: 10,000

Cache:
  ElastiCache Redis 7:
    - Node type: cache.r7g.xlarge (4 vCPU, 26.32 GB RAM)
    - Cluster mode: Enabled (3 shards, 1 replica each)
    - Encryption: In-transit and at-rest
    - Backup: Daily snapshots

Storage:
  S3:
    - Bucket: keycracker-uploads-prod
    - Encryption: SSE-S3
    - Versioning: Disabled
    - Lifecycle:
      - Standard: 0-7 days
      - Glacier: 7-30 days
      - Delete: After 30 days
    - CORS: Enabled for upload URLs

CDN:
  CloudFront:
    - Origins: ALB + S3
    - Cache behavior: Custom per path
    - SSL: ACM certificate
    - Compression: Gzip + Brotli
    - Geo-restriction: India only (optional)

Monitoring:
  CloudWatch:
    - Metrics: CPU, Memory, Disk, Network
    - Logs: Centralized log groups
    - Alarms:
      - High CPU (>80% for 5 min)
      - High Memory (>85% for 5 min)
      - HTTP 5xx errors (>50/min)
      - Database connections (>80%)
    - Dashboards: Real-time metrics

Security:
  WAF:
    - Rate limiting: 1000 req/5min per IP
    - SQL injection protection
    - XSS protection
    - Bot detection

  Security Groups:
    - ALB: 80, 443 from 0.0.0.0/0
    - ECS: 3000 from ALB only
    - RDS: 5432 from ECS only
    - Redis: 6379 from ECS only
```

### Cost Estimation (Monthly)

**Phase 1: MVP (10K users)**
```
ECS (3 tasks): $150
RDS (1 primary): $300
ElastiCache (single node): $100
S3: $20
CloudFront: $50
ALB: $25
Total: ~$645/month
```

**Phase 2: Scale (50K users)**
```
ECS (10 tasks): $500
ECS Workers (20 spot): $120
RDS (1 primary + 2 replicas): $800
ElastiCache (3 shards): $300
S3: $50
CloudFront: $150
ALB: $50
Total: ~$1,970/month
```

**Phase 3: Optimize (100K users)**
```
ECS (20 tasks): $1,000
ECS Workers (30 spot): $180
RDS (1 primary + 3 replicas): $1,200
ElastiCache (5 shards): $500
S3: $80
CloudFront: $250
ALB: $80
Reserved Instances Savings: -$400
Total: ~$2,890/month
```

### Alternative: Vercel Deployment (Frontend Only)

```yaml
# Hybrid approach: Vercel (frontend) + AWS (backend)

Vercel:
  - Next.js deployment
  - Edge network (global CDN)
  - Auto-scaling
  - Cost: $20/month (Pro plan)
  - ISR support built-in
  - Analytics included

AWS (Backend only):
  - ECS + RDS + Redis + S3
  - Cost: Reduced by ~30% (no frontend infrastructure)
  - Total: ~$1,400/month (50K users)

Benefits:
  - Simpler frontend deployment
  - Better edge caching
  - Lower operational overhead
```

---

## File Structure

### Complete Project Organization

```
keycracker/
├── frontend/                                    # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx                          # Root layout with ads
│   │   ├── page.tsx                            # Homepage (static)
│   │   ├── exams/
│   │   │   ├── page.tsx                        # Exam list (ISR)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                    # Exam details (ISR)
│   │   │       ├── upload/
│   │   │       │   └── page.tsx                # Upload page (SSR)
│   │   │       ├── analysis/
│   │   │       │   └── page.tsx                # Analysis (SSR + SSE)
│   │   │       ├── solutions/
│   │   │       │   ├── page.tsx                # Solutions list (ISR)
│   │   │       │   └── [questionNumber]/
│   │   │       │       └── page.tsx            # Solution detail (ISR)
│   │   │       └── leaderboard/
│   │   │           └── page.tsx                # Leaderboard (ISR)
│   │   ├── boards/
│   │   │   └── [board]/
│   │   │       └── page.tsx                    # Board page (ISR)
│   │   ├── sitemap.ts                          # Dynamic sitemap
│   │   ├── robots.ts                           # robots.txt
│   │   └── api/                                # API routes (proxy to backend)
│   │       └── [...path]/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── GoogleAds.tsx                   # Ad components
│   │   │   └── StickyAd.tsx
│   │   ├── exam/
│   │   │   ├── ExamCard.tsx
│   │   │   ├── ExamList.tsx
│   │   │   └── UploadForm.tsx
│   │   ├── analysis/
│   │   │   ├── AnalysisOverview.tsx
│   │   │   ├── AnswerTable.tsx
│   │   │   ├── QuestionFilter.tsx
│   │   │   └── RankDisplay.tsx
│   │   ├── solution/
│   │   │   ├── SolutionCard.tsx
│   │   │   ├── LatexRenderer.tsx
│   │   │   └── AIDisclaimer.tsx
│   │   └── leaderboard/
│   │       └── LeaderboardTable.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── exams.ts                        # API client functions
│   │   │   ├── sessions.ts
│   │   │   ├── answers.ts
│   │   │   ├── solutions.ts
│   │   │   └── rankings.ts
│   │   ├── hooks/
│   │   │   ├── useRealTimeRankings.ts          # SSE hook
│   │   │   ├── useSessionToken.ts
│   │   │   └── useAnalysis.ts
│   │   ├── seo/
│   │   │   ├── metadata.ts                     # Dynamic metadata
│   │   │   └── structuredData.ts               # JSON-LD helpers
│   │   └── utils/
│   │       ├── formatting.ts
│   │       └── validation.ts
│   ├── public/
│   │   ├── og-images/                          # Open Graph images
│   │   └── icons/
│   ├── styles/
│   │   └── globals.css                         # Tailwind CSS
│   ├── next.config.mjs                         # Next.js config
│   ├── tailwind.config.ts                      # Tailwind config
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                                     # Fastify backend
│   ├── src/
│   │   ├── app.ts                              # Fastify app setup
│   │   ├── server.ts                           # Server entry point
│   │   ├── config/
│   │   │   ├── database.ts                     # Prisma client
│   │   │   ├── redis.ts                        # Redis client
│   │   │   ├── gemini.ts                       # Gemini API client
│   │   │   └── env.ts                          # Environment variables
│   │   ├── routes/
│   │   │   ├── exams/
│   │   │   │   ├── list.ts                     # GET /api/exams
│   │   │   │   ├── get.ts                      # GET /api/exams/:slug
│   │   │   │   └── create.ts                   # POST /api/exams
│   │   │   ├── sessions/
│   │   │   │   ├── create.ts                   # POST /api/sessions
│   │   │   │   ├── get.ts                      # GET /api/sessions/:token
│   │   │   │   └── upload.ts                   # POST /api/sessions/:token/upload
│   │   │   ├── answers/
│   │   │   │   ├── submit.ts                   # POST /api/answers/submit
│   │   │   │   ├── list.ts                     # GET /api/answers
│   │   │   │   └── stats.ts                    # GET /api/answers/stats/:examId
│   │   │   ├── solutions/
│   │   │   │   ├── get.ts                      # GET /api/solutions/:examId/:questionNumber
│   │   │   │   └── list.ts                     # GET /api/solutions/:examId
│   │   │   ├── rankings/
│   │   │   │   ├── get.ts                      # GET /api/rankings/:examId
│   │   │   │   └── leaderboard.ts              # GET /api/rankings/:examId/leaderboard
│   │   │   ├── challenges/
│   │   │   │   ├── create.ts                   # POST /api/challenges/:examId/:questionNumber
│   │   │   │   └── list.ts                     # GET /api/challenges/:examId
│   │   │   ├── realtime/
│   │   │   │   └── sse.ts                      # GET /api/realtime/sse/:examId
│   │   │   └── health.ts                       # GET /api/health
│   │   ├── services/
│   │   │   ├── exam.service.ts
│   │   │   ├── session.service.ts
│   │   │   ├── parsing.service.ts              # PDF parsing logic
│   │   │   ├── ranking.service.ts              # Redis sorted set ops
│   │   │   ├── solution.service.ts
│   │   │   ├── sse.service.ts                  # SSE broadcast
│   │   │   └── s3.service.ts                   # S3 upload/download
│   │   ├── workers/
│   │   │   ├── schema-worker.ts                # BullMQ: Schema extraction
│   │   │   ├── parsing-worker.ts               # BullMQ: Answer parsing
│   │   │   ├── solution-worker.ts              # BullMQ: Solution generation
│   │   │   └── ranking-worker.ts               # BullMQ: Ranking sync
│   │   ├── queues/
│   │   │   └── index.ts                        # Queue definitions
│   │   ├── middleware/
│   │   │   ├── auth.ts                         # Session authentication
│   │   │   ├── rateLimit.ts                    # Rate limiting
│   │   │   └── errorHandler.ts
│   │   ├── utils/
│   │   │   ├── logger.ts                       # Winston logger
│   │   │   ├── validation.ts
│   │   │   └── crypto.ts
│   │   └── types/
│   │       ├── exam.types.ts
│   │       ├── session.types.ts
│   │       └── answer.types.ts
│   ├── prisma/
│   │   ├── schema.prisma                       # Database schema
│   │   ├── migrations/
│   │   └── seed.ts                             # Seed data
│   ├── Dockerfile                              # Production container
│   ├── Dockerfile.worker                       # Worker container
│   ├── docker-compose.yml                      # Local development
│   ├── tsconfig.json
│   └── package.json
│
├── infrastructure/                              # IaC (Terraform/CDK)
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── vpc.tf
│   │   ├── ecs.tf
│   │   ├── rds.tf
│   │   ├── redis.tf
│   │   ├── s3.tf
│   │   └── cloudfront.tf
│   └── scripts/
│       ├── deploy.sh
│       └── rollback.sh
│
├── docs/
│   ├── ARCHITECTURE.md                         # This document
│   ├── API.md                                  # API documentation
│   ├── DEPLOYMENT.md                           # Deployment guide
│   └── CONTRIBUTING.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                              # CI/CD pipeline
│       ├── deploy-frontend.yml
│       └── deploy-backend.yml
│
├── docker-compose.yml                          # Local development stack
├── .env.example                                # Environment variables template
├── .gitignore
└── README.md                                   # Project overview
```

---

## Implementation Phases

### Phase 1: MVP (Weeks 1-4)

**Goal:** Launch core functionality for 10K concurrent users

**Features:**
- ✅ Answer key upload (PDF + URL)
- ✅ Schema extraction (Gemini)
- ✅ Answer parsing
- ✅ Basic analysis (correct/wrong/skipped)
- ✅ Simple rankings (top 100)
- ✅ Basic SEO (meta tags, sitemap)
- ✅ Google AdSense sticky ads

**Infrastructure:**
- Vercel (frontend) or AWS ECS (3 instances)
- RDS PostgreSQL (primary only)
- Redis (single node)
- S3 (PDF storage)
- Cost: ~$600/month

**Skip for MVP:**
- AI-generated solutions (manual solutions for now)
- Real-time SSE updates (batch refresh every 30s)
- Challenge/objection system
- Advanced analytics

**Timeline:**
- Week 1: Database schema, backend API skeleton, frontend layout
- Week 2: PDF upload, schema extraction, parsing logic
- Week 3: Analysis page, rankings, SEO optimization
- Week 4: Testing, bug fixes, deployment, marketing

---

### Phase 2: Scale (Weeks 5-8)

**Goal:** Handle 50K concurrent users + AI solutions

**New Features:**
- ✅ AI-generated solutions (Gemini background jobs)
- ✅ Real-time rankings (SSE)
- ✅ Challenge system
- ✅ Section-wise analysis
- ✅ Enhanced SEO (structured data, OG images)
- ✅ Question statistics (accuracy rates)

**Infrastructure Upgrades:**
- ECS: Auto-scaling to 10 instances
- RDS: Add 2 read replicas
- Redis: Cluster mode (3 shards)
- BullMQ workers: 20 instances
- Cost: ~$1,500/month

**Timeline:**
- Week 5: BullMQ setup, solution generation worker
- Week 6: SSE implementation, real-time rankings
- Week 7: Challenge system, enhanced analytics
- Week 8: Performance testing, optimization

---

### Phase 3: Optimize (Weeks 9-12)

**Goal:** Handle 100K concurrent users + monetization

**Optimizations:**
- ✅ Database partitioning
- ✅ Materialized views
- ✅ Aggressive caching (Redis + CDN)
- ✅ Reserved instances (30% cost savings)
- ✅ CDN optimization (95%+ hit rate)

**Monetization:**
- ✅ Google AdSense optimization (A/B testing)
- ✅ Premium features (detailed reports, exports)
- ✅ API access for coaching institutes

**Infrastructure:**
- ECS: 20 instances (peak)
- RDS: 3 read replicas + PgBouncer
- Redis: 5 shards
- Cost: ~$2,500/month
- **Revenue target:** $3,000-5,000/month (ads)

**Timeline:**
- Week 9: Database optimizations, partitioning
- Week 10: Caching layer improvements
- Week 11: Monetization features, ad optimization
- Week 12: Load testing (100K users), final optimizations

---

## Verification & Testing

### End-to-End Testing Strategy

**1. Local Development Testing**
```bash
# Start local stack
docker-compose up -d

# Run migrations
cd backend && npx prisma migrate dev

# Seed database
npx prisma db seed

# Run backend tests
npm test

# Run frontend tests
cd ../frontend && npm test

# E2E tests
npx playwright test
```

**2. Load Testing (K6)**
```javascript
// load-tests/answer-key-upload.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp up to 1K users
    { duration: '10m', target: 10000 }, // Ramp up to 10K users
    { duration: '5m', target: 50000 },  // Spike to 50K users
    { duration: '10m', target: 10000 }, // Scale down
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Create session
  const sessionRes = http.post('https://keycracker.in/api/sessions', {
    examId: 'ssc-cgl-2026-tier-1',
  });

  check(sessionRes, {
    'session created': (r) => r.status === 200,
  });

  const { sessionToken } = sessionRes.json();

  // Upload PDF
  const uploadRes = http.post(
    `https://keycracker.in/api/sessions/${sessionToken}/upload`,
    { file: http.file(open('./sample-answer-key.pdf', 'b')) },
    { headers: { Authorization: `Bearer ${sessionToken}` } }
  );

  check(uploadRes, {
    'upload successful': (r) => r.status === 200,
  });

  sleep(1);
}
```

**3. Monitoring Dashboard (CloudWatch)**
```yaml
Metrics to Monitor:
  Application:
    - Request rate (req/s)
    - Response time (p50, p95, p99)
    - Error rate (5xx/4xx)
    - Active SSE connections
    - BullMQ job queue length
    - BullMQ job processing time

  Database:
    - Connection pool usage
    - Query execution time
    - Read/Write IOPS
    - CPU utilization
    - Storage usage

  Cache:
    - Cache hit rate
    - Eviction rate
    - Memory usage
    - Network throughput

  Infrastructure:
    - ECS task count
    - CPU/Memory per task
    - ALB request count
    - CloudFront cache hit rate

Alerts:
  Critical:
    - Error rate > 5% for 5 min
    - Database CPU > 90% for 5 min
    - Redis memory > 90%
    - ECS task crash rate > 10%

  Warning:
    - Response time p95 > 1s for 5 min
    - Cache hit rate < 80%
    - Queue length > 1000 jobs
```

**4. SEO Verification**
```bash
# Google Search Console
- Submit sitemap: https://keycracker.in/sitemap.xml
- Monitor indexing status
- Check mobile usability
- Verify Core Web Vitals

# Lighthouse CI (automated)
- Performance score > 90
- SEO score > 95
- Best Practices score > 90
- Accessibility score > 90

# Structured data validation
- Google Rich Results Test
- Schema.org validator
```

---

## Critical Success Factors

### Must-Have for Launch

1. ✅ **Performance:** Handle 10K concurrent users without degradation
2. ✅ **SEO:** All exam pages indexed within 48 hours
3. ✅ **Mobile-First:** Perfect rendering on all mobile devices
4. ✅ **Privacy:** No cookies, GDPR compliant
5. ✅ **Reliability:** 99.9% uptime SLA
6. ✅ **Speed:** Page load < 2s, API response < 500ms

### Metrics for Success

**Week 1:**
- 1,000 daily active users
- 50 exams analyzed per day
- $50/day ad revenue

**Month 1:**
- 10,000 daily active users
- 500 exams analyzed per day
- $100/day ad revenue

**Month 3:**
- 50,000 daily active users
- 5,000 exams analyzed per day
- $300/day ad revenue ($9,000/month)

**Month 6:**
- 100,000 daily active users
- 10,000 exams analyzed per day
- $500/day ad revenue ($15,000/month)

---

## Next Steps

After plan approval, implementation will begin with:

1. **Repository Setup:** Initialize frontend and backend repos
2. **Database Schema:** Create Prisma schema and run migrations
3. **Backend API:** Build Fastify routes and services
4. **Frontend Pages:** Create Next.js pages with ISR
5. **Gemini Integration:** Implement schema extraction and solution generation
6. **Deployment:** Set up AWS infrastructure with Terraform
7. **Testing:** Load testing with K6, E2E testing with Playwright
8. **Launch:** Deploy to production, submit sitemap to Google

This architecture is production-ready and designed to scale from 10K to 100K concurrent users with excellent SEO, real-time features, and mobile-first design. The phased approach allows for iterative improvements while maintaining a stable platform.
