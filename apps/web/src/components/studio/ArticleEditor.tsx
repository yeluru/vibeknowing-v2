"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Save, FileText, Check, FilePenLine, Download, Eye, Edit3, Sparkles, AlertCircle } from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from "@/lib/utils";

interface ArticleEditorProps {
    sourceId: string;
    title?: string;
}

export function ArticleEditor({ sourceId, title = "Article Editor" }: ArticleEditorProps) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'edit' | 'preview'>('preview');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load existing article on mount
    useEffect(() => {
        const loadExistingArticle = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/article/${sourceId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                        setContent(data.content);
                    }
                }
            } catch (error) {
                console.error("Failed to load existing article:", error);
            }
        };
        loadExistingArticle();
    }, [sourceId]);

    const generateArticle = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/ai/article/${sourceId}?style=blog`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error ${response.status}`);
            }

            const data = await response.json();
            if (!data.content) throw new Error("AI returned an empty article. Try again.");
            setContent(data.content);
            setMode('preview');
        } catch (err: any) {
            console.error("Failed to generate article:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/ai/article/${sourceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!response.ok) throw new Error('Failed to save article');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to save article:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const { marked } = await import('marked');

            marked.setOptions({ breaks: true, gfm: true });
            const htmlContent = marked(content);

            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 40px; font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px;">
                    <style>
                        h1 { font-size: 32px; font-weight: 800; margin-bottom: 24px; color: #000; }
                        p { margin-bottom: 16px; font-size: 16px; color: #333; }
                        li { margin-bottom: 8px; }
                    </style>
                    ${htmlContent}
                </div>
            `;

            const opt = {
                margin: 0.5,
                filename: `article-${sourceId.slice(0, 8)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error("Failed to export PDF:", error);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[700px] animate-in fade-in duration-500">
            {/* LEFT: Controls */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                <div className="bg-white/80 dark:bg-[var(--surface-input)/60] backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-[var(--surface-border)] p-6 shadow-sm sticky top-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Editor Lab</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mode: {mode.toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Mode Toggle */}
                        <div className="flex p-1 bg-slate-100 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
                            <button
                                onClick={() => setMode('preview')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'preview' ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                <Eye className="h-3.5 w-3.5" /> Preview
                            </button>
                            <button
                                onClick={() => setMode('edit')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'edit' ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <p className="text-xs leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Surgical Tools</label>
                            
                            <button
                                onClick={handleSave}
                                disabled={saving || !content}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 font-bold text-sm transition-all shadow-sm"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Save className="h-4 w-4" />)}
                                {saving ? "Saving..." : (copied ? "Changes Saved" : "Save Content")}
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={!content}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 font-bold text-sm transition-all shadow-sm"
                            >
                                <Download className="h-4 w-4" /> Export PDF
                            </button>

                            <button
                                onClick={() => {
                                    if (content) {
                                        if (confirm("Regenerate article? Your current edits will be lost.")) {
                                            generateArticle();
                                        }
                                    } else {
                                        generateArticle();
                                    }
                                }}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                {loading ? "Drafting..." : (content ? "Regenerate" : "Draft Article")}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Neural Draft</span>
                    </div>
                    <p className="text-[10px] text-purple-500/80 leading-relaxed font-medium">
                        Transformation logic: Content is synthesized into a high-density technical masterclass format.
                    </p>
                </div>
            </div>

            {/* RIGHT: Canvas */}
            <div className="flex-1 min-w-0">
                <div className="bg-white/50 dark:bg-black/20 rounded-[2rem] border border-slate-200/60 dark:border-white/5 min-h-full transition-all duration-500 relative flex flex-col">
                    {content ? (
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-700">
                             {mode === 'edit' ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full flex-1 p-8 lg:p-12 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed focus:outline-none resize-none"
                                    placeholder="Start drafting..."
                                />
                             ) : (
                                <div className="p-8 lg:p-16 max-w-3xl mx-auto w-full prose prose-slate dark:prose-invert">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            h1: ({ ...props }) => <h1 className="!text-4xl !font-black !tracking-tighter !mb-8 !text-slate-900 dark:!text-white" {...props} />,
                                            h2: ({ ...props }) => <h2 className="!text-2xl !font-bold !mt-12 !mb-6 !text-slate-900 dark:!text-white border-b border-slate-100 dark:border-white/5 pb-2" {...props} />,
                                            h3: ({ ...props }) => <h3 className="!text-xl !font-bold !mt-8 !mb-4 !text-slate-900 dark:!text-white" {...props} />,
                                            p: ({ ...props }) => <p className="!mb-6 !text-lg !leading-relaxed !text-slate-600 dark:!text-slate-400" {...props} />,
                                            ul: ({ ...props }) => <ul className="!mb-6 !space-y-2 !text-slate-600 dark:!text-slate-400" {...props} />,
                                            li: ({ ...props }) => <li className="!text-lg" {...props} />,
                                            code: ({ node, inline, className, children, ...props }: any) => !inline
                                                ? <div className="my-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[var(--background-elevated)]"><code className={cn("!block !p-6 !text-sm !font-mono !leading-loose whitespace-pre", className)} {...props}>{children}</code></div>
                                                : <code className="!px-1.5 !py-0.5 !bg-indigo-50 dark:!bg-indigo-900/30 !text-indigo-600 dark:!text-indigo-400 !rounded !text-sm !font-mono" {...props}>{children}</code>,
                                            blockquote: ({ ...props }) => <blockquote className="!border-l-4 !border-indigo-500 !pl-6 !py-2 !my-10 !italic !text-slate-500 dark:!text-slate-400 !bg-indigo-50/30 dark:!bg-indigo-500/5 !rounded-r-xl" {...props} />,
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                </div>
                             )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                            <div className="h-20 w-20 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/5 group">
                                <FilePenLine className="h-10 w-10 text-indigo-500/40 group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Draft an AI Masterclass</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                                    Transform your learning source into a structured, high-fidelity article. Click "Draft Article" to begin.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
