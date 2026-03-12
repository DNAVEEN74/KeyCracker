import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle, Zap } from 'lucide-react';

// Server-side: check if any exams exist in the database
async function getExamCount(): Promise<number> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/exams`, {
      cache: 'no-store'
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return (data.exams || []).length;
  } catch {
    return 0;
  }
}

export default async function LandingPage() {
  const examCount = await getExamCount();
  // If no exams yet, take user directly to upload. Otherwise show the exam selection list.
  const startHref = examCount === 0 ? '/exams/new' : '/exams';

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center px-3 py-1 mb-4 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium uppercase tracking-widest">
            Gemini 3 Flash Powered
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Analyze Answer Keys <br className="hidden md:block" /> with Precision.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground w-full md:max-w-[80%] mx-auto leading-relaxed">
            Instant PDF parsing. Step-by-step AI solutions. Real-time dynamic ranking. Built for serious aspirants.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <Link
              href={startHref}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 w-full sm:w-auto hov-scale linear-button"
            >
              Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md border border-border transition-all w-full sm:w-auto hov-scale"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="w-full py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Built for speed and accuracy.
            </h2>
            <p className="text-sm text-muted-foreground">Everything you need to evaluate performance without the wait.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col text-left p-6 linear-surface transition-colors">
              <div className="text-foreground mb-4">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">Lightning Fast Parsing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Our AI automatically extracts and analyzes your responses in seconds.</p>
            </div>

            <div className="flex flex-col text-left p-6 linear-surface transition-colors">
              <div className="text-foreground mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">AI Solutions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Get detailed, step-by-step explanations for every question you got wrong.</p>
            </div>

            <div className="flex flex-col text-left p-6 linear-surface transition-colors">
              <div className="text-foreground mb-4">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">Live Ranks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">See where you stand against thousands of other aspirants dynamically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Exams Section */}
      <section className="w-full py-20 px-4 text-center border-t border-border">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-8">Supported Central Boards</h2>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {['SSC', 'RRB', 'NTA', 'GATE', 'CAT', 'UPSC'].map((board) => (
            <Link key={board} href={`/boards/${board.toLowerCase()}`} className="px-4 py-1.5 text-sm rounded border border-border bg-secondary/30 hover:bg-secondary transition-all font-medium text-foreground">
              {board}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
