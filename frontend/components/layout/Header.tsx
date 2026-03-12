'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-xl font-semibold tracking-tight hov-scale flex items-center gap-2">
                            <span className="text-primary">Key</span>Cracker
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link href="/exams" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Exams
                        </Link>
                        <Link href="/boards/ssc" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                            SSC
                        </Link>
                        <Link href="/boards/rrb" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                            RRB
                        </Link>

                        <div className="ml-4 pl-4 border-l border-border flex items-center">
                            <button className="flex items-center justify-between w-48 px-3 py-1.5 text-[13px] text-muted-foreground bg-secondary/50 hover:bg-secondary cursor-text border border-border rounded-md transition-colors">
                                <span>Search exams...</span>
                                <kbd className="hidden sm:inline-block font-sans px-1.5 py-0.5 text-[11px] font-medium bg-background border border-border rounded text-muted-foreground">⌘K</kbd>
                            </button>
                        </div>
                    </nav>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-foreground/80 hover:text-foreground focus:outline-none"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-card border-b border-border">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/exams" className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                            Exams
                        </Link>
                        <Link href="/boards/ssc" className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                            SSC
                        </Link>
                        <Link href="/boards/rrb" className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                            RRB
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
