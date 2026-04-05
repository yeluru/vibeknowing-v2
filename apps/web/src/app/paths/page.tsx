"use client";

import { useState, useEffect } from "react";
import { Loader2, Route, ArrowRight, Sparkles, Search, Trash2, Youtube, Globe, Map as MapIcon, Compass, Plus, X } from "lucide-react";
import { projectsApi, Project, API_BASE, buildAIHeaders } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function LearningPathsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [paths, setPaths] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Inline Creation State
    const [showCreateCard, setShowCreateCard] = useState(false);
    const [newPathTitle, setNewPathTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadPaths();
    }, [isAuthenticated]);

    const loadPaths = async () => {
        try {
            const data = await projectsApi.list();
            setPaths(data);
        } catch (e) {
            console.error("Failed to load paths", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePath = async () => {
        if (!newPathTitle.trim()) return;
        setIsCreating(true);
        try {
            const response = await fetch(`${API_BASE}/sources/projects/`, {
                method: 'POST',
                headers: {
                    ...buildAIHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newPathTitle })
            });
            if (response.ok) {
                setNewPathTitle("");
                setIsCreating(false);
                setShowCreateCard(false);
                loadPaths();
                window.dispatchEvent(new Event("refresh-sidebar"));
                toast.success("Learning Path created");
            } else {
                throw new Error("Failed");
            }
        } catch {
            toast.error("Failed to create path");
            setIsCreating(false);
        }
    };

    const filteredPaths = paths.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const executeDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await projectsApi.delete(id);
            setPaths(prev => prev.filter(p => p.id !== id));
            window.dispatchEvent(new Event("refresh-sidebar"));
            toast.success("Learning Path deleted");
        } catch {
            toast.error("Failed to delete path");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                            <Route className="h-6 w-6 text-white" />
                        </div>
                        Learning Paths
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
                        Your autonomous research roadmaps and technical frontiers.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                        <input 
                            type="text"
                            placeholder="Search your roadmap..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white/80 dark:bg-[#1a1e30]/50 backdrop-blur-xl border border-slate-200/70 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setShowCreateCard(true)}
                        className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Mastery Map...</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Inline Create Card */}
                    {(showCreateCard || paths.length === 0) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative p-6 rounded-[2rem] bg-indigo-600 shadow-2xl shadow-indigo-500/30 flex flex-col justify-between border-none"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-white">
                                    <Plus className="h-5 w-5" />
                                    <h3 className="text-sm font-black uppercase tracking-widest">New Mastery Path</h3>
                                </div>
                                <p className="text-[10px] text-indigo-100 font-medium leading-relaxed">
                                    Name your next technical frontier to start grouping your research.
                                </p>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. RAG, LangChain..."
                                    value={newPathTitle}
                                    onChange={e => setNewPathTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreatePath()}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                                />
                            </div>
                            <div className="mt-6 flex items-center gap-2">
                                <button 
                                    onClick={handleCreatePath}
                                    disabled={isCreating || !newPathTitle.trim()}
                                    className="flex-1 bg-white text-indigo-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50"
                                >
                                    {isCreating ? 'Initializing...' : 'Set Roadmap'}
                                </button>
                                {paths.length > 0 && (
                                    <button 
                                        onClick={() => setShowCreateCard(false)}
                                        className="h-10 w-10 flex items-center justify-center text-white/70 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence mode="popLayout">
                        {filteredPaths.map((path, i) => (
                            <motion.div
                                key={path.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative"
                            >
                                <div 
                                    onClick={() => router.push(`/paths/${path.id}`)}
                                    className="cursor-pointer relative z-10 h-full flex flex-col p-6 rounded-[2rem] bg-white/80 dark:bg-[#1a1e30]/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden ring-1 ring-transparent hover:ring-indigo-500/30"
                                >
                                    {/* Visual Accent */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent blur-3xl -mr-10 -mt-10" />
                                    
                                    <div className="relative space-y-4 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                                <MapIcon className="h-5 w-5" />
                                            </div>
                                            <div className="flex -space-x-2">
                                                {/* Visual indicator of resource count */}
                                                <div className="h-6 px-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">
                                                    {path.source_count} RESOURCES
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {path.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                                Initialized {new Date(path.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Resource Preview Snippets */}
                                        <div className="space-y-2 pt-2">
                                            {path.sources?.slice(0, 2).map((s, idx) => (
                                                <div key={s.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    {s.type === 'video' ? <Youtube className="h-3 w-3 text-red-500" /> : <Globe className="h-3 w-3 text-sky-500" />}
                                                    <span className="truncate">{s.title}</span>
                                                </div>
                                            ))}
                                            {path.source_count > 2 && (
                                                <p className="text-[10px] text-slate-400 italic">
                                                    + {path.source_count - 2} more technical assets
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-indigo-500 group-hover:translate-x-1 transition-transform">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Launch Path</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </div>

                                {/* Context Action */}
                                <button 
                                    onClick={(e) => executeDelete(path.id, e)}
                                    className="absolute bottom-6 right-6 z-20 h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center shadow-xl"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
