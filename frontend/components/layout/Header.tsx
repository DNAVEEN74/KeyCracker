'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full z-50 bg-[#151515]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-xl font-extrabold hov-scale flex items-center gap-1.5 group">
                            <span className="text-rzp-blue">Key</span>
                            <span className="text-white group-hover:text-rzp-blue transition-colors">Cracker</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-10">
                        <Link href="/exams" className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all">
                            Exams
                        </Link>
                        <Link href="/boards/ssc" className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all">
                            SSC
                        </Link>
                        <Link href="/boards/rrb" className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all">
                            RRB
                        </Link>

                        <div className="ml-6 pl-6 border-l border-white/10 flex items-center">
                            <button className="flex items-center justify-between w-64 px-4 py-2.5 text-[11px] text-white/40 bg-white/[0.02] hover:bg-white/[0.04] cursor-text border border-white/5 rounded-xl transition-all group">
                                <span className="font-bold uppercase tracking-widest">Neural Search...</span>
                                <kbd className="hidden sm:inline-block font-sans px-2 py-0.5 text-[9px] font-bold bg-white/5 border border-white/10 rounded text-white/30 uppercase">⌘K</kbd>
                            </button>
                        </div>
                    </nav>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-xl text-white hover:bg-white/5 focus:outline-none transition-colors"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-[#151515] border-b border-white/5 shadow-2xl">
                    <div className="px-4 pt-4 pb-8 space-y-2">
                        <Link href="/exams" className="block px-6 py-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all">
                            Exams
                        </Link>
                        <Link href="/boards/ssc" className="block px-6 py-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all">
                            SSC
                        </Link>
                        <Link href="/boards/rrb" className="block px-6 py-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all">
                            RRB
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
