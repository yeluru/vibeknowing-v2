"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, Loader2, Link as LinkIcon, Youtube, Globe, CheckCircle2, Plus, RefreshCw, Route, ChevronDown, X, FolderOpen } from "lucide-react";
import { API_BASE, buildAIHeaders, categoriesApi, Category } from "@/lib/api";
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
    // Category (learning path) picker state
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [pickerUrl, setPickerUrl] = useState<string | null>(null);
    const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number } | null>(null);
    const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const pickerRef = useRef<HTMLDivElement>(null);

    const loadRecommendations = async () => {
        try {
            const response = await fetch(`${API_BASE}/ai/vanguard/${sourceId}`, {
                headers: buildAIHeaders()
            });
            if (response.ok) {
                const resData = await response.json();
                setData(resData);
            }

            // Also check current project title and category
            const projRes = await fetch(`${API_BASE}/sources/projects/${projectId}/details`, {
                headers: buildAIHeaders()
            });
            if (projRes.ok) {
                const proj = await projRes.json();
                setPathTitle(proj.title);
                setCurrentCategoryId(proj.category_id ?? null);
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
        // Load categories (learning paths) for the picker
        categoriesApi.list().then(setAllCategories).catch(() => {});
        const interval = setInterval(() => {
            if (!data || data.status !== 'ready') {
                loadRecommendations();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [sourceId, data?.status]);


    // Close picker on outside click or scroll
    useEffect(() => {
        if (!pickerUrl) return;
        const close = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setPickerUrl(null);
                setPickerAnchor(null);
            }
        };
        const closeOnScroll = () => { setPickerUrl(null); setPickerAnchor(null); };
        document.addEventListener("mousedown", close);
        window.addEventListener("scroll", closeOnScroll, true);
        return () => {
            document.removeEventListener("mousedown", close);
            window.removeEventListener("scroll", closeOnScroll, true);
        };
    }, [pickerUrl]);

    // Step 1: clicking + on a Vanguard rec opens the category picker
    const handlePickPath = (url: string, btnEl: HTMLButtonElement) => {
        if (pickerUrl === url) {
            setPickerUrl(null);
            setPickerAnchor(null);
            return;
        }
        const rect = btnEl.getBoundingClientRect();
        const dropdownWidth = 224; // w-56
        const margin = 8;
        const vw = window.innerWidth;

        // Prefer opening to the left of the button; fall back to right if needed
        let x = rect.left - dropdownWidth - 6;
        if (x < margin) x = rect.right + 6;
        // Clamp to viewport right edge
        if (x + dropdownWidth > vw - margin) x = vw - dropdownWidth - margin;

        // Vertical: open below button, clamp if near bottom
        const dropdownMaxH = 288;
        let y = rect.bottom + 4;
        if (y + dropdownMaxH > window.innerHeight - margin) {
            y = Math.max(margin, rect.top - dropdownMaxH - 4);
        }

        setPickerUrl(url);
        setPickerAnchor({ x, y });
        setIsCreatingCategory(false);
        setNewCategoryName("");
    };

    // Step 2: user picks a category — ingest resource into a new project under that category
    const handleAddSource = async (url: string, categoryId: string, categoryName: string) => {
        setPickerUrl(null);
        setIsCreatingCategory(false);
        setAddingUrl(url);
        try {
            const response = await fetch(`${API_BASE}/ingest/web`, {
                method: 'POST',
                headers: { ...buildAIHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, project_id: "default", category_id: categoryId })
            });
            const resData = await response.json();
            if (response.ok) {
                if (resData.status === 'exists') {
                    toast.info("Already in your library", { description: "This resource has already been added." });
                } else {
                    setAddedUrls(prev => new Set([...prev, url]));
                    toast.success(`Added to "${categoryName}"`, {
                        description: "Resource ingested and linked.",
                        action: { label: "View Path", onClick: () => router.push(`/paths?category=${categoryId}`) }
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

    // Create a new category then add the source to it
    const handleCreateCategoryAndAdd = async (url: string) => {
        if (!newCategoryName.trim()) return;
        try {
            const category = await categoriesApi.create(newCategoryName.trim());
            setAllCategories(prev => [...prev, category]);
            await handleAddSource(url, category.id, category.name);
            setNewCategoryName("");
            setIsCreatingCategory(false);
        } catch {
            toast.error("Failed to create learning path");
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
            <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Active Discovery</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                        Vibe-Vanguard is ready to scan the web <br/> to identify your technical growth frontiers. 
                     </p>
                </div>
                
                <button 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                    {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <>
                            <RefreshCw className="h-3 w-3" />
                            Launch Vanguard
                        </>
                    )}
                </button>
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
                                        onClick={(e) => handlePickPath(rec.url, e.currentTarget)}
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

                                {/* Dropdown is now rendered at panel root via fixed portal — see below */}
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

            {/* ── Fixed-position picker — escapes all stacking contexts ── */}
            {pickerUrl && pickerAnchor && (
                <div
                    ref={pickerRef}
                    className="fixed z-[9999] w-56 bg-white dark:bg-[#1a1e30] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-72 overflow-hidden"
                    style={{ left: pickerAnchor.x, top: pickerAnchor.y }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5 shrink-0">
                        Add to learning path
                    </p>

                    {/* Scrollable list */}
                    <div className="overflow-y-auto flex-1 py-1">
                        {allCategories.length === 0 && !isCreatingCategory ? (
                            <p className="px-3 py-2 text-xs text-slate-500">No learning paths yet.</p>
                        ) : (
                            allCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleAddSource(pickerUrl, cat.id, cat.name)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer",
                                        cat.id === currentCategoryId
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                                            : "text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    )}
                                >
                                    <FolderOpen className={cn("h-3.5 w-3.5 shrink-0", cat.id === currentCategoryId ? "text-emerald-500" : "text-slate-400")} />
                                    <span className="truncate font-medium">{cat.name}</span>
                                    {cat.id === currentCategoryId && (
                                        <span className="ml-auto text-[9px] font-black text-emerald-500 shrink-0">current</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Create new — pinned at bottom */}
                    {isCreatingCategory ? (
                        <div className="px-3 py-2 space-y-2 border-t border-slate-100 dark:border-white/5 shrink-0">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Path name..."
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateCategoryAndAdd(pickerUrl);
                                    if (e.key === 'Escape') setIsCreatingCategory(false);
                                }}
                                className="w-full text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => handleCreateCategoryAndAdd(pickerUrl)}
                                    className="flex-1 text-[10px] font-black uppercase tracking-wide py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                                >
                                    Create & Add
                                </button>
                                <button
                                    onClick={() => setIsCreatingCategory(false)}
                                    className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreatingCategory(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-t border-slate-100 dark:border-white/5 shrink-0 transition-colors cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new learning path
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
