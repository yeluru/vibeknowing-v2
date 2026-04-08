"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Folder, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Project, projectsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
    const { isAuthenticated, user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            loadProjects();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const loadProjects = async () => {
        try {
            const data = await projectsApi.list();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--secondary)]" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="h-20 w-20 bg-[var(--card-hover)] rounded-full flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-[var(--muted-foreground)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                    Library is Locked
                </h2>
                <p className="text-[var(--muted-foreground)] max-w-xs mx-auto mb-8">
                    Your projects will show up here once you login.
                </p>
                <Link
                    href="/auth/login"
                    className="vk-btn vk-btn-primary px-8 py-3 rounded-[var(--radius-lg)] font-semibold"
                >
                    Log in / Sign up
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Your Library</h1>
                <p className="text-[var(--muted-foreground)] mt-1">
                    Manage and organize your knowledge base.
                </p>
            </header>

            {projects.length === 0 ? (
                <div className="text-center py-12 bg-[var(--card)]/50 rounded-[var(--radius-xl)] border border-dashed border-[var(--surface-border-strong)]">
                    <Folder className="h-12 w-12 text-[var(--muted)] mx-auto mb-3" />
                    <p className="text-[var(--muted-foreground)] font-medium">No projects yet</p>
                    <Link href="/" className="text-[var(--secondary)] font-semibold text-sm hover:underline mt-2 inline-block">
                        Create your first goal
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <Link key={project.id} href={`/source/${project.first_source_id || '#'}`}>
                            <div className="vk-card group p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-[var(--secondary-light)] rounded-[var(--radius-md)] text-[var(--secondary)]">
                                        <Folder className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs text-[var(--muted-foreground)]">
                                        {new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[var(--foreground)] line-clamp-2 md:line-clamp-1 mb-2">
                                    {project.title}
                                </h3>
                                <div className="flex items-center text-xs text-[var(--muted-foreground)] font-medium group">
                                    View Project <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
