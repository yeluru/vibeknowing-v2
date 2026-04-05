"use client";

import { useState, useEffect } from "react";
import { Loader2, Route, ArrowRight, Sparkles, Search, Trash2, Youtube, Globe, ChevronLeft, Map as MapIcon, PlayCircle, BookOpen, Clock, Activity, Target } from "lucide-react";
import { projectsApi, Project, API_BASE, buildAIHeaders } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function LearningPathDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [path, setPath] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadPathDetails();
    }, [params.id, isAuthenticated]);

    const loadPathDetails = async () => {
        try {
            // Need a single project detail API — assuming it exists or can be fetched from the list
            const allPaths = await projectsApi.list();
            const found = allPaths.find(p => p.id === params.id);
            if (found) {
                setPath(found);
            }
        } catch (e) {
            console.error("Failed to load path details", e);
        } finally {
            setLoading(false);
        }
    };

    const deleteResource = async (sourceId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await fetch(`${API_BASE}/sources/${sourceId}`, {
                method: "DELETE",
                headers: buildAIHeaders()
            });
            if (response.ok) {
                setPath(prev => prev ? {
                    ...prev,
                    sources: prev.sources?.filter(s => s.id !== sourceId),
                    source_count: prev.source_count - 1
                } : null);
                window.dispatchEvent(new Event("refresh-sidebar"));
                toast.success("Resource removed from path");
            }
        } catch {
            toast.error("Failed to remove resource");
        }
    };

    const filteredSources = path?.sources?.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Technical Asset Map...</p>
            </div>
        );
    }

    if (!path) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <p className="text-sm text-slate-500 dark:text-slate-400">Path not found or empty.</p>
                <Link href="/paths" className="mt-4 text-indigo-500 text-sm font-bold flex items-center gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back to All Paths
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Navigation */}
            <div className="space-y-4">
                <button 
                    onClick={() => router.push('/paths')}
                    className="group flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em]"
                >
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Roadmap hub
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                                <Route className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {path.title}
                                    <span className="ml-4 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest align-middle">
                                        Roadmap Active
                                    </span>
                                </h1>
                                <div className="flex items-center gap-4 mt-1.5 overflow-x-auto no-scrollbar pb-1">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        <Activity className="h-3 w-3" /> {path.source_count} Assets
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        <Clock className="h-3 w-3" /> Initialized {new Date(path.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 uppercase tracking-widest whitespace-nowrap">
                                        <Target className="h-3 w-3" /> Mastery Score: 0%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                         <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                         <input 
                            type="text"
                            placeholder={`Search resources in ${path.title}...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/80 dark:bg-[#1a1e30]/40 border border-slate-200/70 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Mastery Cards Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                    {filteredSources?.map((source, i) => (
                        <motion.div
                            key={source.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            className="group relative h-full flex flex-col"
                        >
                            <Link 
                                href={`/source/${source.id}`}
                                className="h-full flex flex-col p-6 rounded-[2rem] bg-white/80 dark:bg-[#1a1e30]/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden ring-1 ring-transparent hover:ring-indigo-500/40"
                            >
                                {/* Resource Identity Bubble */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl -mr-6 -mt-6" />

                                <div className="relative space-y-4 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                            source.type === 'video' 
                                                ? "bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white"
                                                : "bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white"
                                        )}>
                                            {source.type === 'video' ? <Youtube className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            {source.type === 'video' ? 'Masterclass' : 'Deep-Dive'}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 flex-1">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2 transition-colors">
                                            {source.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter pt-2">
                                            <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" /> Full Analysis</span>
                                            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Workspace</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-indigo-500 group-hover:translate-x-1 transition-transform">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Master Frontier</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </Link>

                            <button 
                                onClick={(e) => deleteResource(source.id, e)}
                                className="absolute top-4 right-4 z-20 h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center border border-red-100 dark:border-red-900/10 shadow-lg"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {path.source_count === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200/60 dark:border-white/5 rounded-[2.5rem] text-center">
                    <Sparkles className="h-10 w-10 text-indigo-400 mb-3" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Path empty.</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Discover more with Vibe-Vanguard</p>
                </div>
            )}
        </div>
    );
}
