import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-secondary/50 border-t border-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="text-xl font-semibold tracking-tight">
                            <span className="text-primary">Key</span>Cracker
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground max-w-sm">
                            AI-powered Indian Government Exam Answer Key Analyzer. Get instant scores, step-by-step solutions, and real-time rankings.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold tracking-wider uppercase text-foreground">Exams</h3>
                        <ul className="mt-4 space-y-2">
                            <li>
                                <Link href="/boards/ssc" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    SSC CGL
                                </Link>
                            </li>
                            <li>
                                <Link href="/boards/rrb" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    RRB NTPC
                                </Link>
                            </li>
                            <li>
                                <Link href="/boards/nta" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    NTA UGC NET
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold tracking-wider uppercase text-foreground">Legal</h3>
                        <ul className="mt-4 space-y-2">
                            <li>
                                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} KeyCracker. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground mt-4 md:mt-0">
                        Designed for Indian Exam Aspirants
                    </p>
                </div>
            </div>
        </footer>
    );
}
