'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Target, XCircle, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DIGIALM_BASE = 'https://ssc.digialm.com';

type SolutionRow = {
    questionNumber: number;
    questionText: string;
    options: Record<string, string>;
    explanation: string;
    correctAnswer: string;
    userAnswer?: string | null;
    isCorrect?: boolean | null;
};

type SessionResponse = { examId: string };
type AnswersResponse = { answers?: Array<{ questionNumber: number; userAnswer: string | null; isCorrect: boolean | null }> };
type SolutionsResponse = { solutions?: Array<Omit<SolutionRow, 'userAnswer' | 'isCorrect'>> };

function resolveDigialmUrl(raw: string): string {
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
    if (raw.startsWith('/')) return `${DIGIALM_BASE}${raw}`;
    return `${DIGIALM_BASE}/${raw.replace(/^\.?\//, '')}`;
}

function toProxyUrl(url: string): string {
    return `${API_URL}/assets/proxy?url=${encodeURIComponent(url)}`;
}

function extractImageFromPlaceholder(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = value.match(/^\[(QUESTION_IMAGE|OPTION_IMAGE)\]\s*(.+)$/);
    if (!match) return null;
    return match[2].trim();
}

function RenderQuestionContent({ value }: { value: string }) {
    const imagePath = extractImageFromPlaceholder(value);
    if (imagePath) {
        const resolved = resolveDigialmUrl(imagePath);
        return (
            <div className="rounded border border-border/40 bg-background/30 p-2">
                <img
                    src={toProxyUrl(resolved)}
                    alt="Question visual"
                    className="max-h-[420px] w-auto max-w-full mx-auto object-contain"
                    loading="lazy"
                />
            </div>
        );
    }
    return <p className="text-sm leading-relaxed text-foreground">{value || 'No question text available.'}</p>;
}

function RenderOptionContent({ value }: { value: string }) {
    const imagePath = extractImageFromPlaceholder(value);
    if (imagePath) {
        const resolved = resolveDigialmUrl(imagePath);
        return (
            <img
                src={toProxyUrl(resolved)}
                alt="Option visual"
                className="max-h-28 w-auto max-w-full object-contain"
                loading="lazy"
            />
        );
    }
    return <span className="text-sm text-foreground">{value || '-'}</span>;
}

export default function SolutionsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const searchParams = useSearchParams();
    const sessionToken = searchParams.get('session');

    const [currentIndex, setCurrentIndex] = useState(0);
    const [solutions, setSolutions] = useState<SolutionRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!sessionToken) return;

        const loadContent = async () => {
            try {
                const sessionRes = await fetch(`${API_URL}/sessions/${sessionToken}`);
                if (!sessionRes.ok) throw new Error('Session not found');
                const sessionData = (await sessionRes.json()) as SessionResponse;

                const [solRes, answersRes] = await Promise.all([
                    fetch(`${API_URL}/solutions/${sessionData.examId}`),
                    fetch(`${API_URL}/answers?sessionToken=${encodeURIComponent(sessionToken)}`),
                ]);

                if (!solRes.ok) throw new Error('Solutions not found');
                const solData = (await solRes.json()) as SolutionsResponse;

                const answersData = answersRes.ok ? ((await answersRes.json()) as AnswersResponse) : { answers: [] };
                const answersMap = new Map<number, { userAnswer: string | null; isCorrect: boolean | null }>();
                (answersData.answers || []).forEach((a) => {
                    answersMap.set(a.questionNumber, a);
                });

                const merged = (solData.solutions || []).map((s) => {
                    const answer = answersMap.get(s.questionNumber);
                    return {
                        ...s,
                        userAnswer: answer?.userAnswer ?? null,
                        isCorrect: typeof answer?.isCorrect === 'boolean' ? answer.isCorrect : null,
                    } as SolutionRow;
                });

                setSolutions(merged);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadContent();
    }, [sessionToken]);

    const solution = useMemo(() => solutions[currentIndex], [solutions, currentIndex]);

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-semibold">Loading Detailed Solutions...</h2>
                <p className="text-sm text-muted-foreground mt-2">Connecting to KeyCracker AI Engine.</p>
            </div>
        );
    }

    if (solutions.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
                <h2 className="text-xl font-semibold">Solutions are currently generating.</h2>
                <p className="text-sm text-muted-foreground mt-2 mb-6">Our AI is computing the step-by-step logic for these questions. Please check back in a few minutes.</p>
                <Link href={`/exams/${slug}/analysis?session=${sessionToken}`} className="text-primary hover:underline text-sm">
                    Return to Analysis Dashboard
                </Link>
            </div>
        );
    }

    const userAnswerText = solution.userAnswer ?? 'Not Answered';
    const correctnessLabel = solution.isCorrect === null || solution.isCorrect === undefined
        ? 'Answer status unavailable'
        : solution.isCorrect ? 'Correct Answer' : 'Incorrect Answer';

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-8">
            <link href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" rel="stylesheet" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-border gap-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Detailed Solutions</h1>
                    <p className="mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">{slug}</p>
                </div>
                <Link
                    href={`/exams/${slug}/analysis?session=${sessionToken}`}
                    className="text-xs font-medium text-foreground hover:text-primary transition-colors border border-border bg-secondary/50 px-3 py-1.5 rounded"
                >
                    &larr; Back to Dashboard
                </Link>
            </div>

            <div className="linear-surface rounded-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-6 border-b border-border/50 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded border border-border bg-secondary/50 text-sm font-semibold tracking-wider">
                            Q{solution.questionNumber}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {solution.isCorrect ? <Target className="text-success w-4 h-4" /> : <XCircle className="text-destructive w-4 h-4" />}
                                <p className="text-sm font-semibold text-foreground tracking-tight">{correctnessLabel}</p>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Your answer: <span className="text-foreground font-medium">{userAnswerText}</span> &middot; Correct: <span className="font-semibold text-foreground">{solution.correctAnswer}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Question
                    </h3>
                    <div className="bg-secondary/20 border border-border/30 p-4 rounded mb-6">
                        <RenderQuestionContent value={solution.questionText} />
                    </div>

                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                        {Object.entries(solution.options || {}).map(([label, value]) => (
                            <div key={label} className={`rounded border p-3 ${solution.correctAnswer === label ? 'border-success/40 bg-success/5' : 'border-border/40 bg-background/40'}`}>
                                <p className="text-xs text-muted-foreground mb-2">Option {label}</p>
                                <RenderOptionContent value={String(value)} />
                            </div>
                        ))}
                    </div>

                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium">AI-Generated Content</p>
                            <p className="text-xs mt-1">This solution is AI generated and may contain mistakes. Cross-check important questions.</p>
                        </div>
                    </div>

                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" /> AI Explanation
                    </h3>
                    <div className="text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none math-markdown">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {solution.explanation || 'Explanation not available yet.'}
                        </ReactMarkdown>
                    </div>
                </div>

                <div className="flex justify-between items-center px-6 py-4 border-t border-border/50 bg-secondary/10">
                    <button
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center px-3 py-1.5 text-xs font-medium rounded hover:bg-secondary border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </button>

                    <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                        {currentIndex + 1} of {solutions.length}
                    </span>

                    <button
                        onClick={() => setCurrentIndex((prev) => Math.min(solutions.length - 1, prev + 1))}
                        disabled={currentIndex === solutions.length - 1}
                        className="flex items-center px-4 py-1.5 text-[13px] font-medium bg-primary text-primary-foreground rounded shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hov-scale"
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
