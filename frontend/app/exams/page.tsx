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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-8">
            <div className="mb-8 border-b border-border pb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Select Exam</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose an exam to upload the answer key and view your rank.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map((exam: Exam) => (
                    <Link
                        key={exam.slug}
                        href={`/exams/${exam.slug}`}
                        className="group flex flex-col justify-between p-5 linear-surface rounded-md hover:border-primary/50 transition-colors hov-scale"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-mono font-medium tracking-wide bg-secondary text-foreground px-2 py-0.5 rounded border border-border">
                                    {exam.board}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                                </span>
                            </div>
                            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {exam.name}
                            </h2>
                        </div>
                    </Link>
                ))}

                {/* New Exam Card */}
                <Link
                    href="/exams/new"
                    className="group flex flex-col items-center justify-center p-5 linear-surface rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-secondary/20 transition-all cursor-pointer min-h-[120px]"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        </div>
                        <div className="text-center">
                            <h2 className="text-sm font-semibold text-foreground">Upload New Exam</h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Be the first to check an exam</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
