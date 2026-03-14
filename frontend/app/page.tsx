import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle, Zap } from 'lucide-react';

// Server-side: fetch exams from the database
async function getExams() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/exams`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.exams || [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const exams = await getExams();
  // If no exams yet, take user directly to upload.
  const startHref = exams.length === 0 ? '/exams/new' : '/exams';

  return (
    <div className="flex flex-col items-center justify-center bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-24 md:py-60 text-center px-4 overflow-hidden border-b border-white/5 bg-[#151515]">
        {/* Sprint '26 neural background layer */}
        <div className="absolute inset-0 neural-grid opacity-40 pointer-events-none z-0" />
        
        {/* Dynamic glow streaks */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(48,94,255,0.15)_0%,transparent_50%)] pointer-events-none animate-neural-pulse z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(48,94,255,0.12)_0%,transparent_50%)] pointer-events-none animate-neural-pulse z-0" style={{ animationDelay: '-5s' }} />
        
        {/* Floating background elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-rzp-blue/20 rounded-full blur-[120px] animate-float opacity-40 z-0" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-rzp-green/10 rounded-full blur-[150px] animate-float opacity-30 z-0" style={{ animationDelay: '-3s' }} />

        <div className="max-w-5xl mx-auto space-y-12 relative z-10">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight leading-[1.0] text-white">
            Ultimate Indian Gov <br className="hidden md:block" /> Answer Key <span className="text-rzp-blue">Analytics</span>.
          </h1>
          <p className="text-lg md:text-xl text-secondary-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            The next generation of AI-powered analysis for India&apos;s toughest exams. 
            Instant solutions, real-time rankings, and superhuman precision.
          </p>
          <div className="pt-16 flex flex-col items-center gap-4">
            <Link href="#exams" className="flex flex-col items-center gap-4 animate-bounce opacity-40 group hover:opacity-100 transition-all">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60 group-hover:text-white transition-colors">Scroll Down</span>
              <ArrowRight className="w-4 h-4 text-rzp-blue rotate-90" />
            </Link>
          </div>
        </div>
      </section>

      {/* Available Exams Section (Integrated List) */}
      <section id="exams" className="w-full py-32 px-4 bg-background border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="text-rzp-blue font-bold uppercase tracking-widest text-[10px]">Neural Endpoints</span>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white">
                Select Your <br /> Examination
              </h2>
            </div>
            <p className="text-secondary-foreground max-w-sm font-semibold text-base">
              Choose an active exam environment to begin neural extraction and ranking analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
            {/* Featured: RRB NTPC Pure Logo Card */}
            <div className="group flex flex-col space-y-7 h-full">
              {/* Visual Container - Pure Logo, No Metadata, Square Edged */}
              <div className="relative aspect-[4/3] w-full bg-white overflow-hidden flex items-center justify-center border border-white/5 shrink-0">
                <Image 
                  src="/logos/RRB.png" 
                  alt="RRB Logo" 
                  width={280} 
                  height={280} 
                  className="object-contain transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Text Content Area */}
              <div className="flex-1 flex flex-col space-y-4 px-2">
                <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-rzp-blue transition-colors duration-300">
                  Railway Recruitment Board NTPC
                </h3>
                <p className="text-[15px] text-secondary-foreground leading-relaxed font-medium line-clamp-2">
                  Integrated neural analysis and rank prediction for RRB NTPC 2024-25. 
                  Get shift-wise normalized scores and SOTA solutions.
                </p>
                <div className="pt-2 mt-auto">
                   <Link 
                     href="/exams/rrb-ntpc"
                     className="inline-flex items-center h-8 bg-rzp-blue px-4 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110"
                   >
                      Start Analysis <ArrowRight className="ml-2 w-3 h-3" />
                   </Link>
                </div>
              </div>
            </div>

            {exams.filter((e: any) => e.slug !== 'rrb-ntpc').map((exam: any) => {
              const isSSC = exam.board?.toLowerCase() === 'ssc';
              return (
                <div key={exam.slug} className="group flex flex-col space-y-7 h-full">
                  {/* Visual Container - Pure Branding Focus */}
                  <div className={`relative aspect-[4/3] w-full ${isSSC ? 'bg-white' : 'bg-[#1c1c1c]'} border border-white/5 overflow-hidden flex items-center justify-center shrink-0`}>
                    {isSSC ? (
                      <Image 
                        src="/logos/SSC.png" 
                        alt="SSC Logo" 
                        width={280} 
                        height={280} 
                        className="object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 neural-grid opacity-5" />
                        <div className="relative z-10 text-white/20 font-black text-7xl uppercase tracking-[0.2em] transform -rotate-6 transition-all duration-500 group-hover:rotate-0 group-hover:text-white/40 group-hover:scale-110">
                          {exam.board}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text Content Area */}
                  <div className="flex-1 flex flex-col space-y-4 px-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-rzp-blue transition-colors duration-300">
                      {exam.name.replace('Examination', '')}
                    </h3>
                    <p className="text-[15px] text-secondary-foreground leading-relaxed font-medium line-clamp-2">
                      Access {exam.board} neural parsing endpoints. Real-time solutions and comprehensive eligibility verification.
                    </p>
                    <div className="pt-2 mt-auto">
                      <Link 
                        href={`/exams/${exam.slug}`}
                        className="inline-flex items-center h-8 bg-rzp-blue px-4 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110"
                      >
                        Start Analysis <ArrowRight className="ml-2 w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Redesigned Section: Exam Not Listed? Sprint '26 Coloring with Original Content */}
          <div className="mt-24 md:mt-32 px-4 md:px-0">
            <div className="relative bg-rzp-blue overflow-hidden group min-h-[360px] flex items-center">
              {/* Background Mockup Elements (Abstract) */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-10 right-10 w-64 h-96 bg-white rotate-12 transform translate-x-20" />
                <div className="absolute bottom-10 right-40 w-48 h-64 bg-white -rotate-12 transform" />
              </div>
              
              <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between w-full gap-12">
                <div className="space-y-6 max-w-2xl text-left">
                  <div className="inline-flex items-center gap-3">
                    <div className="w-2 h-2 bg-white animate-pulse" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-[0.3em]">Universal Parsing Active</span>
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-tight">
                    Exam not listed? <br />
                    <span className="text-white/40">Our neural agents are hungry.</span>
                  </h2>
                  
                  <p className="text-[17px] text-white/80 leading-relaxed font-medium max-w-xl">
                    Our scanning protocol is optimized for any Indian government exam sheet. 
                    Upload your response key and let our agents decode the rank and solutions in real-time.
                  </p>
                </div>

                <div className="shrink-0">
                  <Link 
                    href="/exams/new"
                    className="flex items-center gap-4 bg-white text-rzp-blue px-8 py-6 hover:scale-105 transition-transform shadow-2xl"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Initiate Protocol</span>
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>

              {/* Technical Detail Trim */}
              <div className="absolute bottom-4 left-8 text-[8px] font-mono text-white/20 uppercase tracking-[0.5em]">
                AGENTIC_BLUEPRINT // V3.OCR
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="agentic-stack" className="w-full py-32 px-4 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="text-rzp-blue font-bold uppercase tracking-widest text-xs">01 / A</span>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white">
                The Agentic <br /> Exam Pipeline
              </h2>
            </div>
            <p className="text-secondary-foreground max-w-md font-medium text-lg">
              AI-led document processing that extracts, solves, and ranks your performance without manual intervention.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Neural Parsing', desc: 'SOTA document analysis with near-zero latency extraction.', icon: Zap },
              { title: 'Omniscience AI', desc: 'Predictive step-by-step logic for complex mathematical reasoning.', icon: BookOpen },
              { title: 'Global Sync', desc: 'Real-time competitive metrics synced across the entire aspirant base.', icon: CheckCircle }
            ].map((f, i) => (
              <div key={i} className="flex flex-col text-left p-10 razorpay-card group bg-card border-white/5 hover:border-rzp-blue/50 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-10 group-hover:bg-rzp-blue/20 transition-all">
                  <f.icon className="w-7 h-7 text-white group-hover:text-rzp-blue transition-colors" />
                </div>
                <h3 className="text-2xl font-extrabold mb-4 text-white">{f.title}</h3>
                <p className="text-secondary-foreground leading-relaxed font-semibold text-base">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Exams Section */}
      <section className="w-full py-24 px-4 text-center bg-[#151515]">
        <h2 className="text-[10px] font-bold tracking-[0.5em] text-white/30 uppercase mb-16">SUPPORTED AGENTIC ENDPOINTS</h2>
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
          {['SSC CGL', 'RRB NTPC', 'NTA JEE', 'GATE', 'CAT', 'UPSC Prelims'].map((board) => (
            <div key={board} className="px-8 py-4 text-xs rounded-2xl border border-white/5 bg-white/[0.02] font-extrabold text-white/60 hover:text-rzp-yellow hover:border-rzp-yellow/30 hover:bg-rzp-yellow/[0.02] transition-all cursor-default uppercase tracking-widest">
              {board}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
