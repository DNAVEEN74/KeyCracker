'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Loader2, Link2, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

export default function ExamUploadPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const router = useRouter();

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [url, setUrl] = useState('');

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            setError('Please enter a valid TCS iON response sheet URL.');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            console.log('Sending URL to Fastify API...', { slug, url });

            // 1. Create a session for this exam
            const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId: slug })
            });

            if (!sessionResponse.ok) {
                throw new Error('Failed to create parsing session');
            }

            const sessionData = await sessionResponse.json();
            const token = sessionData.sessionToken;

            // 2. Submit the URL for background parsing
            const parseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sessions/${token}/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!parseResponse.ok) {
                const errorData = await parseResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to trigger parsing pipeline');
            }

            // 3. Redirect to analysis page to poll for status
            router.push(`/exams/${slug}/analysis?session=${token}`);
        } catch (err: unknown) {
            console.error('Submission Error:', err);
            setError(getErrorMessage(err, 'Failed to process URL. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please upload a valid PDF file.');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            console.log('Sending to Fastify API...', { slug, file: file.name });

            // 1. Create a session for this exam
            const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId: slug })
            });

            if (!sessionResponse.ok) {
                throw new Error('Failed to create parsing session');
            }

            const sessionData = await sessionResponse.json();
            const token = sessionData.sessionToken;

            // 2. Upload the file (FormData)
            // Note: The backend route currently returns a mock upload URL for S3, but we 
            // will just call the endpoint to simulate the enqueue process for now.
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sessions/${token}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to upload file');
            }

            router.push(`/exams/${slug}/analysis?session=${token}`);
        } catch (err: unknown) {
            console.error('Upload Error:', err);
            setError(getErrorMessage(err, 'Failed to upload file. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-6xl mx-auto px-4 py-20">
                {/* Header Section */}
                <div className="mb-16 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-rzp-blue animate-pulse" />
                        <span className="text-rzp-blue text-[10px] font-bold uppercase tracking-[0.3em]">Protocol // Session Initiation</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                        Analyze <span className="text-white/30">{slug.replace('-', ' ')}</span>
                    </h1>
                    <p className="text-lg text-secondary-foreground font-medium max-w-2xl leading-relaxed">
                        Deploy neural parsing agents to extract and solve your official response key. 
                        Target: <span className="font-mono text-white px-2 py-0.5 bg-white/5 border border-white/10 uppercase text-sm tracking-widest">{slug}</span>
                    </p>
                </div>

                <div className="space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                        {/* File Upload Section */}
                        <div className="group flex flex-col bg-[#111] border border-white/5 overflow-hidden h-full">
                            <label
                                htmlFor="file-upload"
                                className={`relative flex-1 flex flex-col items-center justify-center p-12 transition-all cursor-pointer min-h-[400px] ${
                                    error ? 'border-destructive/20 bg-destructive/5' : 'hover:bg-white/[0.02]'
                                }`}
                            >
                                <div className="absolute inset-0 neural-grid opacity-5 group-hover:opacity-10 transition-opacity" />
                                
                                {isUploading ? (
                                    <div className="relative z-10 flex flex-col items-center space-y-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-rzp-blue/20 blur-xl animate-pulse" />
                                            <Loader2 className="w-12 h-12 text-rzp-blue animate-spin relative" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-white uppercase tracking-tighter">Parsing Payload...</p>
                                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-black">Neural extraction in progress</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 flex flex-col items-center space-y-8">
                                        <div className="w-20 h-20 bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-rzp-blue/50 transition-all duration-500">
                                            <UploadCloud className="w-8 h-8 text-white/40 group-hover:text-rzp-blue transition-colors" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-2xl font-black text-white uppercase tracking-tight">Drop PDF Source</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">Max Density: 10MB</p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={handleUpload}
                                    disabled={isUploading}
                                />
                            </label>
                            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between mt-auto">
                                <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.5em]">EXTRACT_PROTO // LOCAL_PDF</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white/10" />)}
                                </div>
                            </div>
                        </div>

                        {/* URL Paste Section */}
                        <div className="flex flex-col bg-[#111] border border-white/5 p-10 relative overflow-hidden group h-full justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Link2 className="w-12 h-12 text-white" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                                <span className="w-1 h-4 bg-rzp-blue" /> Remote Endpoint
                            </h3>
                            
                            <form onSubmit={handleUrlSubmit} className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Response Sheet URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://g26.digialm.com/..."
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        disabled={isUploading}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-none px-6 py-4 text-sm focus:outline-none focus:border-rzp-blue text-white placeholder:text-white/10 transition-all font-mono"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isUploading || !url}
                                    className="w-full bg-rzp-blue text-white px-8 py-5 text-xs font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>Connecting Agent <Loader2 className="w-4 h-4 animate-spin" /></>
                                    ) : (
                                        <>Start Remote Parsing <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Instructions Section (Full Width) */}
                    <div className="bg-[#111] border border-white/5 p-10">
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-8">Parser Protocol Requirements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: 'SOURCE', value: 'Upload direct output from the official examination portal.' },
                                { label: 'INTEGRITY', value: 'Original documents only. Do not crop or modify sheet metadata.' },
                                { label: 'SECURITY', value: 'All parsing occurs within temporary secure sandboxes for 100% safety.' }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <span className="text-[9px] font-black text-rzp-blue bg-rzp-blue/10 px-2 py-1 min-w-[70px] text-center shrink-0">{item.label}</span>
                                    <p className="text-xs text-secondary-foreground font-medium underline-offset-4 leading-relaxed">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-12 p-6 bg-destructive/10 border border-destructive/20 text-center">
                        <div className="flex items-center justify-center gap-3 text-destructive">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    </div>
                )}

                {/* Detailed User Guidance: Step-by-Step Protocol */}
                <div className="mt-32 space-y-24">
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">How to use KeyCracker</h2>
                        <p className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold">Follow these steps for a perfect analysis</p>
                    </div>

                    <div className="space-y-12">
                        {/* Step 1 */}
                        <div className="bg-[#111] border border-white/5 p-10 md:p-16 relative overflow-hidden group hover:border-rzp-blue/30 transition-all">
                            <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/[0.02] group-hover:text-rzp-blue/5 transition-colors">01</div>
                            <div className="relative z-10 space-y-8 max-w-3xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rzp-blue flex items-center justify-center text-white font-black text-xl">1</div>
                                    <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Get Your Official Answer Key</h3>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-lg text-secondary-foreground leading-relaxed">
                                        First, you need your official response sheet from the examiner's portal (like RRB or SSC). 
                                        Login to the official website and find the "CEN" or "Answer Key" link for your specific exam.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 border border-white/5">
                                            <p className="text-xs font-black text-rzp-blue uppercase mb-2">Option A: Copy Link</p>
                                            <p className="text-sm text-white/60">Copy the URL from your browser's address bar after opening the answer key.</p>
                                        </div>
                                        <div className="bg-white/5 p-4 border border-white/5">
                                            <p className="text-xs font-black text-rzp-blue uppercase mb-2">Option B: Download PDF</p>
                                            <p className="text-sm text-white/60">Save the response sheet as a PDF file on your computer or phone.</p>
                                        </div>
                                    </div>
                                    <Link 
                                        href="/guides/how-to-get-response-sheet" 
                                        className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white underline underline-offset-8 hover:text-rzp-blue transition-all"
                                    >
                                        Detailed Step-by-Step Guide <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-[#111] border border-white/5 p-10 md:p-16 relative overflow-hidden group hover:border-rzp-blue/30 transition-all border-l-4 border-l-rzp-blue">
                            <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/[0.02] group-hover:text-rzp-blue/5 transition-colors">02</div>
                            <div className="relative z-10 space-y-8 max-w-3xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white text-[#0a0a0a] flex items-center justify-center font-black text-xl">2</div>
                                    <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Start the Analysis</h3>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-lg text-secondary-foreground leading-relaxed">
                                        Now, simply paste that link or upload the PDF you just saved. 
                                        <span className="text-rzp-blue font-bold"> Note: </span> We highly recommend using the **URL Link method**—it's much faster and avoids any file errors.
                                    </p>
                                    <ul className="space-y-3">
                                        {[
                                            'Paste the URL into the "Remote Endpoint" box',
                                            'OR Drag & Drop your PDF file into the drop zone',
                                            'Click the Blue "Start Analysis" button'
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                                                <div className="w-1.5 h-1.5 bg-rzp-blue" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-[#111] border border-white/5 p-10 md:p-16 relative overflow-hidden group hover:border-rzp-blue/30 transition-all">
                            <div className="absolute top-0 right-0 p-8 text-8xl font-black text-white/[0.02] group-hover:text-rzp-blue/5 transition-colors">03</div>
                            <div className="relative z-10 space-y-8 max-w-3xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rzp-blue flex items-center justify-center text-white font-black text-xl">3</div>
                                    <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Get Results & Solutions</h3>
                                </div>
                                <div className="space-y-6">
                                    <p className="text-lg text-secondary-foreground leading-relaxed">
                                        Once you start, KeyCracker handles everything else. No manual counting needed!
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { title: 'Score', desc: 'Exact marks with negative marking' },
                                            { title: 'Rank', desc: 'Predict your rank among others' },
                                            { title: 'Solutions', desc: 'AI-explained steps for every Q' }
                                        ].map((item, i) => (
                                            <div key={i} className="border-t border-white/10 pt-4">
                                                <p className="text-xs font-black text-white uppercase tracking-widest mb-1">{item.title}</p>
                                                <p className="text-xs text-white/40">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-40 pt-20 border-t border-white/5">
                    <div className="mb-16">
                        <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.5em] mb-4">Frequently Asked Questions</h3>
                        <h2 className="text-3xl font-bold uppercase tracking-tight">Common Doubts Cleared</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            {
                                q: "Is my score 100% accurate?",
                                a: "Yes. We use the official marking rules (+1 for correct, -0.33 for incorrect) for the specific exam you selected. Your marks are calculated exactly as the board would do it."
                            },
                            {
                                q: "Is it safe to paste my answer link?",
                                a: "Absolutely. We only use the link to read your answer data. We never ask for your personal passwords, and your official links are not stored permanently on our servers."
                            },
                            {
                                q: "What if my exam isn't listed?",
                                a: "You can still use our tool! Just upload any official response sheet, and we will calculate your score and give you detailed solutions for every question automatically."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="space-y-6 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors border border-white/5">
                                <h4 className="text-lg font-bold text-white tracking-tight leading-tight">{faq.q}</h4>
                                <p className="text-sm text-secondary-foreground/80 leading-relaxed font-medium">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add necessary icons to the imports at top
