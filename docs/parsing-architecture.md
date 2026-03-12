# Parsing Architecture (DigiAlm HTML + PDF Upload)

## Goal
Support two input types with a single queue-based backend pipeline:

1. DigiAlm response-sheet HTML URL
2. Uploaded answer-key PDF (including image-heavy PDFs)

## High-level flow
1. Client creates session (`POST /sessions`).
2. Client submits either:
   - `POST /sessions/:token/parse` with `url` (HTML flow), or
   - `POST /sessions/:token/upload` with PDF (PDF flow).
3. `schema-extraction` worker determines/loads parsing schema.
4. `answer-parsing` worker extracts answers, calculates score, stores `UserAnswer`.
5. `solution-generation` worker generates explanations per question.

## HTML URL flow (DigiAlm)
1. Detect known DigiAlm URL pattern:
   - host contains `digialm.com`
   - path contains `AssessmentQPHTMLMode1`
2. Use built-in deterministic schema (no Gemini dependency):
   - question container: `.question-pnl`
   - correct answer: `.rightAns`
   - chosen answer: `table.menu-tbl` row with `Chosen Option`
   - status: `table.menu-tbl` row with `Status`
3. Parse with Cheerio and normalize answers to `A/B/C/D/null`.
4. If text content is image-based, store image placeholders:
   - `[QUESTION_IMAGE] <src>`
   - `[OPTION_IMAGE] <src>`

## PDF flow
1. Try direct PDF text extraction (`pdf-parse`).
2. If extracted text is weak (too short / too few `Q.n` markers), fallback to OCR:
   - render pages with `pdftoppm` (`300 DPI`)
   - OCR each page with `tesseract` (`--psm 11`)
3. Apply regex schema to OCR text.
4. Normalize answers and score per question.

## Caching rules
Schema cache is reused only when compatible with input type:

- PDF input requires regex schema (`blockRegex + fields`).
- HTML input requires selector schema (`containerSelector + fields`).

If cached schema exists but is incompatible, regenerate.

## Error handling
- If zero questions are parsed, mark session `failed` (do not silently complete).
- Strip control characters before DB writes to avoid UTF-8 byte-sequence failures.

