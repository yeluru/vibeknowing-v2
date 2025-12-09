"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Save, FileText, Check, FilePenLine, Download } from "lucide-react";
import { API_BASE } from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleEditorProps {
    sourceId: string;
    title?: string;
}

export function ArticleEditor({ sourceId, title = "Article Editor" }: ArticleEditorProps) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'edit' | 'preview'>('preview'); // Default to preview
    const [saving, setSaving] = useState(false);

    // Load existing article on mount
    useEffect(() => {
        const loadExistingArticle = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/article/${sourceId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                        setContent(data.content);
                    } else {
                        setContent("");
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
        try {
            const response = await fetch(`${API_BASE}/ai/article/${sourceId}?style=blog`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to generate article');

            const data = await response.json();

            // API returns { title, content, excerpt, readTime }
            setContent(data.content);
            setMode('preview'); // Switch to preview after generation
        } catch (error) {
            console.error("Failed to generate article:", error);
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

            // Configure marked for better rendering
            marked.setOptions({
                breaks: true,
                gfm: true
            });

            // Convert markdown to HTML
            const htmlContent = marked(content);

            // Create styled container
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="
                    padding: 40px;
                    font-family: Georgia, 'Times New Roman', serif;
                    line-height: 1.8;
                    color: #1a1a1a;
                    max-width: 800px;
                ">
                    <style>
                        h1 { font-size: 32px; margin-top: 24px; margin-bottom: 16px; font-weight: bold; color: #111; }
                        h2 { font-size: 26px; margin-top: 22px; margin-bottom: 14px; font-weight: bold; color: #222; }
                        h3 { font-size: 22px; margin-top: 18px; margin-bottom: 12px; font-weight: bold; color: #333; }
                        h4 { font-size: 18px; margin-top: 16px; margin-bottom: 10px; font-weight: bold; color: #444; }
                        p { margin-bottom: 16px; font-size: 16px; }
                        strong { font-weight: bold; }
                        em { font-style: italic; }
                        ul, ol { margin-left: 20px; margin-bottom: 16px; }
                        li { margin-bottom: 8px; }
                        code { 
                            background-color: #f5f5f5; 
                            padding: 2px 6px; 
                            border-radius: 3px; 
                            font-family: 'Courier New', monospace;
                            font-size: 14px;
                        }
                        pre { 
                            background-color: #f5f5f5; 
                            padding: 16px; 
                            border-radius: 6px; 
                            overflow-x: auto;
                            margin-bottom: 16px;
                        }
                        blockquote {
                            border-left: 4px solid #ddd;
                            margin-left: 0;
                            padding-left: 16px;
                            color: #666;
                            font-style: italic;
                        }
                    </style>
                    ${htmlContent}
                </div>
            `;

            const opt = {
                margin: [0.75, 0.75, 0.75, 0.75] as [number, number, number, number],
                filename: 'article.pdf',
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'in' as const,
                    format: 'letter' as const,
                    orientation: 'portrait' as const,
                    compress: true
                }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error("Failed to export PDF:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm min-h-[500px] transition-colors duration-300">
                <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-24">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
                            <p className="text-gray-900 dark:text-white">Writing article...</p>
                        </div>
                    ) : content ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMode('edit')}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'edit' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                                            }`}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setMode('preview')}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'preview' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                                            }`}
                                    >
                                        Preview
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </button>
                                </div>
                            </div>

                            {mode === 'edit' ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-[500px] p-4 font-mono text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                            ) : (
                                <div className="prose prose-purple dark:prose-invert max-w-none h-[500px] overflow-y-auto p-6 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                            <FilePenLine className="h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Draft an Article</h3>
                            <p className="text-gray-900 dark:text-white mb-6 max-w-sm">
                                Transform this content into a well-structured blog post or article.
                            </p>
                            <button
                                onClick={generateArticle}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-300"
                            >
                                Generate Article
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
