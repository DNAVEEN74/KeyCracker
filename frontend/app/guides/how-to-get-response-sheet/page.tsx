'use client';

import React from 'react';
import { 
    ChevronLeft, 
    Monitor, 
    KeyRound, 
    FileDown, 
    Zap, 
    ExternalLink, 
    Info 
} from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-rzp-blue selection:text-white pb-32">
            {/* Minimal Progress Bar (Top) */}
            <div className="fixed top-0 left-0 w-full h-[1px] bg-white/5 z-50">
                <div className="h-full bg-rzp-blue w-1/3 shadow-[0_0_10px_rgba(51,147,244,0.5)]" />
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-16 md:pt-24">
                {/* Document Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-0.5 w-8 bg-rzp-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Instructional Manual // RRB-NTPC</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                            RRB NTPC: Answer Key Guide
                        </h1>
                        <p className="font-mono text-[10px] text-rzp-blue font-bold tracking-[0.2em] uppercase text-left">
                            LAST UPDATED: MARCH 2026 // VERSION 2.1
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:border-rzp-blue/50 hover:bg-rzp-blue/5 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-4 h-4 text-rzp-blue group-hover:-translate-x-1 transition-transform" />
                        Go Back
                    </Link>
                </div>

                {/* Introduction Summary */}
                <div className="mb-20 p-8 bg-white/[0.02] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rzp-blue/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    <p className="text-lg md:text-xl text-secondary-foreground/90 leading-relaxed font-medium relative z-10">
                        To calculate your raw marks and rank on <span className="text-white font-bold">KeyCracker</span>, you need the official Response Sheet URL. This guide outlines the exact 3-step retrieval protocol.
                    </p>
                </div>

                {/* Steps Container with Vertical Line */}
                <div className="relative space-y-20 pl-8 md:pl-12">
                    {/* The Vertical Line */}
                    <div className="absolute left-3 md:left-4 top-4 bottom-4 w-[1px] bg-white/10" />

                    {/* Step 1: Login */}
                    <div className="relative">
                        {/* Step Marker */}
                        <div className="absolute -left-11 md:left-[-3rem] top-0 w-6 h-6 md:w-8 md:h-8 bg-[#0a0a0a] border border-white/20 flex items-center justify-center z-10">
                            <span className="text-[10px] font-black text-rzp-blue">01</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Monitor className="w-5 h-5 text-rzp-blue" />
                                    Access Official RRB Portal
                                </h2>
                                <p className="text-sm text-secondary-foreground/60 leading-relaxed font-bold uppercase tracking-wide opacity-60">
                                    Navigate to the official Railway Recruitment Board login terminal.
                                </p>
                            </div>

                            <div className="p-6 bg-[#111] border border-white/5 group hover:border-rzp-blue transition-all max-w-sm">
                                <p className="text-[10px] font-black text-rzp-blue mb-2 tracking-widest uppercase">Direct Terminal Link</p>
                                <p className="text-base font-bold text-white mb-4 uppercase tracking-tighter">RRB NTPC Portal</p>
                                <div className="flex items-center gap-2 text-[10px] font-black text-white/60">
                                    <ExternalLink className="w-3 h-3" /> CLICK TO VISIT WEBSITE
                                </div>
                            </div>

                            <div className="p-4 bg-rzp-blue/5 border border-rzp-blue/20 flex gap-4 items-start max-w-2xl">
                                <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-rzp-blue/10">
                                    <Info className="w-4 h-4 text-rzp-blue" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-rzp-blue uppercase tracking-widest">Important Note</p>
                                    <p className="text-[11px] text-white/50 leading-relaxed uppercase tracking-wide font-bold">
                                        Ensure you are using the official URL (rrbapply.gov.in) to avoid phishing risks.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Login Details */}
                    <div className="relative">
                        {/* Step Marker */}
                        <div className="absolute -left-11 md:left-[-3rem] top-0 w-6 h-6 md:w-8 md:h-8 bg-[#0a0a0a] border border-white/20 flex items-center justify-center z-10">
                            <span className="text-[10px] font-black text-white/40">02</span>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <KeyRound className="w-5 h-5 text-white/60" />
                                    Authenticate Credentials
                                </h2>
                                <p className="text-sm text-secondary-foreground/60 leading-relaxed font-bold uppercase tracking-wide opacity-60">
                                    Input your application identifiers to sync with the result sub-system.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'REGISTRATION NUMBER', desc: 'From your application receipt' },
                                    { label: 'DATE OF BIRTH', desc: 'In DD/MM/YYYY format' }
                                ].map((item, i) => (
                                    <div key={i} className="p-5 border border-white/5 bg-white/[0.02]">
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                                        <p className="text-xs font-bold text-white uppercase">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Capture Link */}
                    <div className="relative">
                        {/* Step Marker */}
                        <div className="absolute -left-11 md:left-[-3rem] top-0 w-6 h-6 md:w-8 md:h-8 bg-rzp-blue border border-rzp-blue flex items-center justify-center z-10 shadow-[0_0_15px_rgba(51,147,244,0.3)]">
                            <span className="text-[10px] font-black text-white">03</span>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-rzp-blue" />
                                    Extract Response URL
                                </h2>
                                <p className="text-sm text-secondary-foreground/60 leading-relaxed font-bold uppercase tracking-wide opacity-60">
                                    The final step to trigger the KeyCracker analysis engine.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="p-8 border-l-2 border-rzp-blue bg-white/[0.02] space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40">A</div>
                                            <p className="text-sm font-bold text-white uppercase tracking-wide">Enter Candidate Dashboard</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40">B</div>
                                            <p className="text-sm font-bold text-white uppercase tracking-wide">Select "Candidate Response" Tab</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40">C</div>
                                            <p className="text-sm font-bold text-white uppercase tracking-wide">Click "Generate Response Sheet" link</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-rzp-blue text-white space-y-3">
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Final Action</p>
                                    <p className="text-lg font-bold leading-tight uppercase tracking-tighter">
                                        COPY THE COMPLETE ADDRESS FROM YOUR BROWSER'S TOP BAR.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support FAQ - Document Style */}
                <div className="mt-32 pt-16 border-t border-white/5">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-10 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-rzp-blue" />
                        Common Troubleshooting
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { 
                                q: "Website keeps crashing/not loading?", 
                                a: "This is common due to high server traffic. Retry during off-peak hours (12 AM - 6 AM)." 
                            },
                            { 
                                q: "Login failure (Invalid Credentials)?", 
                                a: "Check your DOB format. Boards often use DDMMYYYY without slashes or with specific separators." 
                            }
                        ].map((faq, i) => (
                            <div key={i} className="p-6 bg-white/[0.01] border border-white/5 space-y-3">
                                <h4 className="text-sm font-black text-white uppercase tracking-wide">{faq.q}</h4>
                                <p className="text-xs text-secondary-foreground/60 leading-relaxed font-bold uppercase tracking-wider">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-20 text-center">
                    <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
                        DATA_SOURCE: OFFICIAL_RRB_PORTAL // KEYCRACKER_INTEL
                    </p>
                </div>
            </div>
        </main>
    );
}
