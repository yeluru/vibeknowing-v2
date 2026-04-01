"use client";

import { useState, useEffect } from "react";
import { Loader2, Palette, Share2, GitGraph, FilePenLine, Layers, Trash2, Folder, ChevronLeft, Search, ArrowRight, Sparkles } from "lucide-react";
import { projectsApi, categoriesApi, Project, Category } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_ACTIONS = [
    { tool: "flashcards", icon: <Layers className="h-4 w-4" />,      label: "Flashcards", color: "hover:bg-indigo-50 dark:hover:bg-indigo-900/25 hover:text-indigo-600 dark:hover:text-indigo-400" },
    { tool: "social",     icon: <Share2 className="h-4 w-4" />,       label: "Social",     color: "hover:bg-sky-50 dark:hover:bg-sky-900/25 hover:text-sky-600 dark:hover:text-sky-400" },
    { tool: "diagram",    icon: <GitGraph className="h-4 w-4" />,     label: "Diagram",    color: "hover:bg-violet-50 dark:hover:bg-violet-900/25 hover:text-violet-600 dark:hover:text-violet-400" },
    { tool: "article",    icon: <FilePenLine className="h-4 w-4" />,  label: "Article",    color: "hover:bg-emerald-50 dark:hover:bg-emerald-900/25 hover:text-emerald-600 dark:hover:text-emerald-400" },
];

const CATEGORY_ACCENTS = [
    "from-indigo-500/10 to-violet-500/5 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
    "from-sky-500/10 to-cyan-500/5 border-sky-200/60 dark:border-sky-800/40 text-sky-600 dark:text-sky-400 bg-sky-500/10",
    "from-violet-500/10 to-purple-500/5 border-violet-200/60 dark:border-violet-800/40 text-violet-600 dark:text-violet-400 bg-violet-500/10",
    "from-emerald-500/10 to-teal-500/5 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    "from-amber-500/10 to-orange-500/5 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
];

export default function StudioPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [isAuthenticated]);

    const loadData = async () => {
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
        if (!isAuthenticated) {
            const cur = JSON.parse(localStorage.getItem("guest_projects") || "[]");
            localStorage.setItem("guest_projects", JSON.stringify(cur.filter((p: Project) => String(p.id) !== String(projectId))));
            setProjects(prev => prev.filter(p => p.id !== projectId));
            window.dispatchEvent(new Event("refresh-sidebar"));
            toast.success("Project deleted"); return;
        }
        try {
            await projectsApi.delete(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            window.dispatchEvent(new Event("refresh-sidebar"));
            toast.success("Project deleted");
        } catch { toast.error("Failed to delete project"); }
    };

    const handleDelete = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault(); e.stopPropagation();
        toast("Delete this project?", { description: "Cannot be undone.", action: { label: "Delete", onClick: () => executeDelete(projectId) } });
    };

    const getCategoryProjects = (categoryId: string | null) => {
        let filtered = projects.filter(p => categoryId === "uncategorized" ? !p.category_id : p.category_id === categoryId);
        if (searchQuery.trim()) filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return filtered;
    };

    const uncategorizedCount = projects.filter(p => !p.category_id).length;

    // ── Project card ──────────────────────────────────────────────────────────
    const ProjectCard = ({ project, i }: { project: Project; i: number }) => (
        <div className="group relative">
            <motion.div
                onClick={() => router.push(project.first_source_id ? `/source/${project.first_source_id}` : "#")}
                whileHover={{ y: -4, scale: 1.01 }}
                className="cursor-pointer relative rounded-2xl border border-slate-200/70 dark:border-[#383e59] bg-white/80 dark:bg-[#1a1e30]/50 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className={cn("absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none", i % 2 === 0 ? "bg-indigo-500/8" : "bg-sky-500/8")} />
                    <div className="relative">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pr-6">
                            {project.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                            {project.description || "No description."}
                        </p>
                        <div className="border-t border-slate-100 dark:border-[#383e59] pt-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {QUICK_ACTIONS.map(action => (
                                    <Link key={action.tool}
                                        href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=${action.tool}` : "#"}
                                        className={cn("flex flex-col items-center gap-1 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 transition-all text-center", action.color)}
                                        onClick={e => e.stopPropagation()}>
                                        {action.icon}
                                        <span className="text-[9px] font-medium">{action.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            <button onClick={e => handleDelete(e, project.id)}
                className="absolute top-3 right-3 z-20 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );

    // ── Project list view ─────────────────────────────────────────────────────
    if (selectedCategory !== null) {
        const catProjects = getCategoryProjects(selectedCategory);
        const catName = selectedCategory === "uncategorized"
            ? "Uncategorized"
            : categories.find(c => c.id === selectedCategory)?.name || "Category";

        return (
            <div className="space-y-6 pb-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedCategory(null)}
                        className="p-2 rounded-xl bg-white/80 dark:bg-[#1a1e30]/50 border border-slate-200/70 dark:border-[#383e59] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{catName}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{catProjects.length} project{catProjects.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>

                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white/80 dark:bg-[#1a1e30]/50 border border-slate-200/70 dark:border-[#383e59] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400" />
                </div>

                {catProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-slate-200 dark:border-[#383e59] bg-white/50 dark:bg-[#1a1e30]/30 text-center">
                        <Sparkles className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No projects in this category.</p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {catProjects.map((p, i) => <ProjectCard key={p.id} project={p} i={i} />)}
                    </div>
                )}
            </div>
        );
    }

    // ── Category grid ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-indigo-500" />
                    </div>
                    Content Studio
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Turn your knowledge base into publishable content.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Uncategorized */}
                    <motion.button
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => setSelectedCategory("uncategorized")}
                        className="group relative text-left rounded-2xl border border-slate-200/70 dark:border-[#383e59] bg-white/80 dark:bg-[#1a1e30]/50 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none" />
                        <div className="relative flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Folder className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Uncategorized</h3>
                                <p className="text-xs text-slate-400">{uncategorizedCount} project{uncategorizedCount !== 1 ? "s" : ""}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </motion.button>

                    {categories.map((cat, i) => {
                        const count = getCategoryProjects(cat.id).length;
                        const accent = CATEGORY_ACCENTS[i % CATEGORY_ACCENTS.length].split(" ");
                        const [glow, , border, , iconColor, iconBg] = accent;
                        return (
                            <motion.button key={cat.id} whileHover={{ y: -4, scale: 1.02 }}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn("group relative text-left rounded-2xl border bg-white/80 dark:bg-[#1a1e30]/50 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-300 overflow-hidden", border)}>
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none", glow)} />
                                <div className="relative flex items-center gap-3 mb-3">
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300", iconBg)}>
                                        <Folder className={cn("h-5 w-5", iconColor)} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{cat.name}</h3>
                                        <p className="text-xs text-slate-400">{count} project{count !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <div className={cn("flex items-center justify-end transition-colors", iconColor)}>
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </motion.button>
                        );
                    })}

                    {categories.length === 0 && uncategorizedCount === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-slate-200 dark:border-[#383e59] bg-white/50 dark:bg-[#1a1e30]/30 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                                <Palette className="h-7 w-7 text-indigo-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No projects yet</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ingest a source from the home page to get started.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
