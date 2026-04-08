"use client";

import { useState, useEffect } from "react";
import { 
    Loader2, Trash2, Zap, Compass, RefreshCw, GraduationCap, Target, 
    ArrowRight, Sparkles, Brain, Rocket, Map, Activity, Fingerprint, Layers
} from "lucide-react";
import { curriculumApi } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function MissionControlPage() {
    const { isAuthenticated } = useAuth();
    const [missions, setMissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Mission Control State
    const [blueprintInput, setBlueprintInput] = useState("");
    const [architecting, setArchitecting] = useState(false);

    useEffect(() => { loadData(); }, [isAuthenticated]);

    const loadData = async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const miss = await curriculumApi.listMissions();
            setMissions(miss);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleCreateMission = async () => {
        if (!blueprintInput) return;

        setArchitecting(true);
        try {
            const resp = await curriculumApi.createMission({
                vision: blueprintInput,
                job_description: blueprintInput,
                reset: true
            });
            
            toast.success("Global Mission Architected", { 
                description: "Your specialized career path has been synthesized.",
                className: "bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px]"
            });

            if (resp && resp.id) {
                window.location.href = `/mastery?missionId=${resp.id}`;
            } else {
                setBlueprintInput("");
                loadData();
            }
        } catch (err) {
            toast.error("Architectural Failure");
        } finally {
            setArchitecting(false);
        }
    };

    const handleDeleteMission = async (e: React.MouseEvent, missionId: string) => {
        e.preventDefault(); e.stopPropagation();
        try {
            await curriculumApi.deleteMission(missionId);
            toast.success("Mission archived");
            loadData();
        } catch {
            toast.error("Failed to delete mission");
        }
    };

    return (
        <div className="min-h-screen bg-transparent relative overflow-hidden font-jakarta selection:bg-indigo-500/30 selection:text-white pb-20">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-600/10 blur-[180px] rounded-full animate-pulse opacity-60" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-sky-500/5 dark:bg-sky-600/10 blur-[180px] rounded-full animate-pulse px-20 opacity-40" />
                
                {/* Subtle Grid overlay - responds to theme */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] dark:opacity-[0.03] contrast-150 brightness-150" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>
            
            <div className="mx-auto px-6 lg:px-12 py-4 lg:py-6 space-y-6 lg:space-y-8 relative z-10 w-full">
                <div className="space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-500/20"
                    >
                        <div className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Neural Synthesis Engaged</span>
                    </motion.div>
                    
                    <div className="space-y-2">
                        <h1 className="text-4xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                            Mission
                            <span className="ml-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 py-1">Control</span>
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] w-full opacity-90 leading-relaxed max-w-4xl">
                            Turn any career vision or job description into a clear, visual learning roadmap. We break down complex roles into a personalized, step-by-step path to mastery.
                        </p>
                    </div>
                </div>

                {/* ── ARCHITECT BOX ── */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative w-full border border-slate-200/60 dark:border-white/[0.08] bg-white/40 dark:bg-slate-900/30 backdrop-blur-3xl shadow-xl p-6 lg:p-10 rounded-[3rem] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-emerald-500/[0.03] pointer-events-none" />
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="relative group/field">
                                <textarea 
                                    value={blueprintInput}
                                    onChange={(e) => setBlueprintInput(e.target.value)}
                                    placeholder="DESCRIBE YOUR VISION OR PASTE A ROLE SPEC..."
                                    className="relative w-full h-32 lg:h-36 px-6 lg:px-8 py-6 lg:py-8 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[1.25rem] lg:rounded-[1.5rem] text-[12px] lg:text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-widest focus:outline-none focus:border-indigo-500/40 dark:focus:border-indigo-500/60 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none shadow-inner"
                                />
                                <div className="absolute bottom-6 right-6 pointer-events-none opacity-10 lg:opacity-20">
                                    <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 text-indigo-500" />
                                </div>
                            </div>

                            {/* Neural Examples */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Neural Prompts:</span>
                                {[
                                    "Cloud Security Architect at Fintech Unicorn",
                                    "Lead AI Engineer",
                                    "Master of Distributed Systems"
                                ].map((ex) => (
                                    <button 
                                        key={ex}
                                        onClick={() => setBlueprintInput(ex)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider transition-all"
                                    >
                                        {ex}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-4 items-center pt-2">
                                <button 
                                    onClick={handleCreateMission}
                                    disabled={architecting || !blueprintInput}
                                    className="flex-1 group/btn py-4 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-black disabled:opacity-50 rounded-[1rem] lg:rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-4 overflow-hidden relative text-white"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-sky-400 opacity-0 group-hover/btn:opacity-10 transition-opacity" />
                                    <span className="relative z-10 flex items-center gap-4">
                                        {architecting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                                        {architecting ? "SYNTHESIZING..." : "ARCHITECT MISSION"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>



                {/* ── ACTIVE MISSIONS ── */}
                <div className="space-y-12 lg:space-y-16 pb-12 pt-8 lg:pt-12">
                    <div className="flex flex-col gap-2 border-l-4 border-indigo-500 pl-6 lg:pl-8">
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Active Missions</h2>
                        <p className="text-[10px] lg:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Drill down into your specialized goals</p>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            <div className="flex justify-center py-48"><Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-indigo-500 opacity-30" /></div>
                        ) : (
                            <motion.div 
                                layout
                                className="grid gap-6 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
                            >
                                {missions.map((m, idx) => (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <Link href={`/mastery?missionId=${m.id}`}>
                                            <div className="group relative p-8 lg:p-10 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] lg:rounded-[3.5rem] hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 cursor-pointer overflow-hidden h-full flex flex-col justify-between items-start gap-10 lg:gap-12">
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-all duration-700" />
                                                
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-2xl lg:rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-700">
                                                        <Target className="h-7 w-7 lg:h-8 lg:w-8" />
                                                    </div>
                                                    <button onClick={(e) => handleDeleteMission(e, m.id)} className="opacity-0 group-hover:opacity-100 p-3 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-[1.25rem] transition-all duration-300">
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                <div className="space-y-6 w-full relative z-10">
                                                    <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-3">
                                                        {m.goal}
                                                    </h3>
                                                    
                                                    <div className="pt-6 lg:pt-8 border-t border-slate-100 dark:border-white/5 flex items-center gap-6 lg:gap-8">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">MASTERY</div>
                                                            <div className="text-xl font-black text-indigo-600 dark:text-indigo-500 tabular-nums">{m.mastery_percent}%</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">NODES</div>
                                                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{m.node_count}</div>
                                                        </div>
                                                        <div className="ml-auto">
                                                            <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-500">
                                                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                                
                                {missions.length === 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="col-span-full py-32 lg:py-48 text-center rounded-[3rem] lg:rounded-[4rem] border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]"
                                    >
                                        <div className="relative h-20 w-20 lg:h-24 lg:w-24 mx-auto mb-8">
                                            <Map className="h-20 w-20 lg:h-24 lg:w-24 text-slate-200 dark:text-slate-800 opacity-50 dark:opacity-20" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Target className="h-6 w-6 lg:h-8 lg:w-8 text-indigo-500 animate-pulse" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Active Missions</h3>
                                        <p className="text-[10px] lg:text-[11px] text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-[0.2em] font-black max-w-xs mx-auto opacity-70">
                                            Architect your first specialized identity above to begin neural synthesis.
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
