"use client";

import { useState, useEffect, useRef } from "react";
import {
    Loader2, Share2, GitGraph, FilePenLine, Layers, Trash2,
    Folder, FolderOpen, Search, Database, BookOpen, ChevronDown, Check
} from "lucide-react";
import { projectsApi, categoriesApi, Project, Category } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_ACTIONS = [
    { tool: "flashcards", icon: <Layers className="h-3.5 w-3.5" />,     label: "Flashcards" },
    { tool: "social",     icon: <Share2 className="h-3.5 w-3.5" />,      label: "Social"     },
    { tool: "diagram",    icon: <GitGraph className="h-3.5 w-3.5" />,    label: "Diagram"    },
    { tool: "article",    icon: <FilePenLine className="h-3.5 w-3.5" />, label: "Article"    },
];

export default function StudioPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [projects, setProjects]         = useState<Project[]>([]);
    const [categories, setCategories]     = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery]   = useState("");
    const [loading, setLoading]           = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadData(); }, [isAuthenticated]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setDropdownOpen(false);
        };
        if (dropdownOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen]);

    const loadData = async () => {
        setLoading(true);
        if (!isAuthenticated) {
            const gp = JSON.parse(localStorage.getItem("guest_projects") || "[]");
            setProjects(gp); setCategories([]); setLoading(false); return;
        }
        try {
            const [projs, cats] = await Promise.all([projectsApi.list(), categoriesApi.list()]);
            setProjects(projs); setCategories(cats);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const executeDelete = async (projectId: string) => {
        try {
            await projectsApi.delete(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            window.dispatchEvent(new Event("refresh-sidebar"));
            toast.success("Removed from repo");
        } catch { toast.error("Failed to delete"); }
    };

    const visibleProjects = (() => {
        let result = projects;
        if (selectedCategory === "uncategorized") result = result.filter(p => !p.category_id);
        else if (selectedCategory !== "all")       result = result.filter(p => p.category_id === selectedCategory);
        if (searchQuery.trim()) result = result.filter(p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return result;
    })();

    const uncategorizedCount = projects.filter(p => !p.category_id).length;

    const selectedLabel = selectedCategory === "all"
        ? "All Content"
        : selectedCategory === "uncategorized"
            ? "Uncategorized"
            : categories.find(c => c.id === selectedCategory)?.name ?? "Collection";

    const collectionOptions = [
        { id: "all",            label: "All Content",   count: projects.length,    icon: <Database className="h-4 w-4" /> },
        ...(uncategorizedCount > 0 ? [{ id: "uncategorized", label: "Uncategorized", count: uncategorizedCount, icon: <Folder className="h-4 w-4" /> }] : []),
        ...categories.map(cat => ({
            id: cat.id,
            label: cat.name,
            count: projects.filter(p => p.category_id === cat.id).length,
            icon: <Folder className="h-4 w-4" />,
        })),
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--secondary)]" />
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-5">

            {/* ── Header ── */}
            <div className="flex-none border-b border-[var(--surface-border)] pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Content Repo</h1>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {projects.length} item{projects.length !== 1 ? "s" : ""} · {categories.length + 1} collection{categories.length !== 0 ? "s" : ""}
                        </p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2">

                        {/* Collection dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(o => !o)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                                    "bg-[var(--card)] border-[var(--surface-border-strong)] text-[var(--foreground)]",
                                    "hover:border-[var(--secondary)]/50 hover:bg-[var(--card-hover)]",
                                    dropdownOpen && "border-[var(--secondary)]/50 bg-[var(--card-hover)]"
                                )}
                            >
                                <FolderOpen className="h-4 w-4 text-[var(--secondary)]" />
                                <span className="max-w-[140px] truncate">{selectedLabel}</span>
                                <span className="text-[11px] font-black text-[var(--muted-foreground)] bg-[var(--card-hover)] px-1.5 py-0.5 rounded-md tabular-nums">
                                    {visibleProjects.length}
                                </span>
                                <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform", dropdownOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-overlay)] border border-[var(--surface-border-strong)] rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden"
                                    >
                                        <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest px-3.5 pt-1.5 pb-2">
                                            Collections
                                        </p>
                                        {collectionOptions.map((opt, idx) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => { setSelectedCategory(opt.id); setDropdownOpen(false); }}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 w-full px-3.5 py-2 text-sm transition-all",
                                                    selectedCategory === opt.id
                                                        ? "bg-[var(--secondary-light)] text-[var(--secondary)] font-semibold"
                                                        : "text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                                                )}
                                            >
                                                <span className="flex items-center gap-2.5 min-w-0">
                                                    {selectedCategory === opt.id
                                                        ? <Check className="h-4 w-4 flex-none" />
                                                        : <span className="text-[var(--muted-foreground)]">{opt.icon}</span>
                                                    }
                                                    <span className="truncate">{opt.label}</span>
                                                </span>
                                                <span className="flex-none text-[11px] font-black tabular-nums text-[var(--muted-foreground)]">
                                                    {opt.count}
                                                </span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search…"
                                className="vk-input pl-9 pr-4 py-2.5 text-sm w-48 focus:w-64 transition-all duration-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Project grid ── */}
            <div className="flex-1 overflow-y-auto pb-10">
                <AnimatePresence mode="wait">
                    {visibleProjects.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-[var(--surface-border-strong)] text-center"
                        >
                            <BookOpen className="h-10 w-10 text-[var(--muted-foreground)] opacity-20 mb-3" />
                            <p className="text-sm font-semibold text-[var(--muted-foreground)]">No content here yet</p>
                            <p className="text-xs text-[var(--muted-foreground)] opacity-60 mt-1">Add sources or switch collection</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={selectedCategory}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            {visibleProjects.map((project, i) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    i={i}
                                    onDelete={() => executeDelete(project.id)}
                                    router={router}
                                    categories={categories}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ── Project card ── */
function ProjectCard({ project, i, onDelete, router, categories }: {
    project: Project; i: number; onDelete: () => void;
    router: ReturnType<typeof useRouter>; categories: Category[];
}) {
    const category = categories.find(c => c.id === project.category_id);
    const href = project.first_source_id ? `/source/${project.first_source_id}` : "#";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group relative vk-card flex flex-col p-5 hover:shadow-lg hover:shadow-[var(--secondary)]/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            onClick={() => router.push(href)}
        >
            {/* Delete btn */}
            <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* Category pill */}
            {category && (
                <span className="self-start mb-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--secondary-light)] text-[var(--secondary)]">
                    {category.name}
                </span>
            )}

            {/* Title + description */}
            <h3 className="font-bold text-[var(--foreground)] text-sm leading-snug line-clamp-2 mb-1.5 pr-6 group-hover:text-[var(--secondary)] transition-colors">
                {project.title}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed flex-1 mb-4">
                {project.description || "No description."}
            </p>

            {/* Quick actions */}
            <div className="border-t border-[var(--surface-border)] pt-3">
                <p className="text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-widest mb-2">Generate</p>
                <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_ACTIONS.map(action => (
                        <Link
                            key={action.tool}
                            href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=${action.tool}` : "#"}
                            onClick={e => e.stopPropagation()}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary-light)] hover:text-[var(--secondary)] transition-all text-center"
                        >
                            {action.icon}
                            <span className="text-[9px] font-semibold">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
