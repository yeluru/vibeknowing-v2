"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers, Play, BookOpen, Zap, Clock } from "lucide-react";
import { projectsApi, Project } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ACCENTS = [
    { border: "border-indigo-200/60 dark:border-indigo-800/40",   icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",   btn: "bg-indigo-600 hover:bg-indigo-700",   glow: "from-indigo-500/10 to-violet-500/5" },
    { border: "border-sky-200/60 dark:border-sky-800/40",         icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",             btn: "bg-sky-600 hover:bg-sky-700",         glow: "from-sky-500/10 to-cyan-500/5" },
    { border: "border-violet-200/60 dark:border-violet-800/40",   icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",   btn: "bg-violet-600 hover:bg-violet-700",   glow: "from-violet-500/10 to-purple-500/5" },
    { border: "border-emerald-200/60 dark:border-emerald-800/40", icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-700", glow: "from-emerald-500/10 to-teal-500/5" },
];

export default function FlashcardsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        projectsApi.list().then(setProjects).catch(console.error).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Layers className="h-5 w-5 text-indigo-500" />
                    </div>
                    Flashcard Decks
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Spaced-repetition review for every project.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30 text-center px-6">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                        <Layers className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No decks yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ingest a source and generate flashcards from the Create tab.</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map((project, i) => {
                        const a = ACCENTS[i % ACCENTS.length];
                        return (
                            <motion.div key={project.id}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: i * 0.05 }}
                                className={cn("group relative flex flex-col rounded-2xl border bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300", a.border)}
                            >
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none", a.glow)} />
                                <div className="relative p-5 flex flex-col h-full">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300", a.icon)}>
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">{project.title}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">Flashcard Deck</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4 flex-1">
                                        {project.description || "Review key concepts from this project."}
                                    </p>
                                    <div className="mb-4">
                                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                                            <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" />Mastery</span>
                                            <span>0%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full w-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock className="h-3 w-3" />{new Date(project.created_at).toLocaleDateString()}
                                        </span>
                                        <Link href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=flashcards` : '#'}
                                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all", a.btn)}>
                                            <Play className="h-3 w-3 fill-current" /> Start
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
