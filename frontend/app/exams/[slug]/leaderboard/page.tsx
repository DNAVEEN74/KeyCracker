'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type LeaderboardRow = {
    id: string;
    rank: number;
    score: number;
};

export default function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
    const [metrics, setMetrics] = useState<{ totalParticipants: number; averageScore: number; highestScore: number } | null>(null);

    useEffect(() => {

        const load = async () => {
            try {
                const examRes = await fetch(`${API_URL}/exams/${slug}`);
                if (!examRes.ok) throw new Error('Exam not found');
                const examData = await examRes.json();
                const examId = examData?.exam?.id;
                if (!examId) throw new Error('Missing exam id');

                const leaderboardRes = await fetch(`${API_URL}/rankings/${examId}/leaderboard`);
                if (!leaderboardRes.ok) throw new Error('Failed to load leaderboard');
                const leaderboardData = await leaderboardRes.json();

                setLeaderboard(Array.isArray(leaderboardData.leaderboard) ? leaderboardData.leaderboard : []);
                setMetrics(leaderboardData.metrics || null);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        load();
        const interval = setInterval(load, 10000);
        return () => {
            clearInterval(interval);
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Trophy className="text-primary w-5 h-5" />
                        Live Leaderboard
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">{slug}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <Link
                        href={`/exams/${slug}/analysis`}
                        className="text-xs font-medium text-foreground hover:text-primary transition-colors border border-border bg-secondary/50 px-3 py-1.5 rounded flex items-center gap-1.5"
                    >
                        My Analysis
                    </Link>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 border border-success/20 text-success rounded text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                        Live Connect
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 linear-surface rounded-md flex items-center gap-3">
                    <div className="text-muted-foreground"><Users className="w-4 h-4" /></div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Participants</p>
                        <p className="text-lg font-semibold">{metrics?.totalParticipants?.toLocaleString?.() ?? '--'}</p>
                    </div>
                </div>
                <div className="p-4 linear-surface rounded-md flex items-center gap-3">
                    <div className="text-muted-foreground"><TrendingUp className="w-4 h-4" /></div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Average Score</p>
                        <p className="text-lg font-semibold">{metrics?.averageScore?.toFixed?.(2) ?? '--'}</p>
                    </div>
                </div>
                <div className="p-4 linear-surface rounded-md flex items-center gap-3">
                    <div className="text-primary"><Trophy className="w-4 h-4" /></div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Highest Score</p>
                        <p className="text-lg font-semibold text-primary">{metrics?.highestScore?.toFixed?.(2) ?? '--'}</p>
                    </div>
                </div>
            </div>

            <div className="linear-surface rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-secondary/50 border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
                                <th className="px-4 py-2 font-medium w-16 text-center">Rnk</th>
                                <th className="px-4 py-2 font-medium">User ID</th>
                                <th className="px-4 py-2 font-medium text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-mono text-[13px]">
                            {leaderboard.map((user) => (
                                <tr
                                    key={user.id}
                                    className={`transition-colors hover:bg-secondary/50 ${user.rank <= 3 ? 'bg-primary/5 text-primary' : 'text-foreground'}`}
                                >
                                    <td className="px-4 py-2 text-center">{String(user.rank).padStart(2, '0')}</td>
                                    <td className="px-4 py-2">
                                        <span className={user.rank <= 3 ? 'font-semibold' : ''}>usr_{user.id.slice(-6)}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`font-semibold ${user.rank <= 3 ? '' : 'text-foreground/80'}`}>{Number(user.score).toFixed(1)}</span>
                                    </td>
                                </tr>
                            ))}
                            {leaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                        No completed attempts yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
