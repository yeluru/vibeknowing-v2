"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { curriculumApi } from "@/lib/api";
import { InterviewPrepPanel, type InterviewEntityType } from "@/components/tutorial/InterviewPrepPanel";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
    Route, 
    Sparkles, 
    CheckCircle2, 
    Lock, 
    ChevronRight, 
    Globe, 
    Youtube, 
    Play, 
    Info, 
    RefreshCw,
    Search,
    BookOpen,
    AlertCircle,
    Zap,
    BarChart3,
    Terminal,
    Layout,
    ArrowRight,
    ArrowDown,
    FileText,
    Compass,
    Database,
    GraduationCap,
    Code2,
    Lightbulb,
    Target,
    Trash2,
    Brain,
    Rocket,
    Layers,
    X,
    ChevronLeft,
    Check,
    GitBranch,
    BookMarked,
    Telescope,
    Briefcase,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Interview Prep accordion (local wrapper) ─────────────────────── */
function InterviewPrepAccordion({ entityType, entityId }: { entityType: InterviewEntityType; entityId: string }) {
    const [open, setOpen] = React.useState(false);
    if (!entityId) return null;
    return (
        <div className="border border-[var(--surface-border)] rounded-2xl overflow-hidden mt-4">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[var(--secondary-light)]/30 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-[var(--secondary)]" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-extrabold text-[var(--foreground)] tracking-tight">Interview Prep</div>
                        <div className="text-xs text-[var(--muted-foreground)]">5 questions · 2 easy · 2 medium · 1 hard</div>
                    </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200", open && "rotate-180")} />
            </button>
            {open && (
                <div className="px-5 py-5 bg-[var(--card)] border-t border-[var(--surface-border)]">
                    <InterviewPrepPanel entityType={entityType} entityId={entityId} />
                </div>
            )}
        </div>
    );
}

interface PathMasteryViewProps {
    categoryId?: string;
    categoryName?: string;
    missionId?: string;
    isMission?: boolean;
    hasSources?: boolean;
    onStatsUpdate?: (stats: { mastery: number }) => void;
}

export const PathMasteryView: React.FC<PathMasteryViewProps> = ({
    categoryId,
    categoryName,
    missionId,
    isMission,
    hasSources,
    onStatsUpdate
}) => {
    const [curriculum, setCurriculum] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeSectionIdx, setActiveSectionIdx] = useState(0);
    const interviewSectionRef = React.useRef<HTMLDivElement>(null);

    const scrollToInterview = () => {
        // Open accordion then scroll
        setTimeout(() => {
            interviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
    };

    const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
    const [scouting, setScouting] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"learn" | "lab" | "resources">("learn");
    
    const [generatingLesson, setGeneratingLesson] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (selectedNodeId) {
            setDrawerOpen(true);
            setActiveTab("learn");
            setActiveSectionIdx(0);
        } else {
            setDrawerOpen(false);
        }
    }, [selectedNodeId]);


    const averageMastery = useMemo(() => {
        if (!curriculum || !curriculum.nodes || curriculum.nodes.length === 0) return 0;
        const total = curriculum.nodes.reduce((acc: number, node: any) => acc + (node.mastery_score || 0), 0);
        return Math.round(total / curriculum.nodes.length);
    }, [curriculum]);

    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate({ mastery: averageMastery });
        }
    }, [averageMastery, onStatsUpdate]);

    useEffect(() => {
        if (categoryId || missionId) {
            loadCurriculum();
        }
    }, [categoryId, missionId]);


    const [error, setError] = useState<string | null>(null);

    const loadCurriculum = async () => {
        setLoading(true);
        setError(null);
        try {
            let data;
            if (isMission && missionId) {
                data = await curriculumApi.getMission(missionId);
            } else if (categoryId) {
                data = await curriculumApi.getPath(categoryId);
            }
            if (data) setCurriculum(data);
            return data;
        } catch (err: any) {
            console.error("Failed to load curriculum:", err);
            setError(err?.response?.status === 404 ? "Mission not found" : "Failed to load neural path.");
            toast.error("Neural Link Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (reset: boolean = false) => {
        setGenerating(true);
        try {
            let data;
            if (isMission && missionId) {
                data = await curriculumApi.createMission({ 
                    theme: curriculum?.goal,
                    vision: curriculum?.goal, 
                    reset: true 
                });
            } else if (categoryId) {
                data = await curriculumApi.generatePath(categoryId, { reset });
            }
            
            if (data) setCurriculum(data);
            toast.success(reset ? "Neural Path Rearchitected!" : "Master Roadmap architected!", {
                className: "bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px]"
            });
        } catch (err) {
            toast.error("Architect failed to respond.");
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateLesson = async (nodeId: string, autoScout = true) => {
        setGeneratingLesson(true);
        try {
            await curriculumApi.generateLesson(nodeId);
            toast.success("Lesson synthesized — launching Scout + Vanguard...");
            await loadCurriculum();
            // Auto-trigger Scout immediately so the resources tab is populated
            // as soon as the lesson is ready — the lesson is the intelligence Scout needs.
            if (autoScout) {
                handleScout(nodeId, false);
            }
        } catch (err) {
            toast.error("Failed to synthesize lesson.");
        } finally {
            setGeneratingLesson(false);
        }
    };

    const handleScout = async (nodeId: string, deep: boolean = false) => {
        setScouting(true);
        try {
            const res = await curriculumApi.scoutNode(nodeId, deep);
            toast.success(deep ? "Deep Scout Agent unearthed assets!" : `Scout Agent discovered ${res.resources.length} new resources!`);
            loadCurriculum();
        } catch (err) {
            toast.error("Scout failed to find resources.");
        } finally {
            setScouting(false);
        }
    };

    const handleDelete = async () => {
        if (!curriculum?.id || !window.confirm("Are you sure you want to permanently delete this mission and all associated mastery data?")) return;
        
        try {
            setDeleting(true);
            await curriculumApi.deleteMission(curriculum.id);
            toast.success("Mission purged");
            window.location.href = "/mission";
        } catch (error) {
            console.error("Failed to delete mission:", error);
            alert("Failed to delete mission. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const handleMaster = async (nodeId: string) => {
        try {
            await curriculumApi.masterNode(nodeId);
            toast.success("Unit Mastered!");
            loadCurriculum();
        } catch (err) {
            toast.error("Failed to update mastery.");
        }
    };

    const contentRef = useRef<HTMLDivElement>(null);

    const selectedNode = useMemo(() => {
        if (!selectedNodeId || !curriculum) return null;
        return curriculum.nodes.find((n: any) => n.id === selectedNodeId);
    }, [selectedNodeId, curriculum]);

    // Auto-trigger synthesis if content is missing
    useEffect(() => {
        if (selectedNodeId && selectedNode && !selectedNode.lesson_content && !generatingLesson) {
            handleGenerateLesson(selectedNodeId);
        }
    }, [selectedNodeId, selectedNode, generatingLesson]);

    const activeResource = useMemo(() => {
        if (!activeResourceId || !selectedNode) return null;
        return (Array.isArray(selectedNode.suggested_resources) ? selectedNode.suggested_resources : []).find((r: any) => r.url === activeResourceId);
    }, [activeResourceId, selectedNode]);

    const getResourceIcon = (type: string, className = "h-4 w-4") => {
        switch (type) {
            case "video":         return <Youtube className={className} />;
            case "pdf":           return <FileText className={className} />;
            case "project":       return <GitBranch className={className} />;
            case "documentation": return <BookMarked className={className} />;
            default:              return <Globe className={className} />;
        }
    };

    if (loading) return (
        <div className="flex justify-center py-32 opacity-20">
            <RefreshCw className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
    );

    if (error === "Mission not found") {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-center space-y-6">
                <div className="h-20 w-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Target className="h-10 w-10 opacity-20" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-slate-400 opacity-40">Mission Terminated</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">This record has been purged from the neural database.</p>
                </div>
                <Link href="/mission" className="vk-btn vk-btn-primary px-8 py-3">Mission Control</Link>
            </div>
        );
    }

    if (!curriculum || !curriculum.nodes || curriculum.nodes.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col items-center justify-center p-8 lg:p-20 bg-white dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000" />
                
                <div className="relative z-10 flex flex-col items-center space-y-12 text-center w-full max-w-2xl">
                    <div className="space-y-4">
                        <div className="relative mx-auto h-20 w-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                            <Target className="h-10 w-10 text-white animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{isMission ? "Mission Architecting" : "Source-Driven Mastery"}</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">{isMission ? "Neural Synthesis in Progress..." : "Architect a Roadmap from your Neural Feed"}</p>
                    </div>

                    <div className="w-full space-y-8 max-w-md">
                        <div className="p-8 bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                {isMission 
                                    ? "This mission roadmap is being synthesized. Once finalized, your tactical nodes will appear here for deep-dive mastery."
                                    : hasSources 
                                        ? "This path is primed. Click below to synthesize a structured curriculum based on your ingested projects and documents." 
                                        : "This path is empty. Ingest projects or browse sources first to generate a contextual mastery path."}
                            </p>
                        </div>
                        
                        {!isMission && (
                            <button 
                                onClick={() => handleGenerate(false)}
                                disabled={generating || !hasSources}
                                className="w-full group relative px-8 py-6 bg-indigo-600 hover:bg-emerald-600 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 disabled:opacity-50 text-white rounded-3xl font-black text-xs uppercase tracking-[0.25em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-4"
                            >
                                {generating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-white" />}
                                {generating ? "SYNTHESIZING NEURAL PATH..." : "ARCHITECT CATEGORY PATH"}
                            </button>
                        )}

                        {isMission && curriculum && (
                            <button 
                                onClick={handleDelete}
                                disabled={deleting}
                                className="w-full group relative px-8 py-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white disabled:opacity-50 border border-red-500/20 rounded-3xl font-black text-xs uppercase tracking-[0.25em] transition-all active:scale-95 flex items-center justify-center gap-4"
                            >
                                <Trash2 className="h-5 w-5" />
                                {deleting ? "PURGING MISSION..." : "DELETE ABORTED MISSION"}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="pt-2 pb-10 relative">
            {/* MISSION GRID - The Roadmap Map */}
            <div className="container mx-auto px-6 py-8 relative z-10">
                <div className="flex flex-col gap-6 mb-16">
                    <Link 
                        href="/mission" 
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-[0.3em] transition-all w-fit group"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Abort to Mission Control
                    </Link>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/10 w-fit">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">Neural Mastery Map</span>
                        </div>
                        <button
                            onClick={scrollToInterview}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[var(--secondary)] bg-[var(--secondary-light)]/20 hover:bg-[var(--secondary-light)]/40 border border-[var(--secondary)]/25 transition-all"
                        >
                            <Briefcase className="h-3.5 w-3.5" />
                            Interview Prep
                        </button>
                    </div>
                    <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none max-w-4xl">
                        {curriculum.goal || "Mission Nodes"}
                    </h2>
                </div>

                <div className="flex flex-col items-center w-full">
                    {curriculum.nodes.map((node: any, i: number) => (
                        <React.Fragment key={node.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                onClick={() => setSelectedNodeId(node.id)}
                                className={cn(
                                    "group relative w-full rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-[var(--secondary)]/15 hover:-translate-y-0.5",
                                    node.status === 'locked'
                                        ? "bg-[var(--card)] border-[var(--surface-border)] opacity-50 grayscale"
                                        : "bg-[var(--card)] border-[var(--surface-border-strong)] hover:border-[var(--secondary)]/60",
                                    node.status === 'mastered' && "border-emerald-500/40 bg-emerald-500/[0.02]"
                                )}
                            >
                                {/* Left accent stripe */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1.5",
                                    node.status === 'locked' ? "bg-[var(--surface-border)]" :
                                    node.status === 'mastered' ? "bg-emerald-500" :
                                    "bg-[var(--secondary)]"
                                )} />

                                <div className="flex items-center gap-7 p-7 pl-9">
                                    {/* Step number */}
                                    <div className="flex-none flex flex-col items-center gap-2.5">
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 text-white",
                                            node.status === 'locked' ? "bg-slate-400 dark:bg-slate-700" :
                                            node.status === 'mastered' ? "bg-emerald-500 shadow-emerald-500/30" :
                                            "bg-slate-900 dark:bg-slate-800 group-hover:bg-[var(--secondary)] group-hover:shadow-[var(--secondary)]/30"
                                        )}>
                                            {node.status === 'mastered'
                                                ? <CheckCircle2 className="h-8 w-8 stroke-[2.5px]" />
                                                : <span className="text-2xl font-black tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                                            }
                                        </div>
                                        {node.phase && (
                                            <div className="text-[8px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em] text-center max-w-[70px] leading-tight">
                                                {node.phase}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-3 py-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight group-hover:text-[var(--secondary)] transition-colors leading-snug">
                                                {node.title}
                                            </h3>
                                            {node.status === 'mastered' && (
                                                <div className="flex-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Mastered</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
                                            {node.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            {(node.suggested_resources || []).slice(0, 5).map((res: any, idx: number) => (
                                                <div key={idx} className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                                                    res.layer === "vanguard"
                                                        ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-500"
                                                        : "bg-[var(--card-hover)] border-[var(--surface-border)] text-[var(--muted-foreground)]"
                                                )}>
                                                    {getResourceIcon(res.type, "h-3 w-3")}
                                                    <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[110px]">
                                                        {(() => {
                                                            try { return new URL(res.url).host.replace('www.', ''); }
                                                            catch(e) { return 'SOURCE'; }
                                                        })()}
                                                    </span>
                                                    {res.layer === "vanguard" && <span className="text-[7px] font-black">↑</span>}
                                                </div>
                                            ))}
                                            {(!node.suggested_resources || node.suggested_resources.length === 0) && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--secondary)]/5 border border-[var(--secondary)]/10 text-[var(--secondary)]/50">
                                                    <Compass className="h-3 w-3 animate-pulse" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Scout pending...</span>
                                                </div>
                                            )}
                                            {node.suggested_resources?.length > 4 && (
                                                <div className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">
                                                    +{node.suggested_resources.length - 4} MORE
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chevron */}
                                    <div className="flex-none text-[var(--muted-foreground)]/30 group-hover:text-[var(--secondary)] transition-colors">
                                        <ChevronRight className="h-6 w-6" />
                                    </div>
                                </div>

                                <div className="absolute -bottom-10 -right-10 h-36 w-36 bg-[var(--secondary)]/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            </motion.div>

                            {i < curriculum.nodes.length - 1 && (
                                <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-6 bg-[var(--secondary)]/40" />
                                    <div className={cn(
                                        "w-9 h-9 rounded-full border-2 flex items-center justify-center bg-[var(--card)] shadow-sm",
                                        "border-[var(--secondary)]/50 text-[var(--secondary)]"
                                    )}>
                                        <ArrowDown className="h-4 w-4" />
                                    </div>
                                    <div className="w-0.5 h-6 bg-[var(--secondary)]/40" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Interview Prep */}
            <div ref={interviewSectionRef} className="container mx-auto px-6 pb-16 scroll-mt-4">
                <InterviewPrepAccordion
                    entityType={isMission ? "mission" : (categoryId ? "category" : "mission")}
                    entityId={(isMission ? missionId : categoryId) ?? ""}
                />
            </div>

            {/* HIGH-FIDELITY SIDE DRAWER */}
            <AnimatePresence>
                {drawerOpen && selectedNode && (
                    <div className="fixed inset-0 z-[1000] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNodeId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-[90vw] md:max-w-4xl lg:max-w-5xl h-full bg-white dark:bg-[var(--background)] shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="flex-none px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[var(--background)] z-20">
                                <div className="flex items-center gap-6">
                                    <button 
                                        onClick={() => setSelectedNodeId(null)}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{selectedNode.phase}</div>
                                            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Unit {curriculum.nodes.findIndex((n: any) => n.id === selectedNode.id) + 1}</div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selectedNode.title}</h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {selectedNode.status === 'mastered' ? (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                            <Check className="h-4 w-4 stroke-[3px]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Mastery Secured</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleMaster(selectedNode.id)}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <Target className="h-4 w-4" />
                                            Secure Mastery
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-none px-8 py-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    {[
                                        { id: "learn", label: "Neural Masterclass", icon: <Brain className="h-4 w-4" /> },
                                        { id: "lab", label: "Practice Exercises", icon: <Rocket className="h-4 w-4" /> },
                                        { id: "resources", label: "External Catalysts", icon: <Globe className="h-4 w-4" /> }
                                    ].map((tab) => (
                                        <button 
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={cn(
                                                "px-6 py-4 flex items-center gap-3 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                                                activeTab === tab.id 
                                                    ? "bg-white dark:bg-white/5 border-indigo-500 text-indigo-500 shadow-sm"
                                                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white dark:bg-[var(--background)]" ref={contentRef}>
                                <div className="max-w-4xl mx-auto p-8 lg:p-12 pb-32">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'learn' && (
                                            <motion.div 
                                                key="learn"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-12"
                                            >
                                                {selectedNode.lesson_content ? (
                                                    <LessonCanvas lesson={selectedNode.lesson_content} activeIdx={activeSectionIdx} onPrev={() => setActiveSectionIdx(prev => Math.max(0, prev - 1))} onNext={() => setActiveSectionIdx(prev => prev + 1)} />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-32 space-y-8">
                                                        <div className="relative">
                                                            <div className="h-24 w-24 rounded-full border-4 border-slate-100 dark:border-white/5 border-t-indigo-500 animate-spin" />
                                                            <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                                                                <Brain className="h-8 w-8 animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <div className="text-center space-y-2">
                                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Synthesizing Neural Path...</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Our AI Maestro is architecting your masterclass</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {activeTab === 'lab' && (
                                            <motion.div 
                                                key="lab"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-12"
                                            >
                                                {selectedNode.lesson_content?.deployment_lab ? (
                                                    <div className="space-y-10">
                                                        <div className="p-8 rounded-[2.5rem] bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30">
                                                            <Rocket className="h-8 w-8 mb-6" />
                                                            <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-4">Practice Mission</h4>
                                                            <p className="text-sm font-medium leading-relaxed opacity-90">{selectedNode.lesson_content.deployment_lab.mission}</p>
                                                        </div>

                                                        <div className="space-y-6">
                                                            {selectedNode.lesson_content.deployment_lab.milestones.map((m: any, i: number) => (
                                                                <div key={i} className="group p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] hover:bg-white dark:hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all">
                                                                    <div className="flex items-center gap-6 mb-4">
                                                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-black">0{i+1}</div>
                                                                        <h5 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{m.title}</h5>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">{m.task}</p>
                                                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500">
                                                                        <Check className="h-3 w-3" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Verify: {m.verification}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {selectedNode.lesson_content.deployment_lab.expert_context && (
                                                            <div className="p-8 rounded-[2rem] border border-slate-900 dark:border-white/20 bg-slate-900 dark:bg-black text-white relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-8 opacity-10"><GraduationCap className="h-24 w-24" /></div>
                                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">EXPERT MASTERY</h5>
                                                                <p className="text-sm font-medium leading-relaxed relative z-10">{selectedNode.lesson_content.deployment_lab.expert_context}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-32 opacity-20 grayscale">
                                                        <Rocket className="h-12 w-12 mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Practice Exercises Not Yet Synchronized</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {activeTab === 'resources' && (
                                            <motion.div
                                                key="resources"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-8"
                                            >
                                                {/* Scout + Vanguard Action Bar */}
                                                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-500 flex items-center justify-center">
                                                            <Telescope className="h-5 w-5" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Scout + Vanguard Agents</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {(selectedNode.suggested_resources || []).length > 0
                                                                    ? `${selectedNode.suggested_resources.length} resources found — re-run to refresh`
                                                                    : "YouTube · Papers · GitHub · Docs · Expert deep-dives"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleScout(selectedNode.id, false)}
                                                        disabled={scouting}
                                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                                                    >
                                                        {scouting
                                                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                                                            : <Telescope className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                                                        {scouting ? "Researching..." : (selectedNode.suggested_resources?.length > 0 ? "Re-Scout" : "Scout + Vanguard")}
                                                    </button>
                                                </div>

                                                {/* Scouting spinner */}
                                                {scouting && (
                                                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                                        <div className="relative">
                                                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="h-2 w-2 rounded-full bg-violet-500 animate-ping" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">
                                                            Scout hunting tutorials, papers, repos...<br />
                                                            <span className="text-violet-400">Vanguard finding frontier resources...</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Resource grid */}
                                                {!scouting && (selectedNode.suggested_resources || []).length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {(selectedNode.suggested_resources || []).map((res: any, idx: number) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setActiveResourceId(res.url)}
                                                                className={cn(
                                                                    "text-left p-6 rounded-[2rem] border transition-all group shadow-sm hover:shadow-xl",
                                                                    res.layer === "vanguard"
                                                                        ? "bg-violet-50/50 dark:bg-violet-500/5 border-violet-200 dark:border-violet-500/20 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                                                                        : "bg-slate-50 dark:bg-white/[0.01] border-slate-100 dark:border-white/5 hover:border-indigo-500 hover:bg-white dark:hover:bg-white/[0.05]"
                                                                )}
                                                            >
                                                                <div className="flex items-start gap-4">
                                                                    <div className={cn(
                                                                        "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm transition-all",
                                                                        res.layer === "vanguard"
                                                                            ? "bg-violet-100 dark:bg-violet-500/20 text-violet-500 group-hover:bg-violet-500 group-hover:text-white"
                                                                            : "bg-white dark:bg-white/5 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white"
                                                                    )}>
                                                                        {getResourceIcon(res.type, "h-4 w-4")}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-2">
                                                                        <div className="flex items-start gap-2">
                                                                            <span className={cn(
                                                                                "text-[11px] font-black uppercase tracking-tight leading-snug line-clamp-2 flex-1 transition-colors",
                                                                                res.layer === "vanguard"
                                                                                    ? "text-violet-900 dark:text-violet-200 group-hover:text-violet-600"
                                                                                    : "text-slate-900 dark:text-zinc-200 group-hover:text-indigo-600"
                                                                            )}>
                                                                                {res.title}
                                                                            </span>
                                                                            {res.layer === "vanguard" && (
                                                                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-[8px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">
                                                                                    Frontier
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {res.description && (
                                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{res.description}</p>
                                                                        )}
                                                                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                                            <span className="uppercase">{res.type}</span>
                                                                            <span>·</span>
                                                                            <span className="truncate max-w-[120px]">
                                                                                {(() => { try { return new URL(res.url).host.replace('www.',''); } catch { return 'link'; } })()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Empty state */}
                                                {!scouting && (!selectedNode.suggested_resources || selectedNode.suggested_resources.length === 0) && (
                                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
                                                            <Telescope className="h-9 w-9 text-indigo-400 dark:text-indigo-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h4 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">No resources yet</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs leading-relaxed">
                                                                Scout finds tutorials, docs, GitHub repos.<br />
                                                                Vanguard finds papers, expert deep-dives, frontier tools.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Catalyst Viewer via Portal */}
            {activeResource && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveResourceId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative w-full max-w-6xl h-[85vh] bg-black rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="flex-none px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center text-white",
                                    activeResource.layer === "vanguard" ? "bg-violet-600" : "bg-indigo-500"
                                )}>
                                    {getResourceIcon(activeResource.type, "h-4 w-4")}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-md">{activeResource.title}</div>
                                    {activeResource.layer === "vanguard" && (
                                        <div className="text-[8px] font-black text-violet-300 uppercase tracking-widest">Frontier Resource</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={activeResource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-95 transition-all flex items-center gap-2 border border-white/10"
                                >
                                    <Globe className="h-3.5 w-3.5" />
                                    External Link
                                </a>
                                <button onClick={() => setActiveResourceId(null)} className="px-5 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button>
                            </div>
                        </div>
                        <iframe
                            src={activeResource.type === 'video' ? getEmbedUrl(activeResource.url) : activeResource.url}
                            className="flex-1 w-full border-0"
                            allowFullScreen
                            title={activeResource.title}
                        />
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}

function LessonCanvas({ lesson, activeIdx, onPrev, onNext }: { lesson: any, activeIdx: number, onPrev: () => void, onNext: () => void }) {
    if (!lesson) return null;

    const sections = lesson.deep_dive_sections || [];
    const currentSection = sections[activeIdx];

    return (
        <div className="space-y-16 py-10">
            {/* Header Content - Dynamic for Intro */}
            {activeIdx === 0 && (
                <div className="space-y-12">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/10">
                            <Brain className="h-4 w-4 text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Masterclass Brief</span>
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug pr-12">
                            {lesson.mission_brief}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(lesson.core_concepts || []).map((concept: string, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{concept}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current Section Content */}
            {currentSection && (
                <motion.div 
                    key={activeIdx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                >
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-3 py-1 bg-indigo-500/5 rounded-lg border border-indigo-500/10">Section {activeIdx + 1} of {sections.length}</div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight bg-gradient-to-r from-slate-900 via-indigo-600 to-indigo-400 bg-clip-text text-transparent dark:from-white dark:via-indigo-400 dark:to-indigo-300">
                            {currentSection.title}
                        </h3>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10 prose-table:text-sm">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {currentSection.content}
                        </ReactMarkdown>
                    </div>

                    {/* PRO TIP / INSIGHT */}
                    {currentSection.pro_tip && (
                        <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Lightbulb className="h-20 w-20 text-amber-500" /></div>
                            <div className="flex items-center gap-4 mb-4">
                                <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Neural Insight / Pro Tip</span>
                            </div>
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none italic">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {currentSection.pro_tip}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* VIDEO CUE + GRAPH BUTTON */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {currentSection.youtube_search && (
                            <a
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentSection.youtube_search)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-between p-5 rounded-2xl bg-indigo-600 hover:bg-red-600 text-white transition-all group shadow-xl shadow-indigo-600/20"
                            >
                                <div className="flex items-center gap-3">
                                    <Youtube className="h-5 w-5 shrink-0" />
                                    <div className="space-y-0.5">
                                        <div className="text-[9px] font-black uppercase tracking-widest leading-none opacity-70">Watch on YouTube</div>
                                        <div className="text-[11px] font-bold line-clamp-1">"{currentSection.youtube_search}"</div>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                            </a>
                        )}
                        {/* Desmos graph button — shown whenever the section content has a formula */}
                        {/\$.*?\$/.test(currentSection.content || "") && (
                            <a
                                href="https://www.desmos.com/calculator"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all group shadow-xl shadow-emerald-600/20 sm:w-auto"
                            >
                                <BarChart3 className="h-5 w-5 shrink-0" />
                                <div className="space-y-0.5">
                                    <div className="text-[9px] font-black uppercase tracking-widest opacity-70">Graph It</div>
                                    <div className="text-[10px] font-bold">Open Desmos</div>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                            </a>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Visual Architecture - ASCII */}
            {activeIdx === sections.length - 1 && lesson.visual_architecture && (
                <div className="space-y-8 pt-12 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-indigo-600/20 border border-slate-800 dark:border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Unit Architecture Map</h4>
                    </div>
                    <div className="p-8 lg:p-12 bg-slate-900 rounded-[2.5rem] border border-white/5 font-mono text-[12px] md:text-sm text-indigo-400/90 leading-tight overflow-x-auto shadow-2xl relative">
                        <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
                        <pre className="whitespace-pre">
                            {lesson.visual_architecture}
                        </pre>
                    </div>
                </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-12 border-t border-slate-100 dark:border-white/5">
                <button 
                    onClick={onPrev}
                    disabled={activeIdx === 0}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Phase
                </button>

                <div className="flex gap-2">
                    {sections.map((_: any, i: number) => (
                        <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", activeIdx === i ? "w-8 bg-indigo-500" : "w-1.5 bg-slate-200 dark:bg-white/10")} />
                    ))}
                </div>

                <button 
                    onClick={onNext}
                    disabled={activeIdx === sections.length - 1}
                    className="flex items-center gap-3 px-8 py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/10 transition-all active:scale-95 disabled:opacity-0"
                >
                    Advancing Neural State
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function getEmbedUrl(url: string) {
    if (url?.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url?.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
    return url;
}
