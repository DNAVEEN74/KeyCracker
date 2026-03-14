import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-card border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="text-xl font-extrabold hov-scale group">
                            <span className="text-rzp-blue">Key</span>
                            <span className="text-white group-hover:text-rzp-blue transition-colors">Cracker</span>
                        </Link>
                        <p className="mt-6 text-base text-secondary-foreground max-w-sm leading-relaxed font-medium">
                            The agentic extraction pipeline for India&apos;s most competitive examinations. SOTA neural parsing for serious aspirants.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40">Neural Endpoints</h3>
                        <ul className="mt-8 space-y-4">
                            <li>
                                <Link href="/boards/ssc" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-rzp-blue" /> SSC CGL
                                </Link>
                            </li>
                            <li>
                                <Link href="/boards/rrb" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-rzp-blue" /> RRB NTPC
                                </Link>
                            </li>
                            <li>
                                <Link href="/boards/nta" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-rzp-blue" /> NTA UGC NET
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40">Protocol</h3>
                        <ul className="mt-8 space-y-4">
                            <li>
                                <Link href="/privacy" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all">
                                    Privacy Node
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all">
                                    Terms of Sync
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground hover:text-white transition-all">
                                    Direct Contact
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        &copy; {new Date().getFullYear()} KeyCracker AI. Built with Trust & Precision.
                    </p>
                    <div className="flex items-center gap-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
                            Engineering the Future
                        </p>
                        <div className="flex items-center gap-3 px-5 py-2 bg-white/[0.02] border border-white/5 rounded-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_10px_rgba(39,174,96,0.4)]" />
                            <span className="text-[10px] font-extrabold text-white/60 uppercase tracking-widest">Neural Sync: Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
