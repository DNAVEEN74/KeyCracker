# KeyCracker New Image-First Pipeline

## 1. Purpose
This document defines the new backend architecture for parsing exam response-sheet PDFs using image extraction first, then OCR + AI, with strong reuse across repeated uploads of the same exam.

This architecture replaces the previous text/schema parsing flow.

## 2. Why This Architecture
The previous pipeline depended on OCR text quality and dynamic regex/CSS schemas. This new model reduces complexity by using stable identifiers from images:

- `questionId`
- `optionId`
- `chosenOptionId`
- `correctOptionId`

Once an exam is processed the first time, future uploads of the same exam skip expensive AI solution generation.

## 3. High-Level Design

### 3.1 External Extractor Service (Railway)
Two Python scripts are deployed as a separate service:

- `app2.py`: extracts header + question images from uploaded PDF.
- `app.py`: extracts bottom-right answer-metadata blocks from uploaded PDF.

KeyCracker backend calls this service over HTTP.

### 3.2 Core Principle
Use exam-level caching by normalized identity:

`normalized(title) + normalized(date) + normalized(time) + normalized(subject)`

If a matching exam already exists and is ready, only run answer-block OCR and scoring for the new user.

## 4. End-to-End Flow

### 4.1 First-Time Exam Upload (Cold Path)
1. User uploads PDF.
2. Backend creates/fetches session and marks status `processing`.
3. Backend sends PDF to extractor service:
   1. `/extract/questions` (app2 behavior)
   2. `/extract/answers` (app behavior)
4. Backend OCRs header image (English-only v1) and extracts:
   1. exam title
   2. exam date
   3. exam time
   4. subject
5. Backend computes normalized exam identity and checks DB.
6. Exam does not exist:
   1. Create exam with `examState = priming`.
   2. Upload non-empty header image and non-empty question images to Cloudflare R2.
   3. Save asset URLs.
7. For each non-empty question image:
   1. Send to AI model.
   2. Ask for strict JSON:
      1. `questionId`
      2. `optionIds`
      3. `correctOptionId`
      4. `correctOptionNumber`
      5. detailed markdown solution
   3. Save one `Solution` row per question, linked to exam.
8. Only after all valid solutions are saved:
   1. Mark exam `ready`.
   2. Continue with user attempt evaluation.
9. OCR each answer block image from `app.py` and extract:
   1. `questionId`
   2. status text
   3. `chosenOptionId`
10. For each answer block:
   1. Join on `Solution` by `(examId, questionId)`.
   2. Compare `chosenOptionId` with `correctOptionId`.
   3. Compute correct/wrong/skipped using exam marking scheme.
11. Save user answers and session summary.
12. Mark session `completed`.

### 4.2 Repeat Upload (Warm Path)
1. User uploads PDF.
2. Header OCR identifies exam key.
3. Exam exists and `examState = ready`.
4. Skip question-image AI processing.
5. Run answer-block OCR only, then scoring via existing solutions.
6. Save session result quickly.

## 5. Session Lifecycle

### 5.1 Statuses
- `pending`
- `processing`
- `awaiting_exam_priming` (first-time only)
- `evaluating_attempt`
- `completed`
- `failed`

### 5.2 First-Time User Experience
For first-seen exams, UI should display:
- This is the first upload for this exam.
- We are preparing answer key and solutions.
- Please wait until setup finishes.

The backend must not mark session completed until all required solutions are stored.

## 6. Scoring and Attempt Semantics

### 6.1 Marking Scheme Source
Use exam DB marking scheme as primary source.
Fallback default: `+2 / -0.5 / 0`.

### 6.2 Status Handling
If status is `Marked for Review` and chosen option is missing:
- Score as skipped (`0`).
- Store raw status for frontend display.

If chosen option exists:
- Treat as attempted and compare with correct option.

## 7. Empty and Invalid Image Rules

### 7.1 Question Images (app2 output)
- If image is blank/invalid, skip AI call.
- Do not upload blank image to R2.
- Do not create solution row.

### 7.2 Answer Block Images (app output)
- If OCR yields no `questionId`, skip row.
- If OCR yields `questionId` but missing chosen option:
  - use status logic
  - classify as skipped when appropriate

### 7.3 Safety Threshold
If valid answer coverage is too low for a reliable result, fail session with a retryable error.

## 8. Cloudflare R2 Storage Strategy

### 8.1 What Is Stored
Store only first-time exam baseline assets:
- header image
- question images

Do not store per-user attempt images.

### 8.2 UI Exposure Rule
Header image is internal only and must not be shown in frontend.
Question image URLs may be shown in solutions view.

### 8.3 Object Key Convention
Recommended keys:
- `exams/{examId}/header/header.png`
- `exams/{examId}/questions/{questionId}.png` (preferred)
- fallback: `exams/{examId}/questions/index-{n}.png`

## 9. Database Model Changes

### 9.1 Exam
Add:
- `normalizedTitle`
- `normalizedDate`
- `normalizedTime`
- `normalizedSubject`
- `examState` (`priming` | `ready` | `failed`)

Add unique index over normalized identity fields.

### 9.2 Solution
Add:
- `questionId` (string)
- `correctOptionId` (string)
- `correctOptionNumber` (string/int)
- `questionImageUrl`

Add unique index: `(examId, questionId)`.

### 9.3 UserAnswer
Add:
- `questionId`
- `chosenOptionId`
- `rawStatus`

Retain scoring fields.

### 9.4 Optional ExamAsset Table
Optional normalized asset table:
- `examId`
- `assetType` (`header` | `question`)
- `questionId` nullable
- `imageUrl`
- `sourceIndex`

## 10. New Backend Components

### 10.1 Extractor Client Service
Responsibilities:
- Send PDF to extractor Railway service.
- Parse extractor responses.
- Normalize output structures.
- Retry transient failures.

### 10.2 OCR Service
Responsibilities:
- Tesseract OCR for header and answer blocks.
- English-only language pack in v1.
- Expose confidence metrics where possible.

### 10.3 Exam Priming Worker
Responsibilities:
- New exam setup
- R2 upload
- AI solution generation
- final exam readiness mark

### 10.4 Attempt Evaluation Worker
Responsibilities:
- answer-block OCR parse
- compare with solution cache
- score and persist user session results

## 11. API and Contract Changes

### 11.1 Session Metadata Response
`GET /sessions/:token` should include:
- `processingStage`
- `examPrimingProgress` (e.g., `18/100`)
- `isFirstTimeExam` boolean
- existing score/status fields

### 11.2 Upload Endpoint
`POST /sessions/:token/upload` remains entry point, but behavior changes:
- always asynchronous
- progress visible via session endpoint

### 11.3 Solution Retrieval
Solutions now sourced by `(examId, questionId)` internally; frontend still receives ordered question list.

## 12. AI Prompt Contract (Question Image)
Model must return strict JSON only:

```json
{
  "questionId": "1442742931",
  "optionIds": {
    "1": "14427411714",
    "2": "14427411713",
    "3": "14427411716",
    "4": "14427411715"
  },
  "correctOptionId": "14427411715",
  "correctOptionNumber": "4",
  "solutionMarkdown": "Step-by-step solution..."
}
```

Reject and retry if JSON is malformed or required keys are missing.

## 13. Failure Handling

### 13.1 Extractor Failures
- Network/timeouts: retry with backoff.
- Hard failures: mark session failed, user-facing retry message.

### 13.2 OCR Failures
- Per-image failures: skip and continue.
- Systemic failure (coverage below threshold): fail session.

### 13.3 AI Failures
- Retry transient rate-limit and server errors.
- If first-time exam cannot be fully primed after max retries:
  - set exam state `failed`
  - fail dependent sessions with clear reason

## 14. Idempotency and Concurrency
- Ensure only one priming pipeline runs per unique exam identity.
- Use DB locking or a unique exam key + state transitions.
- Duplicate upload jobs for same session should not duplicate rows.
- Solution upserts must be idempotent on `(examId, questionId)`.

## 15. Rollout and Migration (Non-Production Context)
- Since system is not in production, perform full replacement directly.
- Keep old code only until parity testing completes, then remove old path.

## 16. Observability
Track metrics:
- extractor latency
- OCR success rate
- AI parse success rate
- exam priming duration
- repeat-upload analysis latency
- skipped/invalid block percentages

Log with sessionId, examId, questionId for traceability.

## 17. Implementation Checklist
1. Add extractor client integration.
2. Add OCR parser for header and answer blocks.
3. Add R2 upload service.
4. Add exam priming worker.
5. Add attempt evaluation worker.
6. Update DB schema and migrations.
7. Update session status/progress API.
8. Update frontend first-time waiting states.
9. Add integration tests for cold and warm paths.
10. Remove old schema-regex parsing flow.

## 18. Current Scope Limits
- English papers only in v1.
- Hindi OCR support deferred.
- Header image is internal-only.

---

If this document is approved, implementation should follow this file as the single source of truth.
