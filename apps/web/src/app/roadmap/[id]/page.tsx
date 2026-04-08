"use client";

import React, { useEffect, useState } from "react";
import { categoriesApi, projectsApi, Project } from "@/lib/api";
import { PathMasteryView } from "@/components/curriculum/PathMasteryView";
import { 
    Route, 
    Map as MapIcon, 
    ChevronRight, 
    RefreshCw, 
    Database,
    Zap,
    Sparkles,
    LayoutDashboard,
    Layers,
    MoreHorizontal,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function RoadmapPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise);
    const id = params.id;
    const [category, setCategory] = useState<any>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [mastery, setMastery] = useState(0);

    useEffect(() => {
        loadPathData();
    }, [id]);

    const loadPathData = async () => {
        try {
            const [catRes, categoryProjs] = await Promise.all([
                categoriesApi.get(id),
                projectsApi.list(id)
            ]);
            setCategory(catRes);
            setProjects(categoryProjs);
        } catch (err) {
            console.error("Failed to load Roadmap:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
                <div className="relative">
                    <RefreshCw className="h-12 w-12 animate-spin text-[var(--secondary)]/20" />
                    <Sparkles className="h-6 w-6 text-[var(--secondary)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Synchronizing Neural Path...</span>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="p-20 text-center space-y-6">
                <div className="h-24 w-24 bg-red-500/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-red-500/10 shadow-2xl">
                    <MapIcon className="h-10 w-10 text-red-500/40" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Path Not Found</h1>
                <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-95 transition-transform">
                    Return to Mission Hub
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[var(--background)] relative overflow-hidden">
            <div className="max-w-[1700px] mx-auto px-6 py-8 space-y-8 relative z-10">
                
                {/* Strategic Path Header - Platform Standard Integration */}
                <header className="flex-none bg-white/80 dark:bg-[var(--surface-input)]/70 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm relative z-10 px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2.5">
                                 <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                 <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em]">MASTERY PATH</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-[0.05em] leading-none uppercase">
                                {category.name}
                            </h1>
                        </div>
                        
                         <div className="flex items-center gap-0 divide-x divide-slate-100 dark:divide-white/5 bg-slate-50/50 dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/5">
                              <HeaderStat icon={<Database className="h-4 w-4" />} label="Assets" value={projects.length.toString()} />
                              <HeaderStat icon={<Clock className="h-4 w-4" />} label="Intensity" value={`${projects.length * 3}h`} />
                              <HeaderStat icon={<Zap className="h-4 w-4" />} label="Mastery" value={`${mastery}%`} color="text-emerald-500" />
                         </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                    <div className="lg:col-span-8 space-y-10">
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                            <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
                                <Route className="h-6 w-6 text-[var(--secondary)]" />
                            </div>
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">MASTERY PATH</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">SEQUENCED LEARNING NODE</p>
                            </div>
                        </div>
                        <PathMasteryView categoryId={id} categoryName={category.name} hasSources={projects.length > 0} onStatsUpdate={(stats: { mastery: number }) => setMastery(stats.mastery)} />
                    </div>

                    <div className="lg:col-span-4 group/feed">
                        <div className="sticky top-8 p-6 bg-white/80 dark:bg-[var(--surface-input)]/70 backdrop-blur-xl rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm relative overflow-hidden">
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                            <Layers className="h-4.5 w-4.5 text-[var(--secondary)]" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none uppercase">NEURAL FEED</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{projects.length} trackedAssets</p>
                                        </div>
                                    </div>
                                    <MoreHorizontal className="h-5 w-5 text-slate-300 pointer-events-none" />
                                </div>

                                <div className="space-y-2">
                                    {projects.map((project: any) => (
                                        <Link 
                                            key={project.id} 
                                            href={project.first_source_id ? `/source/${project.first_source_id}` : "#"}
                                            className="block p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all group/asset"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover/asset:text-[var(--secondary)] transition-all">
                                                    <Database className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <p className="text-[12px] font-extrabold text-slate-900 dark:text-white uppercase truncate group-hover/asset:text-indigo-600 transition-colors">
                                                        {project.title}
                                                    </p>
                                                    <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] px-2 py-0.5 bg-indigo-500/10 rounded-md">STRATEGIC ASSET</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-200 group-hover/asset:translate-x-1 transition-transform" />
                                            </div>
                                        </Link>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="text-center py-16 opacity-20 space-y-3">
                                            <Database className="h-10 w-10 mx-auto" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-center">Neural Void</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeaderStat({ icon, label, value, color = "text-slate-900 dark:text-white" }: { icon: any, label: string, value: string, color?: string }) {
    return (
        <div className="flex items-center gap-3 px-5 py-2 group/stat">
            <div className="h-8 w-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover/stat:text-[var(--secondary)] transition-colors">
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 opacity-80">{label}</span>
                <span className={cn("text-base font-black tracking-tighter leading-none", color)}>{value}</span>
            </div>
        </div>
    );
}
