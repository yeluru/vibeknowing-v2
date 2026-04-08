"use client";

import { useState, useEffect } from "react";
import { Loader2, Share2, Copy, Check, Twitter, Linkedin, Instagram, RefreshCw } from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SocialMockup } from "./SocialMockup";

interface SocialMediaGeneratorProps {
    sourceId: string;
    title?: string;
}

export function SocialMediaGenerator({ sourceId, title = "Social Media Generator" }: SocialMediaGeneratorProps) {
    // Initialize platform from URL or localStorage
    const getInitialPlatform = (): 'twitter' | 'linkedin' | 'instagram' => {
        // Check URL first
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlPlatform = urlParams.get('platform');
            if (urlPlatform && ['twitter', 'linkedin', 'instagram'].includes(urlPlatform)) {
                return urlPlatform as 'twitter' | 'linkedin' | 'instagram';
            }

            const savedPlatform = localStorage.getItem(`source-${sourceId}-social-platform`);
            if (savedPlatform && ['twitter', 'linkedin', 'instagram'].includes(savedPlatform)) {
                return savedPlatform as 'twitter' | 'linkedin' | 'instagram';
            }
        }
        return 'twitter';
    };

    const [platform, setPlatform] = useState<'twitter' | 'linkedin' | 'instagram'>(getInitialPlatform());
    const [content, setContent] = useState("");
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Listen for platform change events from SourcePage
    useEffect(() => {
        const handlePlatformChange = (e: CustomEvent<'twitter' | 'linkedin' | 'instagram'>) => {
            setPlatform(e.detail);
            if (typeof window !== 'undefined') {
                localStorage.setItem(`source-${sourceId}-social-platform`, e.detail);
            }
        };

        window.addEventListener('social-platform-change', handlePlatformChange as EventListener);
        return () => {
            window.removeEventListener('social-platform-change', handlePlatformChange as EventListener);
        };
    }, [sourceId]);

    // Load existing content when platform changes
    useEffect(() => {
        const loadExistingContent = async () => {
            try {
                const response = await fetch(`${API_BASE}/ai/social-media/${sourceId}?platform=${platform}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.post) {
                        setContent(data.post);
                        setHashtags(data.hashtags || []);
                    } else {
                        setContent("");
                        setHashtags([]);
                    }
                }
            } catch (error) {
                console.error("Failed to load existing content:", error);
            }
        };
        loadExistingContent();
    }, [platform, sourceId]);

    const generateContent = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/ai/social-media/${sourceId}?platform=${platform}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAIHeaders() }
            });

            if (!response.ok) throw new Error('Failed to generate content');

            const data = await response.json();
            setContent(data.post);
            setHashtags(data.hashtags || []);
        } catch (error) {
            console.error("Failed to generate content:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        const fullPost = `${content}\n\n${hashtags.join(' ')}`;
        await navigator.clipboard.writeText(fullPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const platformTitles = {
        twitter: 'Twitter Thread',
        linkedin: 'LinkedIn Post',
        instagram: 'Instagram Caption'
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] animate-in fade-in duration-500">
            {/* LEFT: Controls */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                <div className="vk-card p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[var(--secondary-light)] flex items-center justify-center">
                            <Share2 className="h-4 w-4 text-[var(--secondary)]" />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">Platform</h3>
                    </div>

                    {/* Platform picker */}
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { id: 'twitter',   icon: <Twitter className="h-4 w-4" />,   label: 'Twitter'  },
                            { id: 'linkedin',  icon: <Linkedin className="h-4 w-4" />,  label: 'LinkedIn' },
                            { id: 'instagram', icon: <Instagram className="h-4 w-4" />, label: 'Instagram'},
                        ] as const).map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setPlatform(p.id);
                                    if (typeof window !== 'undefined')
                                        localStorage.setItem(`source-${sourceId}-social-platform`, p.id);
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all",
                                    platform === p.id
                                        ? "bg-[var(--secondary-light)] border-[var(--secondary)]/40 text-[var(--secondary)]"
                                        : "bg-[var(--card-hover)] border-[var(--surface-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                )}
                            >
                                {p.icon}
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Content textarea */}
                    <div>
                        <label className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-widest mb-2 block">Refine content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Social content will appear here..."
                            className="vk-input w-full h-44 py-3 resize-none leading-relaxed text-sm"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={generateContent}
                            disabled={loading}
                            className="vk-btn vk-btn-primary w-full justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {content ? "Regenerate" : "Generate Draft"}
                        </button>
                        {content && (
                            <button
                                onClick={copyToClipboard}
                                className="vk-btn vk-btn-secondary w-full justify-center gap-2"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied!" : "Copy post"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--secondary-light)] border border-[var(--secondary)]/10">
                    <p className="text-[10px] text-[var(--secondary)]/70 leading-relaxed font-medium uppercase tracking-tighter">
                        PRO TIP: Refine nuance manually. Preview on right updates instantly.
                    </p>
                </div>
            </div>

            {/* RIGHT: Canvas/Preview */}
            <div className="flex-1 min-w-0">
                <div className="bg-slate-50 dark:bg-black/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/5 min-h-[600px] p-8 flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-700">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 transition-all group-hover:bg-indigo-500/10" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 transition-all group-hover:bg-purple-500/10" />

                    {content ? (
                        <div className="relative z-10 w-full flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-700">
                           <div className="mb-8 flex items-center gap-3">
                               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
                               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Live Mockup Preview</span>
                               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
                           </div>
                           <SocialMockup 
                                platform={platform} 
                                content={content} 
                                hashtags={hashtags}
                                authorName="Neural Architect"
                           />
                        </div>
                    ) : (
                        <div className="relative z-10 text-center space-y-4">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-2xl shadow-indigo-500/5">
                                <Share2 className="h-10 w-10 text-indigo-500/30" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">The social canvas awaits</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Once generated, a high-fidelity preview of your {platformTitles[platform]} will manifest here for review.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
