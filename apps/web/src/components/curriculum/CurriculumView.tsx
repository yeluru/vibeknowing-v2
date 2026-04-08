"use client";

import { useState, useEffect } from "react";
import {
    Route,
    ChevronRight,
    Lock,
    Unlock,
    CheckCircle2,
    Loader2,
    Sparkles,
    Search,
    Compass,
    Target,
    Zap,
    Youtube,
    Globe,
    RefreshCw,
    BookOpen,
    FlaskConical,
    FileText,
    GitBranch,
    BookMarked
} from "lucide-react";
import { API_BASE, buildAIHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CurriculumNode {
    id: string;
    title: string;
    description: string;
    phase: string;
    status: "locked" | "unlocked" | "in_progress" | "mastered";
    mastery_score: number;
    sequence_order: number;
}

interface Curriculum {
    id: string;
    goal: string;
    phases: any[];
    nodes: CurriculumNode[];
}

interface CurriculumViewProps {
    projectId: string;
}

export function CurriculumView({ projectId }: CurriculumViewProps) {
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
    const [scouting, setScouting] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const selectedNode = curriculum?.nodes.find(n => n.id === selectedNodeId);
    const activeResource = (selectedNode as any)?.suggested_resources?.find((r: any) => r.url === activeResourceId);

    useEffect(() => {
        loadCurriculum();
    }, [projectId]);

    const loadCurriculum = async () => {
        try {
            const res = await fetch(`${API_BASE}/ai/curriculum/${projectId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.id) {
                    setCurriculum(data);
                }
            }
        } catch (e) {
            console.error("Failed to load curriculum", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${API_BASE}/ai/curriculum?project_id=${projectId}`, {
                method: "POST",
                headers: buildAIHeaders()
            });
            if (res.ok) {
                toast.success("Mastery Roadmap architected successfully");
                loadCurriculum();
            }
        } catch {
            toast.error("Generation error");
        } finally {
            setGenerating(false);
        }
    };

    const handleScout = async (nodeId: string) => {
        setScouting(true);
        try {
            const res = await fetch(`${API_BASE}/ai/curriculum/node/${nodeId}/scout`, {
                method: "POST",
                headers: buildAIHeaders()
            });
            if (res.ok) {
                toast.success("Scout Agent discovered new resources");
                loadCurriculum(); 
            }
        } catch {
            toast.error("Scout failed to respond");
        } finally {
            setScouting(false);
        }
    };

    const handleRegenerateLesson = async (nodeId: string) => {
        setRegenerating(true);
        try {
            const res = await fetch(`${API_BASE}/ai/curriculum/node/${nodeId}/lesson`, {
                method: "POST",
                headers: buildAIHeaders()
            });
            if (res.ok) {
                toast.success("Lesson synthesized successfully");
                loadCurriculum();
            } else {
                toast.error("Lesson synthesis failed");
            }
        } catch {
            toast.error("Failed to connect to synthesis service");
        } finally {
            setRegenerating(false);
        }
    };

    const handleMaster = async (nodeId: string) => {
        try {
            const res = await fetch(`${API_BASE}/ai/curriculum/node/${nodeId}/master`, {
                method: "POST",
                headers: buildAIHeaders()
            });
            if (res.ok) {
                toast.success("Unit mastered! Next node unlocked.");
                loadCurriculum();
                setSelectedNodeId(null);
                setActiveResourceId(null);
            }
        } catch {
            toast.error("Mastery failed to update");
        }
    };

    const getResourceIcon = (type: string, size = "h-4 w-4") => {
        switch (type) {
            case "video":       return <Youtube className={size} />;
            case "pdf":         return <FileText className={size} />;
            case "project":     return <GitBranch className={size} />;
            case "documentation": return <BookMarked className={size} />;
            default:            return <Globe className={size} />;
        }
    };

    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('/').pop()?.split('?')[0];
            return `https://www.youtube.com/embed/${id}`;
        }
        return url;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Mastery Tree...</p>
            </div>
        );
    }

    if (!curriculum) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-slate-50/50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                <div className="h-16 w-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-6">
                    <Sparkles className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">No Active Roadmap</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                    The Curriculum Architect hasn't designed a mastery path for this project yet.
                </p>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                    {generating ? "Architecting..." : "Generate Mastery Tree"}
                </button>
            </div>
        );
    }

    const phases = ["Foundation", "Core", "Advanced", "Applied"];
    const groupedNodes = phases.map(phaseName => ({
        name: phaseName,
        nodes: curriculum.nodes.filter(n => n.phase.toLowerCase().includes(phaseName.toLowerCase()) || n.phase === phaseName)
    })).filter(p => p.nodes.length > 0);

    const totalNodes = curriculum.nodes.length;
    const masteredNodes = curriculum.nodes.filter(n => n.status === 'mastered').length;
    const projectProgress = totalNodes > 0 ? Math.round((masteredNodes / totalNodes) * 100) : 0;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            
            {/* Study Mode Full Overlay - Refined Floating Workspace */}
            <AnimatePresence>
                {activeResource && selectedNode && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 lg:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveResourceId(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative w-full h-full bg-white dark:bg-[var(--card)] rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden"
                        >
                            {/* Left Control Bar (Focused) */}
                            <div className="w-full md:w-[300px] lg:w-[350px] h-full border-r border-slate-100 dark:border-white/5 flex flex-col bg-slate-50/50 dark:bg-[var(--background-elevated)]">
                                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <button 
                                        onClick={() => setActiveResourceId(null)}
                                        className="h-8 w-8 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                    </button>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Mastery Mode</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedNode.phase}</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                            {selectedNode.title}
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                            {selectedNode.description}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Study Nuggets</h4>
                                        <div className="grid gap-2">
                                            {(selectedNode as any).suggested_resources.map((res: any, idx: number) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => setActiveResourceId(res.url)}
                                                    className={cn(
                                                        "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                                                        activeResourceId === res.url 
                                                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                                                            : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-900 dark:text-white hover:border-indigo-500/40"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                                                        activeResourceId === res.url 
                                                            ? "bg-white/20 border-white/20" 
                                                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 group-hover:text-indigo-500"
                                                    )}>
                                                        {getResourceIcon(res.type)}
                                                    </div>
                                                    <div className="overflow-hidden flex-1">
                                                        <div className="text-[11px] font-black leading-tight line-clamp-1">{res.title}</div>
                                                        {res.layer === "vanguard" && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 dark:text-violet-300">Frontier</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {selectedNode.status !== 'mastered' ? (
                                        <button 
                                            onClick={() => handleMaster(selectedNode.id)}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                                        >
                                            Complete Unit
                                        </button>
                                    ) : (
                                        <div className="py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" /> Mastery Achieved
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Content Viewer (The Stage) */}
                            <div className="flex-1 h-full bg-slate-900/5 dark:bg-black/20 relative flex flex-col">
                                {/* Viewer Top Bar */}
                                <div className="h-14 px-6 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[var(--card)]">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                            {getResourceIcon(activeResource.type, "h-3 w-3")}
                                        </div>
                                        <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-md">
                                            {activeResource.title}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[9px] font-mono text-slate-500 max-w-[200px] truncate">
                                            {activeResource.url}
                                        </div>
                                        <a 
                                            href={activeResource.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 flex items-center gap-2 transition-all shadow-sm"
                                        >
                                            Open Externally <ChevronRight className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>

                                {/* Main Viewer Area */}
                                <div className="flex-1 w-full bg-white dark:bg-[var(--background)] relative">
                                    {activeResource.type === 'video' ? (
                                        <iframe
                                            className="w-full h-full border-0"
                                            src={getEmbedUrl(activeResource.url)}
                                            title={activeResource.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    ) : activeResource.type === 'pdf' ? (
                                        <iframe
                                            className="w-full h-full border-0"
                                            src={activeResource.url}
                                            title={activeResource.title}
                                        />
                                    ) : (
                                        <div className="h-full w-full relative">
                                            <iframe 
                                                src={activeResource.url}
                                                className="w-full h-full border-0"
                                                title={activeResource.title}
                                                // Handle potential connection refused with an overlay hint
                                            />
                                            {/* Helper Overlay for potential blocked iframes */}
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl pointer-events-none text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Can't see the content? Use "Open Externally" above. 
                                                </p>
                                                <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-tight">
                                                    Some technical sites block internal embedding.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Overlay (Node Inspection) */}
            <AnimatePresence>
                {selectedNode && !activeResourceId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedNodeId(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[var(--card)] rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 pb-4 flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedNode.phase} Phase</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedNode.title}</h2>
                                </div>
                                <button onClick={() => setSelectedNodeId(null)} className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                                    <ChevronRight className="h-5 w-5 rotate-90" />
                                </button>
                            </div>

                            <div className="px-8 pb-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{selectedNode.description}</p>

                                {/* ── Synthesized Lesson ── */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <BookOpen className="h-3 w-3" /> Synthesized Lesson
                                        </h4>
                                        <button
                                            onClick={() => handleRegenerateLesson(selectedNode.id)}
                                            disabled={regenerating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-500/10 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                        >
                                            <RefreshCw className={cn("h-3 w-3", regenerating && "animate-spin")} />
                                            {regenerating ? "Synthesizing..." : "Regenerate"}
                                        </button>
                                    </div>

                                    {(selectedNode as any).lesson_content ? (
                                        <div className="space-y-5">
                                            {/* Mission Brief */}
                                            {(selectedNode as any).lesson_content.mission_brief && (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4">
                                                    {(selectedNode as any).lesson_content.mission_brief}
                                                </p>
                                            )}

                                            {/* Core Concepts */}
                                            {(selectedNode as any).lesson_content.core_concepts?.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {(selectedNode as any).lesson_content.core_concepts.map((concept: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                            {concept}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Deep Dive Sections */}
                                            {(selectedNode as any).lesson_content.deep_dive_sections?.length > 0 && (
                                                <div className="space-y-5">
                                                    {(selectedNode as any).lesson_content.deep_dive_sections.map((section: any, i: number) => (
                                                        <div key={i} className="space-y-2 border-l-2 border-slate-200 dark:border-white/10 pl-4">
                                                            <h5 className="text-xs font-black text-slate-900 dark:text-white">{section.title}</h5>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                                                            {section.pro_tip && (
                                                                <p className="text-[10px] italic text-indigo-500 dark:text-indigo-400 pl-3 border-l-2 border-indigo-500/30">
                                                                    {section.pro_tip}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Deployment Lab */}
                                            {(selectedNode as any).lesson_content.deployment_lab && (
                                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <FlaskConical className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Lab Mission</span>
                                                    </div>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                        {(selectedNode as any).lesson_content.deployment_lab.mission}
                                                    </p>
                                                    {(selectedNode as any).lesson_content.deployment_lab.milestones?.length > 0 && (
                                                        <div className="space-y-2 mt-2">
                                                            {(selectedNode as any).lesson_content.deployment_lab.milestones.map((m: any, i: number) => (
                                                                <div key={i} className="flex gap-3 text-xs">
                                                                    <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">{i + 1}.</span>
                                                                    <div>
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{m.title}: </span>
                                                                        <span className="text-slate-500 dark:text-slate-400">{m.task}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center space-y-3">
                                            <BookOpen className="h-7 w-7 text-slate-300 mx-auto" />
                                            <p className="text-xs text-slate-400 font-medium">No lesson synthesized yet</p>
                                            <button onClick={() => handleRegenerateLesson(selectedNode.id)} disabled={regenerating} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                                {regenerating ? "Synthesizing..." : "Synthesize Lesson"}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ── Resources ── */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <Compass className="h-3 w-3" /> Resources
                                        </h4>
                                        {(selectedNode as any).suggested_resources?.length > 0 && (
                                            <button
                                                onClick={() => handleScout(selectedNode.id)}
                                                disabled={scouting}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-violet-500/10 text-slate-500 dark:text-slate-400 hover:text-violet-500 transition-colors text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                            >
                                                <Search className={cn("h-3 w-3", scouting && "animate-pulse")} />
                                                {scouting ? "Researching..." : "Re-Scout"}
                                            </button>
                                        )}
                                    </div>
                                    {(selectedNode as any).suggested_resources?.length > 0 ? (
                                        <div className="grid gap-3">
                                            {(selectedNode as any).suggested_resources.map((res: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveResourceId(res.url)}
                                                    className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                                                            res.layer === "vanguard"
                                                                ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-500 group-hover:text-violet-600"
                                                                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 group-hover:text-indigo-500"
                                                        )}>
                                                            {getResourceIcon(res.type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-xs font-black text-slate-900 dark:text-white truncate">{res.title}</div>
                                                                {res.layer === "vanguard" && (
                                                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/15 text-[8px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Frontier</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{res.description}</div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 rounded-[2rem] bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center space-y-4">
                                            <Search className={cn("h-8 w-8 text-slate-300 mx-auto", scouting && "animate-pulse")} />
                                            <h5 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">No resources yet</h5>
                                            <p className="text-xs text-slate-400 max-w-xs mx-auto">Scout + Vanguard will search the entire web — tutorials, papers, GitHub repos, YouTube masterclasses.</p>
                                            <button onClick={() => handleScout(selectedNode.id)} disabled={scouting} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">{scouting ? "Researching..." : "Deploy Scout + Vanguard"}</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {groupedNodes.map((phase, pIdx) => (
                <div key={phase.name} className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">0{pIdx + 1}</div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{phase.name} Phase</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {phase.nodes.map((node, nIdx) => (
                            <motion.div key={node.id} whileHover={{ y: node.status === 'locked' ? 0 : -4 }} onClick={() => node.status !== 'locked' && setSelectedNodeId(node.id)} className={cn("relative p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer", node.status === "mastered" ? "bg-emerald-500/5 border-emerald-500/20" : node.status === "locked" ? "bg-slate-50/50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60 cursor-not-allowed" : "bg-white dark:bg-[var(--surface-input)/40] border-slate-200 dark:border-white/5 shadow-sm")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", node.status === "mastered" ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>
                                        {node.status === "mastered" ? <CheckCircle2 className="h-5 w-5" /> : node.status === "locked" ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5 text-indigo-500" />}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Score</span>
                                        <span className={cn("text-xl font-mono font-black mt-1", node.status === 'mastered' ? "text-emerald-500" : "text-slate-900 dark:text-white")}>{node.mastery_score}%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{node.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{node.description}</p>
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className={cn("h-6 w-6 rounded-lg border-2 border-white dark:border-[var(--surface-border)] flex items-center justify-center transition-colors", (node as any).suggested_resources?.length > 0 ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400")}><Search className="h-3 w-3" /></div>
                                        <div className={cn("h-6 w-6 rounded-lg border-2 border-white dark:border-[var(--surface-border)] flex items-center justify-center transition-colors", node.status === 'mastered' ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400")}><Target className="h-3 w-3" /></div>
                                    </div>
                                    <button className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors", node.status === "locked" ? "text-slate-300" : "text-indigo-500 hover:text-indigo-600")}>Inspect Node <ChevronRight className="h-3 w-3" /></button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="mt-12 p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Target className="h-32 w-32" /></div>
                <div className="relative z-10 max-w-xl">
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Keep pushin', you're architecting the future. </h3>
                    <p className="text-indigo-100 text-sm mt-2 font-medium">Your Mastery Tree is a living map. As you finish resources, nodes will unlock and your score will climb. </p>
                    <div className="mt-6 h-2 w-full bg-indigo-500/30 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${projectProgress}%` }} className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
                    </div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Project Progress: {projectProgress}%</div>
                </div>
            </div>
        </div>
    );
}
