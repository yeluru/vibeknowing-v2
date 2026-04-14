"use client";

import { useState, useEffect } from "react";
import { Loader2, Route } from "lucide-react";
import { projectsApi, Project } from "@/lib/api";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PathTutorialInterface } from "@/components/tutorial/PathTutorialInterface";

export default function LearningPathDetailPage() {
    const params = useParams();
    const { isAuthenticated } = useAuth();
    const [path, setPath] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPathDetails();
    }, [params.id, isAuthenticated]);

    const loadPathDetails = async () => {
        try {
            const allPaths = await projectsApi.list();
            const found = allPaths.find(p => p.id === params.id);
            if (found) setPath(found);
        } catch (e) {
            console.error("Failed to load details", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSourceDeleted = (sourceId: string) => {
        setPath(prev => prev ? {
            ...prev,
            sources: prev.sources?.filter(s => s.id !== sourceId),
            source_count: (prev.source_count || 1) - 1,
        } : null);
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

    if (!path) return <div className="p-20 text-center">Path not found.</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                    <Route className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                    {path.title}
                </h1>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {path.source_count} {path.source_count === 1 ? "source" : "sources"}
                </span>
            </div>

            {/* Tutorial is the full experience for this path */}
            <PathTutorialInterface
                projectId={path.id}
                projectTitle={path.title}
                sources={(path.sources ?? []).map(s => ({
                    id: s.id,
                    title: s.title,
                    type: s.type,
                    has_content: s.has_content ?? false,
                }))}
                onSourceDeleted={handleSourceDeleted}
            />
        </div>
    );
}
