"use client";

import { useState, useEffect } from "react";
import { Loader2, Route } from "lucide-react";
import { categoriesApi, projectsApi, Project } from "@/lib/api";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PathTutorialInterface } from "@/components/tutorial/PathTutorialInterface";

interface SourceInfo {
    id: string;
    title: string;
    type?: string;
    has_content?: boolean;
}

export default function CategoryDetailPage() {
    const params = useParams();
    const { isAuthenticated } = useAuth();
    const [categoryName, setCategoryName] = useState<string>("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    // Keep a primary projectId as a fallback anchor (used by project-level sub-components if needed)
    const [primaryProjectId, setPrimaryProjectId] = useState<string>("");

    useEffect(() => {
        loadData();
    }, [params.id, isAuthenticated]);

    const loadData = async () => {
        try {
            const categoryId = params.id as string;
            const [cat, allProjects] = await Promise.all([
                categoriesApi.get(categoryId),
                projectsApi.list(categoryId),
            ]);
            setCategoryName(cat.name);
            setProjects(allProjects);
            if (allProjects.length > 0) setPrimaryProjectId(allProjects[0].id);
        } catch (e) {
            console.error("Failed to load category details", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSourceDeleted = (sourceId: string) => {
        setProjects(prev => prev.map(p => ({
            ...p,
            sources: p.sources?.filter(s => s.id !== sourceId),
            source_count: p.sources?.some(s => s.id === sourceId)
                ? (p.source_count || 1) - 1
                : p.source_count,
        })));
        window.dispatchEvent(new Event("refresh-sidebar"));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--secondary)]" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading...</p>
            </div>
        );
    }

    if (!categoryName) return <div className="p-20 text-center">Path not found.</div>;

    // Aggregate all sources from all projects in this category
    const allSources: SourceInfo[] = projects.flatMap(p =>
        (p.sources ?? []).map(s => ({
            id: s.id,
            title: s.title,
            type: s.type,
            has_content: s.has_content ?? false,
        }))
    );

    const totalSourceCount = allSources.length;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Minimal header */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                        <Route className="h-4 w-4 text-white" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                        {categoryName}
                    </h1>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        {totalSourceCount} {totalSourceCount === 1 ? "source" : "sources"}
                    </span>
                </div>
            </div>

            {/* Tutorial is the full experience for this category — aggregates ALL sources */}
            <PathTutorialInterface
                projectId={primaryProjectId}
                categoryId={params.id as string}
                projectTitle={categoryName}
                sources={allSources}
                onSourceDeleted={handleSourceDeleted}
            />
        </div>
    );
}
