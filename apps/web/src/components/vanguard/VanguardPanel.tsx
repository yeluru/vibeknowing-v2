"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2, Link as LinkIcon, Youtube, Globe, CheckCircle2, Plus, RefreshCw, Route, ChevronDown, X } from "lucide-react";
import { API_BASE, buildAIHeaders, projectsApi, Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useRouter } from 'next/navigation';


interface Recommendation {
    title: string;
    url: string;
    reasoning: string;
    type: 'video' | 'web';
}

interface VanguardData {
    status: 'ready' | 'processing' | 'none';
    recommendations: Recommendation[];
    agent_commentary: string;
}

interface VanguardPanelProps {
    sourceId: string;
    projectId: string;
    onAdded?: () => void;
}

export function VanguardPanel({ sourceId, projectId, onAdded }: VanguardPanelProps) {
    const router = useRouter();
    const [data, setData] = useState<VanguardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [addingUrl, setAddingUrl] = useState<string | null>(null);
    const [newPathName, setNewPathName] = useState("");
    const [isNamingPath, setIsNamingPath] = useState(false);
    const [pathTitle, setPathTitle] = useState("");
    // Path picker state
    const [allPaths, setAllPaths] = useState<Project[]>([]);
    const [pickerUrl, setPickerUrl] = useState<string | null>(null); // which URL is awaiting path selection
    const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

    const loadRecommendations = async () => {
        try {
            const response = await fetch(`${API_BASE}/ai/vanguard/${sourceId}`, {
                headers: buildAIHeaders()
            });
            if (response.ok) {
                const resData = await response.json();
                setData(resData);
            }

            // Also check current project title to see if it needs initialization
            const projRes = await fetch(`${API_BASE}/sources/projects/${projectId}/details`, {
                headers: buildAIHeaders()
            });
            if (projRes.ok) {
                const proj = await projRes.json();
                setPathTitle(proj.title);
                // If title is a UUID or generic, trigger naming mode
                if (proj.title.length > 30 || proj.title.toLowerCase().includes("new project")) {
                    setIsNamingPath(true);
                }
            }
        } catch (error) {
            console.error("Vanguard: Failed to load context", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInitializePath = async () => {
        if (!newPathName.trim()) return;
        try {
            const response = await fetch(`${API_BASE}/sources/projects/${projectId}/title`, {
                method: 'PUT',
                headers: {
                    ...buildAIHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newPathName })
            });
            if (response.ok) {
                setPathTitle(newPathName);
                setIsNamingPath(false);
                toast.success(`Learning Path initialized: ${newPathName}`);
                window.dispatchEvent(new Event('refresh-sidebar'));
            }
        } catch (error) {
            toast.error("Failed to initialize path");
        }
    };

    useEffect(() => {
        loadRecommendations();
        // Also load all learning paths for the path picker
        projectsApi.list().then(setAllPaths).catch(() => {});
        const interval = setInterval(() => {
            if (!data || data.status !== 'ready') {
                loadRecommendations();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [sourceId, data?.status]);


    // Step 1: clicking + on a Vanguard rec opens the path picker
    const handlePickPath = (url: string) => {
        if (allPaths.length === 0) {
            toast.error("No Learning Paths yet", {
                description: "Create a Learning Path first from the left sidebar.",
            });
            return;
        }
        setPickerUrl(url);
    };

    // Step 2: user picks a path — ingest resource into it
    const handleAddSource = async (url: string, targetPathId: string) => {
        setPickerUrl(null);
        setAddingUrl(url);
        try {
            const response = await fetch(`${API_BASE}/ingest/web`, {
                method: 'POST',
                headers: { ...buildAIHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, project_id: targetPathId })
            });
            const resData = await response.json();
            if (response.ok) {
                if (resData.status === 'exists') {
                    toast.info("Already in that Path", { description: "This resource is already there." });
                } else {
                    const targetPath = allPaths.find(p => p.id === targetPathId);
                    setAddedUrls(prev => new Set([...prev, url]));
                    toast.success(`Added to "${targetPath?.title || 'Path'}"`, {
                        description: "Resource ingested and linked.",
                        action: { label: "View Path", onClick: () => router.push(`/paths/${targetPathId}`) }
                    });
                    if (onAdded) onAdded();
                    window.dispatchEvent(new Event('refresh-sidebar'));
                }
            } else {
                toast.error("Failed to add resource", { description: resData.message });
            }
        } catch {
            toast.error("Network error — could not add resource");
        } finally {
            setAddingUrl(null);
        }
    };


    const handleRefresh = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/ai/vanguard/${sourceId}/refresh`, {
                method: 'POST',
                headers: buildAIHeaders()
            });
            if (response.ok) {
                setData(prev => prev ? { ...prev, status: 'processing' } : null);
                loadRecommendations();
            }
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4 animate-in fade-in duration-700">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                <div className="space-y-1 text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Initializing Vanguard Discovery</p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Synchronizing Mastery Gaps...</p>
                </div>
            </div>
        );
    }

    if (!data || data.status === 'none' || data.recommendations.length === 0) {
        return (
            <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Active Discovery</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                        Vibe-Vanguard is currently scanning the web <br/> to identify your technical growth frontiers. 
                     </p>
                </div>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" />
                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce delay-150" />
                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce delay-300" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Vibe-Vanguard</h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Autonomous Mastery Extension</p>
                    </div>
                </div>

                <button 
                    onClick={handleRefresh}
                    disabled={data?.status === 'processing' || loading}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all group active:scale-95 disabled:opacity-50"
                    title="Refresh Research"
                >
                    <RefreshCw className={`h-3 w-3 ${data?.status === 'processing' ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
                </button>
            </div>

            {/* Just-in-Time Path Initialization UI */}
            {isNamingPath && (
                <div className="glass-panel p-5 rounded-3xl bg-indigo-600 dark:bg-indigo-600 shadow-xl shadow-indigo-500/20 border-none animate-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <Route className="h-4 w-4" />
                            <h5 className="text-xs font-black uppercase tracking-widest">Initialize Learning Path</h5>
                        </div>
                        <p className="text-[10px] text-indigo-100 font-medium leading-relaxed">
                            Group your research into a named roadmap. This will appear as a Mastery Tree in your sidebar.
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="e.g. RAG, LangChain, MCP..."
                                value={newPathName}
                                onChange={e => setNewPathName(e.target.value)}
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                            />
                            <button 
                                onClick={handleInitializePath}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all shadow-lg"
                            >
                                Set Path
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {data.agent_commentary && (
                <div className="glass-panel p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border-indigo-100/50 dark:border-indigo-500/20">
                    <p className="text-xs italic text-slate-600 dark:text-indigo-200/80 leading-relaxed font-medium">
                        "{data.agent_commentary}"
                    </p>
                </div>
            )}

            <div className="grid gap-3">
                {data.recommendations.map((rec, idx) => (
                    <div
                        key={idx}
                        className="group relative glass-panel p-4 rounded-2xl border-slate-200/60 dark:border-white/5 transition-all hover:border-indigo-400/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    {rec.type === 'video' ? (
                                        <Youtube className="h-3.5 w-3.5 text-red-500" />
                                    ) : (
                                        <Globe className="h-3.5 w-3.5 text-sky-500" />
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {rec.type === 'video' ? 'Video Deep-Dive' : 'Technical Study'}
                                    </span>
                                </div>
                                <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                    {rec.title}
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">
                                    {rec.reasoning}
                                </p>
                            </div>

                            {/* Add to Path button */}
                            <div className="relative shrink-0">
                                {addedUrls.has(rec.url) ? (
                                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => pickerUrl === rec.url ? setPickerUrl(null) : handlePickPath(rec.url)}
                                        disabled={addingUrl === rec.url}
                                        className={cn(
                                            "h-10 w-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                                            pickerUrl === rec.url
                                                ? "bg-indigo-500 text-white border-indigo-500"
                                                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white hover:border-indigo-500"
                                        )}
                                        title="Add to a Learning Path"
                                    >
                                        {addingUrl === rec.url ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : pickerUrl === rec.url ? (
                                            <X className="h-4 w-4" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                    </button>
                                )}

                                {/* Path Picker Dropdown */}
                                {pickerUrl === rec.url && (
                                    <div className="absolute right-0 top-12 z-50 w-52 bg-white dark:bg-[#1a1e30] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5 mb-1">
                                            Add to which path?
                                        </p>
                                        {allPaths.length === 0 ? (
                                            <p className="px-3 py-2 text-xs text-slate-500">No paths yet. Create one first.</p>
                                        ) : (
                                            allPaths.map(path => (
                                                <button
                                                    key={path.id}
                                                    onClick={() => handleAddSource(rec.url, path.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                >
                                                    <Route className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                    <span className="truncate font-medium">{path.title}</span>
                                                    {path.source_count > 0 && (
                                                        <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                            {path.source_count}
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <a
                                href={rec.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors uppercase tracking-widest"
                            >
                                Preview Original <ArrowRight className="h-2.5 w-2.5" />
                            </a>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Vanguard Verified</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold text-center uppercase tracking-[0.2em]">
                    Continuous Mastery Loop Active
                </p>
            </div>
        </div>
    );
}
