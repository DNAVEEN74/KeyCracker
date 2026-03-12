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
    const isProcessing = parsingStatus === 'pending' || parsingStatus === 'parsing';

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Performance Analysis</h1>
                    <p className="text-xs text-muted-foreground mt-1 text-mono uppercase tracking-wider">{slug}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-2">
                    {isProcessing ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-xs font-medium text-muted-foreground">AI parsing in progress...</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                            <span className="text-xs font-medium text-muted-foreground">Analysis Complete</span>
                        </>
                    )}
                </div>
            </div>

            {isProcessing && (
                <div className="mb-8 p-6 linear-surface rounded-md border border-primary/20 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <h2 className="text-lg font-semibold text-foreground">Extracting Response Sheet Data</h2>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                        Our AI is currently mapping your response sheet. This can take 10 to 60 seconds depending on OCR and server load.
                    </p>
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 ${isProcessing ? 'opacity-50 pointer-events-none blur-[1px] transition-all' : 'opacity-100 transition-all'}`}>
                <div className="lg:col-span-2 flex flex-col justify-center p-6 linear-surface rounded-md">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> Total Score
                    </h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-semibold tracking-tight text-foreground">{totalScore.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">/ {data?.exam?.totalMarks ?? 200}</span>
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col justify-center p-6 linear-surface rounded-md border-l-2 border-l-primary relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-primary" /> Live All-India Rank
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-foreground">{userRank ? `#${userRank}` : '#--'}</span>
                        <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded text-xs border border-border">
                            {userPercentile != null ? `Percentile ${userPercentile.toFixed(2)}` : 'Ranking pending'}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {totalParticipants ? `Among ${totalParticipants.toLocaleString()} completed attempts` : 'Rankings available soon'}
                    </p>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 ${isProcessing ? 'opacity-50 blur-[1px] transition-all' : 'opacity-100 transition-all'}`}>
                <div className="p-4 linear-surface rounded-md">
                    <h3 className="text-sm font-medium mb-3 text-foreground px-1">Attempt Breakdown</h3>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-2 px-3 hover:bg-secondary/50 rounded transition-colors text-sm">
                            <div className="flex items-center gap-3"><Target className="w-4 h-4 text-success" /><span className="text-foreground">Correct Answers</span></div>
                            <span className="font-semibold">{correctCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 hover:bg-secondary/50 rounded transition-colors text-sm">
                            <div className="flex items-center gap-3"><XCircle className="w-4 h-4 text-destructive" /><span className="text-foreground">Incorrect Answers</span></div>
                            <span className="font-semibold">{wrongCount}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 hover:bg-secondary/50 rounded transition-colors text-sm">
                            <div className="flex items-center gap-3"><MinusCircle className="w-4 h-4 text-muted-foreground" /><span className="text-foreground">Skipped Questions</span></div>
                            <span className="font-semibold">{skippedCount}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 linear-surface rounded-md">
                    <h3 className="text-sm font-medium mb-3 text-foreground px-1">Core Metrics</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Accuracy</p>
                            <p className="font-semibold">{accuracyPct.toFixed(2)}%</p>
                        </div>
                        <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Attempt Rate</p>
                            <p className="font-semibold">{attemptPct.toFixed(2)}%</p>
                        </div>
                        <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Positive Marks</p>
                            <p className="font-semibold text-success">+{marksBreakdown.positive.toFixed(1)}</p>
                        </div>
                        <div className="rounded border border-border p-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Negative Marks</p>
                            <p className="font-semibold text-destructive">-{marksBreakdown.negative.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 ${isProcessing ? 'opacity-50 blur-[1px] transition-all' : 'opacity-100 transition-all'}`}>
                <div className="p-4 linear-surface rounded-md">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> High-Value Misses</h4>
                    <p className="text-2xl font-semibold">{insight.highValueMisses}</p>
                    <p className="text-xs text-muted-foreground mt-1">Wrong answers on questions most students solved.</p>
                </div>
                <div className="p-4 linear-surface rounded-md">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><Percent className="w-3.5 h-3.5" /> Smart Skips</h4>
                    <p className="text-2xl font-semibold">{insight.smartSkips}</p>
                    <p className="text-xs text-muted-foreground mt-1">Unattempted questions that were globally difficult.</p>
                </div>
                <div className="p-4 linear-surface rounded-md">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> Benchmark</h4>
                    <p className="text-sm text-foreground">Avg: <span className="font-semibold">{averageScore?.toFixed?.(2) ?? '--'}</span></p>
                    <p className="text-sm text-foreground mt-1">Top: <span className="font-semibold">{highestScore?.toFixed?.(2) ?? '--'}</span></p>
                    <p className="text-xs text-muted-foreground mt-2">Based on completed responses for this exam.</p>
                </div>
            </div>

            <div className={`mt-8 p-4 bg-primary/5 border border-primary/20 rounded-md flex flex-col sm:flex-row items-center justify-between gap-4 ${isProcessing ? 'opacity-50 blur-[1px] pointer-events-none transition-all' : 'opacity-100 transition-all'}`}>
                <div>
                    <h2 className="text-sm font-semibold text-primary">Detailed Solutions Ready</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Review question-wise explanations and compare your answer with the official key.
                    </p>
                </div>
                <Link
                    href={`/exams/${slug}/solutions?session=${sessionToken}`}
                    className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded shadow-sm hover:bg-primary/90 transition-all hov-scale"
                >
                    View Solutions <ArrowRight className="ml-1.5 h-3 w-3" />
                </Link>
            </div>
        </div>
    );
}
