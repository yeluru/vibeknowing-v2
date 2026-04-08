"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers, Play, BookOpen, Zap, Clock } from "lucide-react";
import { projectsApi, Project } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function FlashcardsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        projectsApi.list().then(setProjects).catch(console.error).finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--secondary-light)] flex items-center justify-center">
                        <Layers className="h-5 w-5 text-[var(--secondary)]" />
                    </div>
                    Flashcard Decks
                </h1>
                <p className="text-[var(--muted-foreground)] mt-1 text-sm">Spaced-repetition review for every project.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="h-7 w-7 animate-spin text-[var(--secondary)]" />
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-[var(--radius-xl)] border border-dashed border-[var(--surface-border-strong)] bg-[var(--card)]/50 text-center px-6">
                    <div className="h-14 w-14 rounded-[var(--radius-xl)] bg-[var(--secondary-light)] flex items-center justify-center mb-4">
                        <Layers className="h-7 w-7 text-[var(--secondary)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">No decks yet</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Ingest a source and generate flashcards from the Create tab.</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map((project, i) => (
                        <motion.div key={project.id}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.05 }}
                            className="group vk-card relative flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary-light)] to-[var(--primary-light)] opacity-40 pointer-events-none" />
                            <div className="relative p-5 flex flex-col h-full">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--secondary-light)] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 text-[var(--secondary)]">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-[var(--foreground)] text-sm leading-snug line-clamp-2">{project.title}</h3>
                                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Flashcard Deck</p>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2 mb-4 flex-1">
                                    {project.description || "Review key concepts from this project."}
                                </p>
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] font-semibold text-[var(--muted-foreground)] mb-1.5">
                                        <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" />Mastery</span>
                                        <span>0%</span>
                                    </div>
                                    <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                                        <div className="h-full w-0 bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                                        <Clock className="h-3 w-3" />{new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                    <Link
                                        href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=flashcards` : '#'}
                                        className="vk-btn vk-btn-gradient flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold"
                                    >
                                        <Play className="h-3 w-3 fill-current" /> Start
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
