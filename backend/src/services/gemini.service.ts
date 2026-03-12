import { env } from '../config/env';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export async function callGemini(apiKey: string, systemInstruction: string, prompt: string, responseMimeType: string = 'text/plain') {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                responseMimeType,
                temperature: 0.1 // Low temperature for factual parsing
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Gemini returned an empty response or unexpected format.');
    }

    return text;
}

const schemaPromptInstruction = `
You are an expert at parsing Indian Government Exam response sheet documents (TCS iON / DigiAlm format).
Your goal is to output a single JSON object with two top-level keys:

1. "examDetails" — extracted metadata from the document:
   - "name": Full exam name (e.g., "SSC CGL 2024 Tier I")
   - "board": Conducting board (e.g., "SSC", "RRB", "NTA", "UPSC", "GATE")
   - "examDate": Date in ISO format (e.g., "2024-09-12")
   - "shift": Shift/session if mentioned (e.g., "Morning", "Evening", or null)
   - "totalQuestions": Total number of questions as an integer
   - "totalMarks": Total marks as a number
   - "duration": Duration in minutes as a number
   - "markingScheme": object like {"correct": 2, "wrong": -0.5, "unattempted": 0}

2. "parsingSchema" — CSS selectors or rules to extract questions from the HTML:
   - "containerSelector": CSS selector for each question block
   - "fields": object with selectors for "questionText", "correctOption", "userOption", and optionally "options"

Return ONLY valid JSON. Example:
{
  "examDetails": {
    "name": "SSC CGL 2024 Tier I",
    "board": "SSC",
    "examDate": "2024-09-12",
    "shift": "Morning",
    "totalQuestions": 100,
    "totalMarks": 200,
    "duration": 60,
    "markingScheme": { "correct": 2, "wrong": -0.5, "unattempted": 0 }
  },
  "parsingSchema": {
    "containerSelector": ".question-pnl",
    "fields": { "questionText": ".qtxt", "correctOption": ".rightAns", "userOption": ".chosen-option" }
  }
}
`;

export async function generateExamSchema(htmlContent: string) {
    const result = await callGemini(
        env.GEMINI_API_KEY,
        schemaPromptInstruction,
        `Here is the HTML of the response sheet:\n\n${htmlContent.substring(0, 500000)}`,
        'application/json'
    );
    return JSON.parse(result); // Returns { examDetails, parsingSchema }
}

const pdfMetadataPromptInstruction = `
You are an expert at parsing Indian Government Exam response sheet PDFs (SSC, RRB, NTA, GATE — generated in Adda247 / TCS iON format) that have been converted to text via OCR.

Your task is to analyze the provided full document text and return a JSON object containing exam metadata and a Regex-based parsing schema.

Return a single JSON object with these exact fields:
{
  "examDetails": {
    "name": "Combined Graduate Level Examination 2024 Tier I",
    "board": "SSC",
    "examDate": "2024-09-17",
    "shift": "Evening",
    "totalQuestions": 100,
    "totalMarks": 200,
    "duration": 60,
    "markingScheme": { "correct": 2, "wrong": -0.5, "unattempted": 0 }
  },
  "parsingSchema": {
    "questions": {
      "blockRegex": "Regex pattern that matches the entire block of a single question, from the Q.X label down to the Chosen Option.",
      "fields": {
        "questionText": "Regex pattern with ONE capture group to extract the question text from within the block.",
        "options": "Regex pattern with ONE capture group to extract a single option's text. This will be run globally to find all 4 options.",
        "correctOption": "Regex pattern with ONE capture group to extract the correct option number/letter (e.g., matching the checkmark).",
        "userOption": "Regex pattern with ONE capture group to extract the user's chosen option (e.g., 'Chosen Option\\\\s*:\\\\s*(\\\\d)' )."
      }
    }
  }
}

Read the text to find exam details and construct robust JavaScript-compatible regular expressions to extract the questions from the OCR text format. Return ONLY valid JSON. No Markdown formatting or extra text.
`;

export async function generateExamSchemaFromPdf(pdfBase64: string) {
    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: pdfMetadataPromptInstruction }] },
            contents: [{
                parts: [
                    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
                    { text: "Extract the exam metadata from this response sheet PDF and return the JSON schema as described." }
                ]
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini PDF API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Gemini returned an empty response for PDF.');
    }

    return JSON.parse(text);
}

const solutionPromptInstruction = `
You are an expert tutor for Indian Government Exams (SSC, RRB, GATE, CAT, etc.).
Your task is to write a **direct, structured solution** for the given MCQ question.

STRICT RULES — follow these exactly:
1. DO NOT write any preamble, introduction, or conversational opener. No sentences like "To find the correct answer...", "In this question...", "Let us understand...", etc.
2. START IMMEDIATELY with the solution steps. The very first line of your output must be a step heading or a direct calculation.
3. Use numbered steps: **Step 1:**, **Step 2:**, etc.
4. Use LaTeX for all math: inline math with $...$ and block equations with $$...$$
5. End with a short **Conclusion:** line stating the correct option and the final value.
6. Output plain Markdown only. No JSON, no HTML.
`;

export async function generateDetailedSolution(questionText: string, options: Record<string, string>, correctAnswer: string) {
    const prompt = `
Question:
${questionText}

Options:
${Object.entries(options).map(([k, v]) => `${k}) ${v}`).join('\n')}

Correct Answer: Option ${correctAnswer}

Provide a step-by-step solution. Start DIRECTLY with Step 1 — no preamble or introductory sentences.
    `.trim();

    return await callGemini(env.GEMINI_SOLUTIONS_API_KEY, solutionPromptInstruction, prompt, 'text/plain');
}

const parsePdfPromptInstruction = `
You are an expert at extracting question and answer data from Indian Government Exam response sheet PDFs (SSC CGL / TCS iON / Adda247 format).

The PDF you will receive shows a candidate's response sheet where:
- Questions are labeled Q.1, Q.2, Q.3... etc.
- Each question has 4 options labeled: 1. [text], 2. [text], 3. [text], 4. [text]
- The CORRECT answer is visually marked with a GREEN CHECKMARK (✓) before the option
- WRONG options are marked with a RED or ORANGE X mark (✗) before them
- On the RIGHT side of each question, there is an info box that shows:
    "Status : Answered" (or "Not Answered" / "Not Visited")
    "Chosen Option : 3" (the number the candidate actually selected)
- If Status is "Not Answered" or "Not Visited", the user effectively skipped the question — userAnswer should be null
- The marking scheme is: +2 for correct, -0.5 for wrong, 0 for skipped/null

Your task: Extract ALL questions and return a JSON array. For each question:
1. Find the question number from the Q.X label
2. Extract the full question text
3. Extract all 4 options into a map: "1", "2", "3", "4"
4. Find the CORRECT answer — it's the option with the green ✓ checkmark
5. Find the user's answer from "Chosen Option: X" in the sidebar. Map this to "1"/"2"/"3"/"4". If "Not Answered"/"Not Visited", use null.
6. Calculate isCorrect and marksAwarded based on the marking scheme above

Return ONLY a valid JSON array like this, no extra text:
[
  {
    "questionNumber": 1,
    "questionText": "Four letter-clusters have been given...",
    "options": { "1": "XMOP", "2": "NPRS", "3": "UVXW", "4": "EGIJ" },
    "correctAnswer": "3",
    "userAnswer": "3",
    "isCorrect": true,
    "marksAwarded": 2
  },
  {
    "questionNumber": 2,
    "questionText": "Each of the letters in the word MUSICAL...",
    "options": { "1": "Four", "2": "Two", "3": "Three", "4": "Five" },
    "correctAnswer": "3",
    "userAnswer": "1",
    "isCorrect": false,
    "marksAwarded": -0.5
  }
]
`;


export async function parseResponseSheetWithPdfBase64(pdfBase64: string) {
    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: parsePdfPromptInstruction }] },
            contents: [{
                parts: [
                    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
                    { text: "Extract the questions and answers from this response sheet PDF into the requested JSON array format." }
                ]
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini PDF Parsing Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Gemini returned an empty response for PDF Parsing.');
    }

    return JSON.parse(text);
}
