import Link from 'next/link';

// Fetch exams from the backend API
async function getExams() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/exams`, {
            cache: 'no-store' // Fetch fresh data for now so newly created exams show up immediately
        });

        if (!res.ok) {
            console.error('Failed to fetch exams response status:', res.status);
            return [];
        }

        const data = await res.json();
        return data.exams || [];
    } catch (error) {
        console.error('Failed to fetch exams:', error);
        return [];
    }
}

// Since we are fetching live data that can change dynamically from user uploads, we can use 0.
export const revalidate = 0;

type Exam = {
    slug: string;
    board: string;
    examDate: string;
    name: string;
};

export default async function ExamsPage() {
    const exams = await getExams();

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-14 border-b border-white/5 pb-10">
                <span className="text-rzp-blue font-bold uppercase tracking-widest text-xs mb-4 block">Dashboard</span>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">Select Exam</h1>
                <p className="mt-4 text-lg text-secondary-foreground font-semibold">Choose an environment to begin neural analysis.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam: Exam) => (
                    <Link
                        key={exam.slug}
                        href={`/exams/${exam.slug}`}
                        className="group flex flex-col justify-between p-10 razorpay-card transition-all hov-scale bg-card hover:border-rzp-blue/50"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-[10px] font-bold tracking-widest uppercase bg-rzp-blue/[0.08] text-rzp-blue px-3 py-1.5 rounded-lg border border-rzp-blue/10">
                                    {exam.board}
                                </span>
                                <span className="text-[10px] text-secondary-foreground font-bold uppercase tracking-widest">
                                    {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                                </span>
                            </div>
                            <h2 className="text-xl font-extrabold text-white group-hover:text-rzp-blue transition-colors leading-snug">
                                {exam.name}
                            </h2>
                        </div>
                    </Link>
                ))}

                {/* New Exam Card */}
                <Link
                    href="/exams/new"
                    className="group flex flex-col items-center justify-center p-10 razorpay-card border-dashed border-white/10 bg-white/[0.01] hover:border-rzp-blue hover:bg-rzp-blue/[0.02] transition-all cursor-pointer min-h-[180px]"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-rzp-blue/20 group-hover:text-rzp-blue transition-colors text-white/40">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        </div>
                        <div className="text-center">
                            <h2 className="text-base font-extrabold text-white group-hover:text-rzp-blue transition-colors uppercase tracking-widest">Start New Analysis</h2>
                            <p className="text-[10px] text-secondary-foreground mt-2 font-bold uppercase tracking-[0.2em]">Neural extraction mode</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
