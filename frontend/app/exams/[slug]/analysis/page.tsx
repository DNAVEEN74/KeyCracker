'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Target, XCircle, ArrowRight, MinusCircle, Loader2, Percent, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type UserAnswer = {
    questionNumber: number;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
};

type QuestionStat = {
    questionNumber: number;
    accuracyRate: number;
};

type RankingResponse = {
    user?: { rank?: number | null; score?: number | null; percentile?: number | null };
    metrics?: { totalParticipants?: number; averageScore?: number; highestScore?: number };
};

export default function AnalysisPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const searchParams = useSearchParams();
    const sessionToken = searchParams.get('session');

    type SessionData = {
        examId: string;
        parsingStatus: string;
        processingStage?: string | null;
        processedQuestions?: number;
        totalQuestionsDetected?: number;
        examPrimingProgress?: string | null;
        totalScore: number;
        correctCount?: number;
        wrongCount?: number;
        skippedCount?: number;
        correctResponses?: number;
        wrongResponses?: number;
        skippedResponses?: number;
        exam?: { totalQuestions?: number; totalMarks?: number };
    };

    const [data, setData] = useState<SessionData | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [ranking, setRanking] = useState<RankingResponse | null>(null);
    const [answers, setAnswers] = useState<UserAnswer[]>([]);
    const [stats, setStats] = useState<QuestionStat[]>([]);

    useEffect(() => {
        if (!sessionToken) return;

        const fetchSession = async () => {
            try {
                const res = await fetch(`${API_URL}/sessions/${sessionToken}`);
                if (!res.ok) throw new Error('Failed to fetch session');
                const sessionData = await res.json();
                setData(sessionData);

                if (sessionData.parsingStatus === 'completed' || sessionData.parsingStatus === 'failed') {
                    setIsPolling(false);
                }
            } catch (err) {
                console.error(err);
                setIsPolling(false);
            }
        };

        fetchSession();
        const interval = isPolling ? setInterval(fetchSession, 3000) : undefined;
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [sessionToken, isPolling]);

    useEffect(() => {
        if (!sessionToken || !data?.examId || data?.parsingStatus !== 'completed') return;

        const loadAnalytics = async () => {
            try {
                const [answersRes, rankingRes, statsRes] = await Promise.all([
                    fetch(`${API_URL}/answers?sessionToken=${encodeURIComponent(sessionToken)}`),
                    fetch(`${API_URL}/rankings/${data.examId}?sessionToken=${encodeURIComponent(sessionToken)}`),
                    fetch(`${API_URL}/answers/stats/${data.examId}`),
                ]);

                if (answersRes.ok) {
                    const answersData = await answersRes.json();
                    setAnswers(Array.isArray(answersData.answers) ? answersData.answers : []);
                }

                if (rankingRes.ok) {
                    const rankingData = await rankingRes.json();
                    setRanking(rankingData);
                }

                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(Array.isArray(statsData.stats) ? statsData.stats : []);
                }
            } catch (error) {
                console.error('Failed to load analytics:', error);
            }
        };

        loadAnalytics();
    }, [sessionToken, data?.examId, data?.parsingStatus]);

    if (!data) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-24 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-semibold">Connecting to Analysis Engine...</h2>
                <p className="text-sm text-muted-foreground mt-2">Loading session details...</p>
            </div>
        );
    }

    const parsingStatus = data.parsingStatus;
    const isProcessing = ['pending', 'parsing', 'processing', 'awaiting_exam_priming', 'evaluating_attempt'].includes(parsingStatus);

    const totalScore = Number(data.totalScore ?? 0);
    const correctCount = Number(data.correctCount ?? data.correctResponses ?? 0);
    const wrongCount = Number(data.wrongCount ?? data.wrongResponses ?? 0);
    const skippedCount = Number(data.skippedCount ?? data.skippedResponses ?? 0);
    const totalQuestions = Number(data?.exam?.totalQuestions ?? (correctCount + wrongCount + skippedCount));
    const attemptedCount = correctCount + wrongCount;
    const accuracyPct = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const attemptPct = totalQuestions > 0 ? (attemptedCount / totalQuestions) * 100 : 0;

    const marksBreakdown = (() => {
        const positive = answers.reduce((sum, a) => sum + (a.marksAwarded > 0 ? a.marksAwarded : 0), 0);
        const negative = answers.reduce((sum, a) => sum + (a.marksAwarded < 0 ? Math.abs(a.marksAwarded) : 0), 0);
        return { positive, negative };
    })();

    const getLoadingState = () => {
        switch (data?.processingStage) {
            case 'processing':
                return {
                    title: 'Extracting Origin Patterns',
                    desc: 'Reading source imagery from the cryptographic payload via extraction agents.',
                };
            case 'awaiting_exam_priming':
                return {
                    title: 'Priming Global Exam Matrix',
                    desc: `First-time exam detected. Generating AI solutions... ${data.processedQuestions || 0} / ${data.totalQuestionsDetected || '?'} questions solved. This may take a few minutes.`,
                };
            case 'evaluating_attempt':
                return {
                    title: 'Evaluating Student Attempt',
                    desc: 'Comparing extracted user responses against the verified global answer matrix.',
                };
            case 'failed':
                return {
                    title: 'System Failure',
                    desc: 'The cryptographic payload was corrupted or unreadable. Trace logging engaged.',
                };
            default:
                return {
                    title: 'Extracting Neural Data',
                    desc: 'Mapping sheet topology. Synchronizing question metadata across global board parameters.',
                };
        }
    };
    const loadingState = getLoadingState();

    const insight = (() => {
        const statsMap = new Map<number, QuestionStat>();
        stats.forEach((s) => statsMap.set(s.questionNumber, s));

        let highValueMisses = 0;
        let smartSkips = 0;

        for (const ans of answers) {
            const qStat = statsMap.get(ans.questionNumber);
            const acc = qStat?.accuracyRate ?? null;
            if (acc === null) continue;

            if (!ans.isCorrect && ans.userAnswer !== null && acc >= 0.7) highValueMisses += 1;
            if (ans.userAnswer === null && acc < 0.4) smartSkips += 1;
        }

        return { highValueMisses, smartSkips };
    })();

    const userRank = ranking?.user?.rank ?? null;
    const userPercentile = ranking?.user?.percentile ?? null;
    const totalParticipants = ranking?.metrics?.totalParticipants ?? null;
    const averageScore = ranking?.metrics?.averageScore ?? null;
    const highestScore = ranking?.metrics?.highestScore ?? null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                {/* Header & Status Protocol */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-8 bg-rzp-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Protocol // Analysis</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Performance Analysis</h1>
                        <p className="font-mono text-xs text-rzp-blue font-bold tracking-widest uppercase">ID_SESSION: {sessionToken?.slice(0, 8)} // {slug}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {isProcessing ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 ring-1 ring-white/5">
                                <Loader2 className="w-4 h-4 text-rzp-blue animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-rzp-blue animate-pulse">Syncing Cryptographic Payload</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-6 py-3 bg-rzp-blue text-white shadow-2xl shadow-rzp-blue/20">
                                <div className="w-1.5 h-1.5 bg-white rounded-none" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Analysis Engine Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Processing State: High-Tech Overlay */}
                {isProcessing && (
                    <div className="relative group bg-[#111] border border-white/5 p-20 mb-16 overflow-hidden flex flex-col items-center justify-center text-center">
                        <div className="absolute inset-0 neural-grid opacity-10" />
                        <div className="relative z-10 space-y-8 max-w-xl">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-rzp-blue/30 blur-3xl animate-pulse" />
                                <Loader2 className="w-16 h-16 text-rzp-blue animate-spin relative" />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-black uppercase tracking-tighter">{loadingState.title}</h2>
                                <p className="text-sm text-white/40 font-medium leading-relaxed uppercase tracking-wide">
                                    {loadingState.desc}
                                </p>
                            </div>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="w-1 h-1 bg-rzp-blue animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Hero Metrics: Primary Scoreboards */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 ${isProcessing ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100 transition-all duration-700'}`}>
                    <div className="relative p-12 bg-[#111] border border-white/5 group hover:border-rzp-blue/30 transition-all overflow-hidden h-[320px] flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-8 text-9xl font-black text-white/[0.02] group-hover:text-rzp-blue/5 transition-colors">SCORE</div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Target className="w-4 h-4 text-rzp-blue" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Net Payload Score</span>
                            </div>
                            <div className="flex items-baseline gap-4">
                                <span className="text-7xl md:text-9xl font-black tracking-tighter text-white">{totalScore.toFixed(1)}</span>
                                <span className="text-xl font-bold text-white/20">/ {data?.exam?.totalMarks ?? 200}</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative p-12 bg-[#111] border border-rzp-blue/20 group hover:border-rzp-blue transition-all overflow-hidden h-[320px] flex flex-col justify-center border-l-8 border-l-rzp-blue">
                        <div className="absolute top-0 right-0 p-8 text-9xl font-black text-white/[0.02] group-hover:text-rzp-blue/5 transition-colors">RANK</div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-4 h-4 text-rzp-blue" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Global Shift Ranking</span>
                            </div>
                            <div className="flex items-baseline gap-6">
                                <span className="text-7xl md:text-9xl font-black tracking-tighter text-rzp-blue">{userRank ? `#${userRank}` : '#--'}</span>
                                <div className="space-y-1">
                                    <div className="bg-rzp-blue/10 border border-rzp-blue/20 text-rzp-blue px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                        {userPercentile != null ? `${userPercentile.toFixed(2)} %tile` : 'SYNC_PENDING'}
                                    </div>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{totalParticipants ? `Among ${totalParticipants.toLocaleString()} Units` : 'CALCULATING...'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Industrial Grid Analytics */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 ${isProcessing ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100 transition-all duration-700 delay-100'}`}>
                    {/* Attempt Breakdown */}
                    <div className="bg-[#111] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Attempt Decomposition</h3>
                            <span className="text-[8px] font-mono text-white/20">DATA_SYNC // ATTEMPT_GRID</span>
                        </div>
                        <div className="p-8 space-y-4">
                            {[
                                { label: 'Extracted Correct', count: correctCount, icon: Target, color: 'text-rzp-blue', bg: 'bg-rzp-blue/10' },
                                { label: 'Anomalous Incorrect', count: wrongCount, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
                                { label: 'Systemic Skips', count: skippedCount, icon: MinusCircle, color: 'text-white/40', bg: 'bg-white/5' }
                            ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 ${row.bg} flex items-center justify-center`}>
                                            <row.icon className={`w-5 h-5 ${row.color}`} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-widest text-white/70">{row.label}</span>
                                    </div>
                                    <span className="text-2xl font-black text-white">{row.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Core Metrics Grid */}
                    <div className="bg-[#111] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Efficiency Metrics</h3>
                            <span className="text-[8px] font-mono text-white/20">AGENT_METRIC // LIVE</span>
                        </div>
                        <div className="p-8 grid grid-cols-2 gap-4">
                            {[
                                { label: 'Precision', val: accuracyPct.toFixed(2) + '%', sub: 'ACCURACY_RATE' },
                                { label: 'Saturation', val: attemptPct.toFixed(2) + '%', sub: 'ATTEMPT_DENSITY' },
                                { label: 'Positive', val: '+' + marksBreakdown.positive.toFixed(1), sub: 'GROSS_PAYLOAD', color: 'text-rzp-blue' },
                                { label: 'Negative', val: '-' + marksBreakdown.negative.toFixed(1), sub: 'MARK_ATTRITION', color: 'text-red-500' }
                            ].map((metric, i) => (
                                <div key={i} className="p-8 bg-white/[0.02] border border-white/5 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">{metric.label}</p>
                                        <p className={`text-3xl font-black tracking-tight ${metric.color || 'text-white'}`}>{metric.val}</p>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 overflow-hidden">
                                        <div className={`h-full ${metric.color ? 'bg-current opacity-30' : 'bg-rzp-blue/50'} w-1/2`} />
                                    </div>
                                    <p className="text-[7px] font-mono text-white/10 uppercase tracking-widest">{metric.sub} // CR_8</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Technical Insights Grid */}
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 ${isProcessing ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100 transition-all duration-700 delay-200'}`}>
                    {[
                        { label: 'High-Value Misses', val: insight.highValueMisses, sub: 'Global common misses', icon: BarChart3 },
                        { label: 'Strategic Skips', val: insight.smartSkips, sub: 'Advanced level optimization', icon: Percent },
                        { label: 'Global Bench', val: averageScore?.toFixed?.(1) ?? '--', sub: 'Network average', icon: Trophy }
                    ].map((insight, i) => (
                        <div key={i} className="p-10 bg-[#111] border border-white/5 space-y-6 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <insight.icon className="w-12 h-12 text-rzp-blue" />
                            </div>
                            <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{insight.label}</p>
                                <p className="text-5xl font-black text-white tracking-tighter">{insight.val}</p>
                                <p className="text-[9px] font-bold text-rzp-blue uppercase tracking-widest pt-2">{insight.sub}</p>
                            </div>
                            <div className="h-0.5 w-8 bg-white/10 group-hover:w-full group-hover:bg-rzp-blue transition-all duration-500" />
                        </div>
                    ))}
                </div>

                {/* View Solutions Action Protocol */}
                <div className={`mt-24 ${isProcessing ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100 transition-all duration-700 delay-300'}`}>
                    <div className="relative overflow-hidden bg-rzp-blue p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 group">
                        <div className="absolute inset-0 neural-grid opacity-20" />
                        <div className="relative z-10 space-y-4 text-center md:text-left">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Neural Breakdown Ready</h2>
                            <p className="text-white/70 uppercase tracking-widest text-xs font-bold max-w-xl">
                                Access the full solution protocol. Compare agent-derived steps with official sheet parameters.
                            </p>
                        </div>
                        <Link
                            href={`/exams/${slug}/solutions?session=${sessionToken}`}
                            className="relative z-10 shrink-0 inline-flex items-center justify-center px-12 py-7 text-xs font-black uppercase tracking-[0.3em] text-rzp-blue bg-white hover:scale-105 transition-all shadow-2xl"
                        >
                            Execute Solutions <ArrowRight className="ml-4 h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
