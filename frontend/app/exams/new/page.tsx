'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Loader2, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// A fixed generic slug for "new" submissions — the backend AI will create a proper exam entry later.
const NEW_EXAM_SLUG = 'new-upload';
const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
};

export default function NewExamPage() {
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
            // 1. Create a session using the generic slug; backend will auto-create the Exam
            const sessionResponse = await fetch(`${API_URL}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId: NEW_EXAM_SLUG })
            });

            if (!sessionResponse.ok) throw new Error('Failed to create parsing session');

            const sessionData = await sessionResponse.json();
            const token = sessionData.sessionToken;
            const examSlug = sessionData.exam.slug;

            // 2. Submit URL for AI processing
            const parseResponse = await fetch(`${API_URL}/sessions/${token}/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!parseResponse.ok) {
                const errorData = await parseResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to trigger parsing pipeline');
            }

            router.push(`/exams/${examSlug}/analysis?session=${token}`);
        } catch (err: unknown) {
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
            // 1. Create a session using the generic slug; backend will auto-create the Exam
            const sessionResponse = await fetch(`${API_URL}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId: NEW_EXAM_SLUG })
            });

            if (!sessionResponse.ok) throw new Error('Failed to create parsing session');

            const sessionData = await sessionResponse.json();
            const token = sessionData.sessionToken;
            const examSlug = sessionData.exam.slug;

            // 2. Upload the file
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${API_URL}/sessions/${token}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to upload file');
            }

            router.push(`/exams/${examSlug}/analysis?session=${token}`);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to upload file. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="mb-8 border-b border-border pb-4">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Upload Response Sheet</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    You&apos;re the first to upload for this exam. <span className="text-foreground font-medium">AI will auto-detect all exam details</span> from your document.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* File Upload Section */}
                <div className="flex-1 relative group">
                    <label
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center w-full h-56 rounded-xl border border-dashed transition-all cursor-pointer razorpay-card bg-[#fcfdfe] ${error ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/40 hover:bg-primary/[0.01]'}`}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center space-y-4">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-prussian-blue">AI is analyzing...</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">Identifying exam and extracting schema</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-4">
                                <div className="p-3 bg-primary/[0.07] rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-extrabold text-prussian-blue">Click or drag file here</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Official PDF up to 10MB</p>
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
                </div>

                <div className="hidden md:flex flex-col items-center justify-center -mx-2">
                    <div className="h-full w-px bg-border"></div>
                    <span className="py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-white">OR</span>
                    <div className="h-full w-px bg-border"></div>
                </div>

                {/* URL Paste Section */}
                <div className="flex-1 flex flex-col justify-center razorpay-card p-8 bg-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/[0.07] rounded-lg">
                            <Link2 className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-base font-bold text-prussian-blue">Paste TCS iON URL</h3>
                    </div>
                    <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
                        <input
                            type="url"
                            placeholder="https://g26.digialm.com/..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isUploading}
                            className="w-full bg-[#f9fafb] border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/[0.08] focus:border-primary text-foreground placeholder:text-muted-foreground/30 transition-all font-mono"
                        />
                        <button
                            type="submit"
                            disabled={isUploading || !url}
                            className="w-full text-[11px] font-bold uppercase tracking-widest bg-primary text-primary-foreground py-3.5 rounded-lg shadow-lg shadow-primary/10 hover:bg-primary/95 disabled:opacity-50 transition-all razorpay-button"
                        >
                            {isUploading ? 'Parsing Link...' : 'Fetch & Parse Link'}
                        </button>
                    </form>
                </div>
            </div>

            {error && (
                <div className="mt-6 p-4 bg-destructive/[0.03] border border-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive font-bold text-center">{error}</p>
                </div>
            )}

            <div className="mt-12 p-8 razorpay-card bg-[#fbfcfd] border-primary/10">
                <div className="flex items-start gap-4">
                    <div className="text-primary mt-1 p-2 bg-primary/[0.07] rounded-lg">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-prussian-blue">How it works</h3>
                        <ul className="mt-4 text-sm text-secondary-foreground space-y-3 list-none">
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Upload PDF exported from portal (TCS iON / DigiAlm).</li>
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> AI auto-detects name, board, and marking scheme.</li>
                            <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Reusable schema is saved for instant future uploads.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
