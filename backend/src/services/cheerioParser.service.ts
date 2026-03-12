import * as cheerio from 'cheerio';

export interface ParsedQuestion {
    questionNumber: number;
    questionText: string;
    options: Record<string, string>;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
}

function normalizeAnswer(val: string | null | undefined): string | null {
    if (!val) return null;
    const cleaned = val.replace(/[\x00-\x1F]/g, '').trim();
    if (!cleaned) return null;
    const lower = cleaned.toLowerCase();
    if (lower === '--' || lower.includes('not answered') || lower.includes('not visited') || lower.includes('not attempted')) {
        return null;
    }

    const match = cleaned.match(/\d+/) || cleaned.match(/[A-D]/i);
    if (!match) return null;
    const extracted = match[0];

    const num = parseInt(extracted, 10);
    if (!isNaN(num) && num >= 1 && num <= 4) {
        return String.fromCharCode(64 + num);
    }

    return extracted.toUpperCase();
}

export function parseResponseSheetWithSchema(html: string, schema: any): ParsedQuestion[] {
    const $ = cheerio.load(html);
    const questions: ParsedQuestion[] = [];

    // Support both schema shapes:
    // 1) { questions: { containerSelector, fields } }
    // 2) { containerSelector, fields }
    const schemaRoot = schema?.questions ?? schema ?? {};
    const { containerSelector, fields } = schemaRoot;

    if (!containerSelector || !fields) {
        throw new Error('Invalid schema format returned from Gemini');
    }

    $(containerSelector).each((index, element) => {
        const qElem = $(element);

        try {
            const qNumberText = qElem.find('td.bold').first().text() || '';
            const parsedNumber = qNumberText.match(/Q\.\s*(\d+)/i)?.[1];
            const questionNumber = parsedNumber ? parseInt(parsedNumber, 10) : index + 1;

            const questionNode = qElem.find(fields.questionText).first();
            let questionText = questionNode.text().replace(/[\x00-\x1F]/g, '').trim();
            if (!questionText) {
                const questionImage = questionNode.find('img').first().attr('src');
                questionText = questionImage ? `[QUESTION_IMAGE] ${questionImage}` : 'No text extracted';
            }

            // Try to extract options as a key-value mapping (A, B, C, D)
            const options: Record<string, string> = {};
            if (fields.options) {
                const optionElems = qElem.find(fields.options);
                const labels = ['A', 'B', 'C', 'D', 'E'];
                optionElems.each((i, opt) => {
                    if (i < labels.length) {
                        const optElem = $(opt);
                        let optionText = optElem.text().replace(/[\x00-\x1F]/g, '').trim();
                        const optionImage = optElem.find('img').last().attr('src');
                        if ((!optionText || /^[1-5][.)]?$/.test(optionText)) && optionImage) {
                            optionText = `[OPTION_IMAGE] ${optionImage}`;
                        }
                        options[labels[i]] = optionText;
                    }
                });
            }

            // Fallback rules for correct/user answers since string formats vary wildly in TCS iON
            let correctAnswer = qElem.find(fields.correctOption).first().text().trim();
            let userAnswerStr = qElem.find(fields.userOption).first().text().trim();
            const statusText = fields.status ? qElem.find(fields.status).first().text().trim() : '';

            // Normalize inputs
            // Example: TCS iON often outputs "Chosen Option: 2" and "Right Answer: 2" or "A/B/C/D"
            if (userAnswerStr.length > 1) {
                const match = userAnswerStr.match(/\d+/) || userAnswerStr.match(/[A-D]/i);
                userAnswerStr = match ? match[0] : userAnswerStr;
            }
            if (correctAnswer.length > 1) {
                const match = correctAnswer.match(/\d+/) || correctAnswer.match(/[A-D]/i);
                correctAnswer = match ? match[0] : correctAnswer;
            }

            // In some DigiAlm pages, user option is missing when status is not answered.
            if (!userAnswerStr && statusText && /not answered|not visited|not attempted/i.test(statusText)) {
                userAnswerStr = '--';
            }

            const safeUserAnswer = normalizeAnswer(userAnswerStr);
            const safeCorrectAnswer = normalizeAnswer(correctAnswer) || 'A';

            const isCorrect = safeUserAnswer === safeCorrectAnswer;
            const marksAwarded = isCorrect ? 2 : (safeUserAnswer === null ? 0 : -0.5); // Example scoring

            questions.push({
                questionNumber,
                questionText,
                options,
                userAnswer: safeUserAnswer,
                correctAnswer: safeCorrectAnswer,
                isCorrect,
                marksAwarded
            });
        } catch (err) {
            console.error(`Failed to parse question index ${index}`, err);
        }
    });

    return questions;
}
