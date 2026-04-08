import { cn } from "@/lib/utils";
import { Twitter, Linkedin, Instagram, Heart, MessageCircle, Share, Send, MoreHorizontal, Globe, RefreshCw } from "lucide-react";

interface SocialMockupProps {
    platform: 'twitter' | 'linkedin' | 'instagram';
    content: string;
    hashtags?: string[];
    authorName?: string;
    authorHandle?: string;
    authorImage?: string;
}

export function SocialMockup({ 
    platform, 
    content, 
    hashtags = [], 
    authorName = "Vanguard Mind", 
    authorHandle = "vanguard_ai",
    authorImage 
}: SocialMockupProps) {
    const renderTwitter = () => (
        <div className="bg-white dark:bg-[var(--surface-overlay)] rounded-2xl border border-slate-200 dark:border-white/10 p-4 max-w-[500px] w-full shadow-sm font-sans text-[15px]">
            <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500 overflow-hidden flex-shrink-0">
                    {authorImage ? <img src={authorImage} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-white font-bold text-lg">V</div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{authorName}</span>
                        <span className="text-slate-500 dark:text-slate-400">@{authorHandle} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-normal mb-3">
                        {content}
                        <span className="text-indigo-500 dark:text-indigo-400 block mt-2">
                            {hashtags.join(' ')}
                        </span>
                    </p>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-1">
                        <div className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                            <MessageCircle className="h-4.5 w-4.5" />
                            <span className="text-xs">12</span>
                        </div>
                        <div className="flex items-center gap-2 hover:text-emerald-500 transition-colors">
                            <RefreshCw className="h-4.5 w-4.5" />
                            <span className="text-xs">48</span>
                        </div>
                        <div className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                            <Heart className="h-4.5 w-4.5" />
                            <span className="text-xs">256</span>
                        </div>
                        <div className="flex items-center gap-2 hover:text-indigo-500 transition-colors">
                            <Share className="h-4.5 w-4.5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLinkedin = () => (
        <div className="bg-white dark:bg-[var(--surface-input)] rounded-lg border border-slate-200 dark:border-white/10 max-w-[550px] w-full shadow-sm font-sans text-sm">
            <div className="p-3 flex items-start justify-between">
                <div className="flex gap-2">
                    <div className="h-12 w-12 rounded-none bg-indigo-500 overflow-hidden flex-shrink-0">
                        {authorImage ? <img src={authorImage} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-white font-bold text-xl">V</div>}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white leading-tight">{authorName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Neural Architect • 1st</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            <span>Now ·</span>
                            <Globe className="h-2.5 w-2.5" />
                        </div>
                    </div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-slate-400" />
            </div>
            <div className="px-3 pb-3">
                <p className="text-slate-900 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {content}
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold block mt-3">
                        {hashtags.join(' ')}
                    </span>
                </p>
            </div>
            <div className="px-3 py-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold">
                <button className="flex items-center gap-1.5 px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors flex-1 justify-center">
                    <Heart className="h-4.5 w-4.5" />
                    <span>Like</span>
                </button>
                <button className="flex items-center gap-1.5 px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors flex-1 justify-center">
                    <MessageCircle className="h-4.5 w-4.5" />
                    <span>Comment</span>
                </button>
                <button className="flex items-center gap-1.5 px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors flex-1 justify-center">
                    <Send className="h-4.5 w-4.5" />
                    <span>Send</span>
                </button>
            </div>
        </div>
    );

    if (platform === 'twitter') return renderTwitter();
    if (platform === 'linkedin') return renderLinkedin();
    
    // Fallback for Instagram
    return (
        <div className="bg-white dark:bg-[var(--surface-overlay)] rounded-xl border border-slate-200 dark:border-white/10 max-w-[400px] w-full shadow-sm font-sans">
             <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-0.5">
                    <div className="h-full w-full rounded-full bg-white dark:bg-[var(--surface-overlay)] p-0.5">
                        <div className="h-full w-full rounded-full bg-indigo-500 overflow-hidden">
                             {authorImage ? <img src={authorImage} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-white font-bold text-xs">V</div>}
                        </div>
                    </div>
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white leading-tight">{authorHandle}</span>
            </div>
            <div className="aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                <Instagram className="h-12 w-12" />
            </div>
            <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heart className="h-6 w-6" />
                        <MessageCircle className="h-6 w-6" />
                        <Send className="h-6 w-6" />
                    </div>
                </div>
                <p className="text-sm dark:text-slate-200">
                    <span className="font-bold mr-2">{authorHandle}</span>
                    {content}
                    <span className="text-sky-600 dark:text-sky-400 block mt-1">
                         {hashtags.join(' ')}
                    </span>
                </p>
            </div>
        </div>
    );
}
