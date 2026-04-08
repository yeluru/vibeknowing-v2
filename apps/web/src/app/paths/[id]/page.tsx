"use client";

import { useState, useEffect } from "react";
import { Loader2, Route, ArrowRight, Trash2, Youtube, Globe, ChevronLeft, Activity, Search } from "lucide-react";
import { projectsApi, Project, API_BASE, buildAIHeaders } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
            const allPaths = await projectsApi.list();
            const found = allPaths.find(p => p.id === params.id);
            if (found) {
                setPath(found);
            }
        } catch (e) {
            console.error("Failed to load details", e);
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
                    source_count: (prev.source_count || 1) - 1
                } : null);
                window.dispatchEvent(new Event("refresh-sidebar"));
                toast.success("Resource removed");
            }
        } catch {
            toast.error("Failed to remove");
        }
    };

    const filteredSources = path?.sources?.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--secondary)]" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Assets...</p>
            </div>
        );
    }

    if (!path) return <div className="p-20 text-center">Not found.</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20 px-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="space-y-8">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em]"
                >
                    <ChevronLeft className="h-3 w-3" /> Back
                </button>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                            <Route className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {path.title}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">
                                    {path.source_count} Assets
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                         <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                         <input 
                            type="text"
                            placeholder="Filter assets..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
            </div>

            {/* Assets Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSources?.map((source) => (
                    <motion.div key={source.id} layout className="group relative">
                        <Link 
                            href={`/source/${source.id}`}
                            className="h-48 flex flex-col justify-between p-6 rounded-[2rem] bg-white dark:bg-[var(--surface-input)]/40 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden"
                        >
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center",
                                    source.type === 'video' ? "bg-red-500/10 text-red-500" : "bg-sky-500/10 text-sky-500"
                                )}>
                                    {source.type === 'video' ? <Youtube className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight uppercase line-clamp-2">
                                    {source.title}
                                </h3>
                                <div className="mt-4 flex items-center justify-between text-[var(--secondary)]">
                                    <span className="text-[9px] font-black uppercase tracking-widest">Study Resource</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                        
                        <button 
                            onClick={(e) => deleteResource(source.id, e)}
                            className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all rounded-xl border border-red-500/20"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                ))}

                {path.source_count === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No assets here yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
