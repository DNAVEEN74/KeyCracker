'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Loader2, Link2 } from 'lucide-react';
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
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="mb-8 border-b border-border pb-4">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Upload Response Sheet</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Upload your official PDF for <span className="font-mono text-xs uppercase text-foreground">{slug}</span> to extract answers.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* File Upload Section */}
                <div className="flex-1 relative group">
                    <label
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center w-full h-48 rounded-md border border-dashed transition-colors cursor-pointer linear-surface ${error ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/50 hover:bg-secondary/20'
                            }`}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center space-y-3">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                <p className="text-sm font-medium text-foreground">Parsing PDF Content...</p>
                                <p className="text-xs text-muted-foreground">Extracting structured responses from Gemini AI</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-3">
                                <div className="p-2 bg-secondary rounded text-muted-foreground group-hover:text-primary transition-colors">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">Click or drag file here</p>
                                    <p className="text-xs text-muted-foreground mt-1">Official PDF up to 10MB</p>
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
                    <div className="h-full w-px bg-border/50"></div>
                    <span className="py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-background">OR</span>
                    <div className="h-full w-px bg-border/50"></div>
                </div>

                {/* URL Paste Section */}
                <div className="flex-1 flex flex-col justify-center linear-surface border border-border rounded-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Link2 className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-medium text-foreground">Paste Response Sheet URL</h3>
                    </div>
                    <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
                        <input
                            type="url"
                            placeholder="https://g26.digialm.com/..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isUploading}
                            className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-all font-mono"
                        />
                        <button
                            type="submit"
                            disabled={isUploading || !url}
                            className="w-full text-xs font-medium bg-primary text-primary-foreground py-2.5 rounded shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors hov-scale"
                        >
                            {isUploading ? 'Parsing Link...' : 'Fetch & Parse Link'}
                        </button>
                    </form>
                </div>
            </div>

            {error && (
                <p className="mt-4 text-sm text-destructive font-medium">{error}</p>
            )}

            <div className="mt-8 p-5 linear-surface rounded-md text-left">
                <div className="flex items-start gap-3">
                    <div className="text-muted-foreground mt-0.5">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Parser Instructions</h3>
                        <ul className="mt-2 text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                            <li>Upload the exact exported PDF from the official examination portal.</li>
                            <li>Do not crop or modify the file; the AI vision model relies on absolute coordinates.</li>
                            <li>Session tokens act anonymously. All cached files expire at midnight on Sunday.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
