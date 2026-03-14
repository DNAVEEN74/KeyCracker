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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-border">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-prussian-blue flex items-center gap-3">
                        <Trophy className="text-primary w-6 h-6" />
                        Live Leaderboard
                    </h1>
                    <p className="mt-1 text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">{slug}</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4">
                    <Link
                        href={`/exams/${slug}/analysis`}
                        className="text-[11px] font-bold uppercase tracking-widest text-prussian-blue hover:text-primary transition-colors border border-border bg-white shadow-sm px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        My Analysis
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success/[0.05] border border-success/10 text-success rounded-full text-[10px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                        Live Connect
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 razorpay-card bg-white flex items-center gap-4">
                    <div className="p-3 bg-secondary/50 rounded-xl text-muted-foreground"><Users className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Participants</p>
                        <p className="text-xl font-extrabold text-prussian-blue">{metrics?.totalParticipants?.toLocaleString?.() ?? '--'}</p>
                    </div>
                </div>
                <div className="p-6 razorpay-card bg-white flex items-center gap-4 border-l-4 border-l-dodger-blue">
                    <div className="p-3 bg-primary/[0.05] rounded-xl text-primary"><TrendingUp className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Average Score</p>
                        <p className="text-xl font-extrabold text-prussian-blue">{metrics?.averageScore?.toFixed?.(2) ?? '--'}</p>
                    </div>
                </div>
                <div className="p-6 razorpay-card bg-white flex items-center gap-4 border-l-4 border-l-primary">
                    <div className="p-3 bg-primary/[0.05] rounded-xl text-primary"><Trophy className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Highest Score</p>
                        <p className="text-xl font-extrabold text-primary">{metrics?.highestScore?.toFixed?.(2) ?? '--'}</p>
                    </div>
                </div>
            </div>

            <div className="razorpay-card bg-white overflow-hidden border-none shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-[#fbfcff] border-b border-border/60 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                <th className="px-6 py-4 w-20 text-center">Rank</th>
                                <th className="px-6 py-4">Participant ID</th>
                                <th className="px-6 py-4 text-right">Raw Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-mono text-sm">
                            {leaderboard.map((user) => (
                                <tr
                                    key={user.id}
                                    className={`transition-all hover:bg-secondary/[0.3] ${user.rank <= 3 ? 'bg-primary/[0.02] text-primary' : 'text-secondary-foreground'}`}
                                >
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${user.rank <= 3 ? 'bg-primary text-primary-foreground font-bold border-2 border-primary/20' : 'font-semibold text-muted-foreground'}`}>
                                            {user.rank}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`tracking-tight ${user.rank <= 3 ? 'font-extrabold' : 'font-medium'}`}>usr_{user.id.slice(-6).toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-base font-extrabold ${user.rank <= 3 ? '' : 'text-prussian-blue'}`}>{Number(user.score).toFixed(1)}</span>
                                    </td>
                                </tr>
                            ))}
                            {leaderboard.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-medium">
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
