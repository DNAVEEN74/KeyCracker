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
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <link href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" rel="stylesheet" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                {/* Header Protocol */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-8 bg-rzp-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Dep_Protocol // Solutions</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Detailed Analysis</h1>
                        <p className="font-mono text-[10px] text-rzp-blue font-bold tracking-[0.2em] uppercase">VERIFICATION_STREAM: {slug} // S_ID: {sessionToken?.slice(0, 8)}</p>
                    </div>

                    <Link
                        href={`/exams/${slug}/analysis?session=${sessionToken}`}
                        className="group flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4 text-rzp-blue group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Abort to Dashboard</span>
                    </Link>
                </div>

                {/* Question Protocol Card */}
                <div className="bg-[#111] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 pointer-events-none">
                        <span className="text-9xl font-black text-white/[0.02] tracking-tighter">Q{solution.questionNumber}</span>
                    </div>

                    {/* Question Identification Header */}
                    <div className="p-8 md:p-12 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-rzp-blue flex flex-col items-center justify-center border border-white/10">
                                <span className="text-[10px] font-black text-white/40 uppercase mb-1">Index</span>
                                <span className="text-3xl font-black text-white">{solution.questionNumber}</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    {solution.isCorrect ? (
                                        <div className="px-4 py-1.5 bg-rzp-blue/10 border border-rzp-blue/30 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-rzp-blue" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rzp-blue">System_Match</span>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-red-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">System_Mismatch</span>
                                        </div>
                                    )}
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{correctnessLabel}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wide">
                                    <p className="text-white/40">User Payload: <span className="text-white">{userAnswerText}</span></p>
                                    <div className="h-4 w-[1px] bg-white/10 mt-0.5" />
                                    <p className="text-white/40">Correct Key: <span className="text-rzp-blue">{solution.correctAnswer}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 space-y-16">
                        {/* Question Content Section */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rzp-blue flex items-center gap-3">
                                <ImageIcon className="w-4 h-4" /> Input_Stream Content
                            </h3>
                            <div className="bg-[#0a0a0a] border border-white/5 p-10 relative group">
                                <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-white/10">BLOCK_Q_{solution.questionNumber}</div>
                                <RenderQuestionContent value={solution.questionText} />
                                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-rzp-blue group-hover:w-full transition-all duration-700" />
                            </div>
                        </div>

                        {/* Options Protocol Mapping */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Logical_Option Mapping</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(solution.options || {}).map(([label, value]) => (
                                    <div
                                        key={label}
                                        className={`relative p-8 border transition-all ${solution.correctAnswer === label
                                            ? 'bg-rzp-blue/5 border-rzp-blue/40 ring-1 ring-rzp-blue/20'
                                            : label === solution.userAnswer && !solution.isCorrect
                                                ? 'bg-red-500/5 border-red-500/40'
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${solution.correctAnswer === label ? 'text-rzp-blue' : 'text-white/30'}`}>
                                                Field_{label}
                                            </span>
                                            {solution.correctAnswer === label && (
                                                <div className="px-3 py-1 bg-rzp-blue text-white text-[8px] font-black uppercase tracking-tighter">Official_Key</div>
                                            )}
                                        </div>
                                        <RenderOptionContent value={String(value)} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Verification Logic Information */}
                        <div className="bg-[#1a1a1a] border-l-4 border-l-rzp-blue p-8 flex flex-col md:flex-row items-center gap-8 group">
                            <div className="p-4 bg-rzp-blue/10 border border-rzp-blue/20 group-hover:bg-rzp-blue transition-colors">
                                <AlertTriangle className="w-5 h-5 text-rzp-blue group-hover:text-white" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Agentic_Verification_Status</p>
                                <p className="text-xs text-white/40 font-medium leading-relaxed uppercase tracking-wide">
                                    Explanation synthesized via <span className="text-rzp-blue">Gemini 1.5 Pro</span>. Logical synchronization successful. Verify complex proofs at official terminals.
                                </p>
                            </div>
                        </div>

                        {/* Step-by-Step Execution Log */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-rzp-blue flex items-center gap-3">
                                <Target className="w-4 h-4" /> Deduction_Protocol Execution
                            </h3>
                            <div className="bg-[#0a0a0a] border border-white/5 p-8 md:p-12 prose prose-invert prose-rzp max-w-none math-markdown selection:bg-rzp-blue/30 selection:text-white">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {solution.explanation || 'Protocol payload empty. Analysis engine idle.'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Dashboard Protocol */}
                    <div className="flex flex-col md:flex-row justify-between items-center p-8 md:p-12 border-t border-white/5 bg-white/[0.01] gap-12">
                        <button
                            onClick={() => {
                                setCurrentIndex((prev) => Math.max(0, prev - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentIndex === 0}
                            className="w-full md:w-auto flex items-center justify-center px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 border border-white/10 hover:border-white/30 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                            <ChevronLeft className="w-4 h-4 mr-4" /> Abort_Prev
                        </button>

                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-1 h-1 ${i === 2 ? 'bg-rzp-blue' : 'bg-white/10'}`} />
                                ))}
                            </div>
                            <div className="text-center font-mono">
                                <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] block mb-1">Index_Pos</span>
                                <span className="text-2xl font-black text-white">{String(currentIndex + 1).padStart(2, '0')}</span>
                                <span className="text-white/20 mx-3">/</span>
                                <span className="text-lg font-bold text-white/20">{String(solutions.length).padStart(2, '0')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setCurrentIndex((prev) => Math.min(solutions.length - 1, prev + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentIndex === solutions.length - 1}
                            className="w-full md:w-auto flex items-center justify-center px-12 py-5 text-[10px] font-black uppercase tracking-[0.4em] bg-rzp-blue text-white hover:scale-105 transition-all shadow-2xl shadow-rzp-blue/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Execute_Next <ChevronRight className="w-4 h-4 ml-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
