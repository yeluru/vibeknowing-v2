import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SocialMediaGenerator } from "./SocialMediaGenerator";
import { DiagramViewer } from "./DiagramViewer";
import { ArticleEditor } from "./ArticleEditor";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { ReviewSession } from "@/components/flashcards/ReviewSession";
import { Sparkles, Palette, Share2, FileLineChart, FileText, Layout, Lightbulb } from "lucide-react";

interface StudioInterfaceProps {
    sourceId: string;
}

type StudioTool = 'social' | 'diagram' | 'article' | 'quiz' | 'flashcards';

export function StudioInterface({ sourceId }: StudioInterfaceProps) {
    const searchParams = useSearchParams();

    // Initialize from URL or localStorage
    const getInitialTool = (): StudioTool => {
        if (typeof window !== 'undefined') {
            const urlTool = new URLSearchParams(window.location.search).get('tool');
            if (urlTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(urlTool)) {
                return urlTool as StudioTool;
            }
            const savedTool = localStorage.getItem(`source-${sourceId}-studio-tool`);
            if (savedTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(savedTool)) {
                return savedTool as StudioTool;
            }
        }
        return 'social';
    };

    const [activeTool, setActiveTool] = useState<StudioTool>(getInitialTool());

    // Update active tool when URL changes
    useEffect(() => {
        const urlTool = searchParams.get('tool');
        if (urlTool && ['social', 'diagram', 'article', 'quiz', 'flashcards'].includes(urlTool)) {
            setActiveTool(urlTool as StudioTool);
        }
    }, [searchParams]);

    // Listen for custom event from SourcePage
    useEffect(() => {
        const handleToolChange = (e: CustomEvent<StudioTool>) => {
            setActiveTool(e.detail);
            if (typeof window !== 'undefined') {
                localStorage.setItem(`source-${sourceId}-studio-tool`, e.detail);
            }
        };

        window.addEventListener('studio-tool-change', handleToolChange as EventListener);
        return () => {
            window.removeEventListener('studio-tool-change', handleToolChange as EventListener);
        };
    }, [sourceId]);

    const toolMeta: Record<StudioTool, { label: string, icon: any, desc: string }> = {
        social: { label: 'Social Media', icon: <Share2 className="h-4 w-4" />, desc: 'Manifest your mastery on social feeds' },
        diagram: { label: 'Diagrams', icon: <FileLineChart className="h-4 w-4" />, desc: 'Visualize neural connections' },
        article: { label: 'Article Editor', icon: <FileText className="h-4 w-4" />, desc: 'Synthesize deep technical masterclasses' },
        quiz: { label: 'Quiz Lab', icon: <Lightbulb className="h-4 w-4" />, desc: 'Stress-test your knowledge retention' },
        flashcards: { label: 'Flashcards', icon: <Layout className="h-4 w-4" />, desc: 'Spaced repetition for long-term recall' }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-10">
            {/* Studio Branding Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 dark:border-[var(--surface-border)]/40 px-6 pt-4 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Palette className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Content Studio</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                        {toolMeta[activeTool].label}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {toolMeta[activeTool].desc}
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                     {Object.entries(toolMeta).map(([id, meta]) => (
                        <button
                            key={id}
                            onClick={() => {
                                setActiveTool(id as StudioTool);
                                window.history.replaceState(null, '', `?tab=studio&tool=${id}`);
                            }}
                            className={`p-2.5 rounded-xl transition-all ${
                                activeTool === id 
                                ? "bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-xl shadow-indigo-500/20" 
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            }`}
                            title={meta.label}
                        >
                            {meta.icon}
                        </button>
                     ))}
                </div>
            </div>

            {/* Active Tool Content */}
            <div className="relative px-6">
                {activeTool === 'social' && <SocialMediaGenerator sourceId={sourceId} />}
                {activeTool === 'diagram' && <DiagramViewer sourceId={sourceId} />}
                {activeTool === 'article' && <ArticleEditor sourceId={sourceId} />}
                {activeTool === 'quiz' && <QuizInterface sourceId={sourceId} />}
                {activeTool === 'flashcards' && <ReviewSession sourceId={sourceId} />}
            </div>
        </div>
    );
}
