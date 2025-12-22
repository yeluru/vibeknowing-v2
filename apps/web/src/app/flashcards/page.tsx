"use client";

import { useState, useEffect } from "react";
import { Loader2, Layers, Play } from "lucide-react";
import { projectsApi, Project } from "@/lib/api";
import Link from "next/link";

export default function FlashcardsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await projectsApi.list();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Flashcards</h1>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a deck to start reviewing your knowledge.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                    <Layers className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No flashcards yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Create a project and generate flashcards to get started.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map((project) => (
                        <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg transition-all duration-200 group relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Layers className="h-32 w-32 text-blue-600 dark:text-blue-400 transform rotate-12 translate-x-8 -translate-y-8" />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                        <Layers className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{project.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Flashcard Deck</p>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6 line-clamp-2">
                                        {project.description || "Review key concepts from this project."}
                                    </p>
                                </div>

                                {/* Progress placeholder */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1.5">
                                        <span>Mastery</span>
                                        <span>0%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-0 rounded-full"></div>
                                    </div>
                                </div>

                                <Link
                                    href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=flashcards` : '#'}
                                    className="w-full flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-blue-500/25 group/btn"
                                >
                                    <Play className="h-4 w-4 mr-2 fill-current" />
                                    Start Review
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
