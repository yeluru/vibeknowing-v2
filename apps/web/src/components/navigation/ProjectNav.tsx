"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { projectsApi, Project } from "@/lib/api";

interface ProjectNavProps {
    currentProjectId: string;
    categoryId?: string;
}

export function ProjectNav({ currentProjectId, categoryId }: ProjectNavProps) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);

    useEffect(() => {
        loadProjects();
    }, [categoryId]);

    const loadProjects = async () => {
        try {
            const projs = await projectsApi.list(categoryId);
            setProjects(projs);
            const index = projs.findIndex(p => p.id === currentProjectId);
            setCurrentIndex(index);
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            router.push(`/project/${projects[currentIndex - 1].id}`);
        }
    };

    const goToNext = () => {
        if (currentIndex < projects.length - 1) {
            router.push(`/project/${projects[currentIndex + 1].id}`);
        }
    };

    if (projects.length <= 1) return null;

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={goToPrevious}
                disabled={currentIndex <= 0}
                className="p-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[var(--background-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-smooth"
                title="Previous project"
            >
                <ChevronLeft className="h-5 w-5 text-[var(--foreground)]" />
            </button>
            <span className="text-sm text-[var(--foreground-muted)]">
                {currentIndex + 1} of {projects.length}
            </span>
            <button
                onClick={goToNext}
                disabled={currentIndex >= projects.length - 1}
                className="p-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] hover:bg-[var(--background-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-smooth"
                title="Next project"
            >
                <ChevronRight className="h-5 w-5 text-[var(--foreground)]" />
            </button>
        </div>
    );
}
