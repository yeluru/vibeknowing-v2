"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Folder, FileText, ChevronRight, ChevronDown, Plus, Home,
    MoreHorizontal, Trash2, Palette, Search, RefreshCw,
    BookOpen, PanelLeftClose, PanelLeftOpen, Zap
} from "lucide-react";
import { toast } from "sonner";
import { categoriesApi, projectsApi, Category, Project, API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EditableTitle } from "@/components/ui/EditableTitle";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
    onNavigate?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();
    const [categories, setCategories] = useState<Category[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["uncategorized"]));
    const [isCreating, setIsCreating] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        const handleRefresh = () => loadData();
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener("refresh-sidebar", handleRefresh);
        window.addEventListener("click", handleClickOutside);
        return () => {
            window.removeEventListener("refresh-sidebar", handleRefresh);
            window.removeEventListener("click", handleClickOutside);
        };
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            const guestProjects = JSON.parse(localStorage.getItem("guest_projects") || "[]");
            if (Array.isArray(guestProjects) && guestProjects.length > 0) {
                const ids = guestProjects.map((p: any) => p.id).filter(Boolean);
                if (ids.length > 0) {
                    projectsApi.claim(ids).then(() => {
                        localStorage.removeItem("guest_projects");
                        localStorage.removeItem("guest_project_count");
                        loadData();
                    }).catch(() => { });
                } else {
                    localStorage.removeItem("guest_projects");
                }
            }
        } catch { }
    }, [isAuthenticated]);

    const loadData = async () => {
        if (!isAuthenticated) {
            try {
                const guestProjects = JSON.parse(localStorage.getItem("guest_projects") || "[]");
                setProjects(guestProjects.filter((p: any) => p && p.id) as Project[]);
                setCategories([]);
            } catch { setProjects([]); }
            setLoading(false);
            return;
        }
        try {
            const [catsResult, projsResult] = await Promise.allSettled([
                categoriesApi.list(),
                projectsApi.list(),
            ]);
            const cats = catsResult.status === "fulfilled" ? catsResult.value : [];
            const projs = projsResult.status === "fulfilled" ? projsResult.value : [];
            setCategories(cats);
            setProjects(Array.from(new Map(projs.map((p) => [p.id, p])).values()));
            const e = new Set<string>(["uncategorized"]);
            cats.forEach(c => e.add(c.id));
            setExpanded(e);
        } catch { }
        finally { setLoading(false); }
    };

    const handleMoveProject = async (projectId: string, categoryId: string | null) => {
        try {
            await projectsApi.updateCategory(projectId, categoryId);
            const [cats, projs] = await Promise.all([categoriesApi.list(), projectsApi.list()]);
            setCategories(cats);
            setProjects(projs);
            setRefreshKey(p => p + 1);
            setActiveDropdown(null);
            window.dispatchEvent(new Event("refresh-sidebar"));
        } catch { toast.error("Failed to move project"); }
    };

    const executeDeleteProject = async (projectId: string) => {
        if (!isAuthenticated) {
            const current = JSON.parse(localStorage.getItem("guest_projects") || "[]");
            localStorage.setItem("guest_projects", JSON.stringify(
                current.filter((p: any) => String(p.id) !== String(projectId))
            ));
            loadData();
            window.dispatchEvent(new Event("refresh-sidebar"));
            toast.success("Project deleted");
            return;
        }
        try {
            await projectsApi.delete(projectId);
            toast.success("Project deleted");
            const [cats, projs] = await Promise.all([categoriesApi.list(), projectsApi.list()]);
            setCategories(cats);
            setProjects(projs);
            setRefreshKey(p => p + 1);
            setActiveDropdown(null);
            window.dispatchEvent(new Event("refresh-sidebar"));
        } catch { toast.error("Failed to delete project"); }
    };

    const handleDeleteProject = (projectId: string) => {
        toast("Delete this project?", {
            description: "This action cannot be undone.",
            action: { label: "Delete", onClick: () => executeDeleteProject(projectId) },
        });
    };

    const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast("Delete this category?", {
            description: "Projects will be moved to Uncategorized.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try { await categoriesApi.delete(id); loadData(); toast.success("Category deleted"); }
                    catch { toast.error("Failed to delete category"); }
                },
            },
        });
    };

    const handleUpdateTitle = async (projectId: string, newTitle: string) => {
        try {
            await fetch(`${API_BASE}/sources/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
            });
            window.dispatchEvent(new Event("refresh-sidebar"));
        } catch { }
    };

    const toggleExpand = (id: string) => {
        const s = new Set(expanded);
        s.has(id) ? s.delete(id) : s.add(id);
        setExpanded(s);
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await categoriesApi.create(newCategoryName);
            setNewCategoryName("");
            setIsCreating(false);
            loadData();
        } catch { }
    };

    const getCategoryProjects = (categoryId: string | null) => {
        let list = projects.filter(p => p.category_id === categoryId);
        if (searchQuery.trim())
            list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return list;
    };

    const filteredCategories = searchQuery.trim()
        ? categories.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getCategoryProjects(c.id).length > 0)
        : categories;

    const uncategorizedProjects = getCategoryProjects(null);

    /* ── Project row ────────────────────────────────────────────────────── */
    const renderProjectItem = (project: Project) => (
        <div
            key={project.id}
            className={cn(
                "group/project relative flex items-center",
                draggedProjectId === project.id && "opacity-50"
            )}
            draggable
            onDragStart={e => { setDraggedProjectId(project.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => setDraggedProjectId(null)}
        >
            <Link
                href={project.first_source_id ? `/source/${project.first_source_id}` : "#"}
                onClick={onNavigate}
                className={cn(
                    "relative flex-1 flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition-all duration-200 pr-8 font-medium truncate overflow-hidden",
                    "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                    project.first_source_id && pathname === `/source/${project.first_source_id}` &&
                    "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold shadow-sm"
                )}
            >
                {project.first_source_id && pathname === `/source/${project.first_source_id}` && (
                    <motion.span layoutId="active-sidebar-pill" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-r-full" />
                )}
                <FileText className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                <EditableTitle
                    initialValue={project.title}
                    onSave={val => handleUpdateTitle(project.id, val)}
                    className="w-full truncate"
                    editOnIconOnly={true}
                />
            </Link>

            <button
                onClick={e => { e.stopPropagation(); e.preventDefault(); setActiveDropdown(activeDropdown === project.id ? null : project.id); }}
                className="absolute right-1 z-20 p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded opacity-0 group-hover/project:opacity-100 transition-all"
            >
                <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {activeDropdown === project.id && (
                <div
                    className="absolute left-0 top-full mt-1 z-50 w-52 bg-popover backdrop-blur-xl rounded-xl shadow-2xl border border-border py-1"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
                        Move to...
                    </div>
                    <button
                        onClick={() => handleMoveProject(project.id, null)}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 rounded-xl text-slate-700 dark:text-slate-300 transition-colors",
                            !project.category_id && "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-500/10")}
                    >
                        <Folder className="h-3.5 w-3.5" /> Uncategorized
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleMoveProject(project.id, cat.id)}
                            className={cn("w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-foreground/80 transition-colors",
                                project.category_id === cat.id && "text-accent font-medium bg-accent/10")}
                        >
                            <Folder className="h-3.5 w-3.5" /> {cat.name}
                        </button>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                        <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    /* ── Nav link helper ────────────────────────────────────────────────── */
    const NavLink = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
        <Link
            href={href}
            onClick={onNavigate}
            title={isCollapsed ? label : undefined}
            className={cn(
                "relative flex items-center gap-3 px-3 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200 overflow-hidden",
                isCollapsed && "justify-center px-0 py-3",
                active
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            )}
        >
            {active && !isCollapsed && (
                <motion.span layoutId="active-sidebar-pill" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-500" />
            )}
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <aside className={cn(
            "glass-panel border-r border-white/20 dark:border-white/5 flex flex-col h-full transition-all duration-500 overflow-hidden shadow-2xl",
            isCollapsed ? "w-16" : "w-72"
        )}>

            {/* Logo */}
            <div className={cn(
                "flex items-center border-b border-slate-200/50 dark:border-[#383e59] flex-shrink-0",
                isCollapsed ? "justify-center p-4" : "gap-3 px-4 py-4"
            )}>
                <Link href="/" onClick={onNavigate} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                    <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <Home className="h-4 w-4 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <span className="block font-black text-[16px] tracking-tight text-slate-900 dark:text-white leading-tight">VibeLearn</span>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-0.5">Workspace</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Primary nav */}
            <div className={cn(
                "flex-shrink-0 border-b border-slate-200/50 dark:border-[#383e59]",
                isCollapsed ? "px-2 py-3 space-y-1" : "px-3 py-3 space-y-1"
            )}>
                <NavLink href="/studio" icon={Palette} label="Content Studio" active={pathname === "/studio"} />
                <NavLink href="/chat" icon={BookOpen} label="Knowledge Base" active={pathname === "/chat"} />
                <NavLink href="/" icon={Plus} label="New Project" active={false} />

                {!isCollapsed && (
                    isCreating ? (
                        <form onSubmit={handleCreateCategory} className="mt-1">
                            <input
                                autoFocus type="text" value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onBlur={() => !newCategoryName && setIsCreating(false)}
                                placeholder="Category name..."
                                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-secondary text-foreground placeholder:text-muted-foreground"
                            />
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all mt-0.5"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Category</span>
                        </button>
                    )
                )}
            </div>

            {/* Scrollable project tree */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-0.5" key={refreshKey}>

                {/* Total Projects row + Search — expanded only */}
                {!isCollapsed && !loading && (
                    <div className="mb-3 space-y-2">
                        <div className="flex items-center justify-between px-1 py-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                <Zap className="h-3.5 w-3.5 text-accent" />
                                <span>Total Projects</span>
                                <span className="ml-1 text-sm font-bold text-foreground">{projects.length}</span>
                            </div>
                            <button
                                onClick={() => loadData()}
                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                )}

                {/* Collapsed refresh */}
                {isCollapsed && !loading && (
                    <button
                        onClick={() => loadData()}
                        className="w-full flex justify-center p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                )}

                {/* Uncategorized */}
                {uncategorizedProjects.length > 0 && !isCollapsed && (
                    <div>
                        <button
                            onClick={() => toggleExpand("uncategorized")}
                            onDragOver={e => { e.preventDefault(); setDragOverCategoryId("uncategorized"); }}
                            onDragLeave={() => setDragOverCategoryId(null)}
                            onDrop={e => { e.preventDefault(); if (draggedProjectId) { handleMoveProject(draggedProjectId, null); setDragOverCategoryId(null); } }}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg transition-all",
                                "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                dragOverCategoryId === "uncategorized" && "bg-accent/10 ring-1 ring-accent/40"
                            )}
                        >
                            {expanded.has("uncategorized")
                                ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            }
                            <Folder className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="flex-1 text-left truncate">Uncategorized</span>
                            <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{uncategorizedProjects.length}</span>
                        </button>
                        {expanded.has("uncategorized") && (
                            <div className="ml-3 mt-0.5 space-y-0.5 pl-2">
                                {uncategorizedProjects.map(p => renderProjectItem(p))}
                            </div>
                        )}
                    </div>
                )}

                {/* Named categories */}
                {!isCollapsed && filteredCategories.map(category => {
                    const catProjects = getCategoryProjects(category.id);
                    return (
                        <div key={category.id}>
                            <div className="flex items-center group/item">
                                <button
                                    onClick={() => toggleExpand(category.id)}
                                    onDragOver={e => { e.preventDefault(); setDragOverCategoryId(category.id); }}
                                    onDragLeave={() => setDragOverCategoryId(null)}
                                    onDrop={e => { e.preventDefault(); if (draggedProjectId) { handleMoveProject(draggedProjectId, category.id); setDragOverCategoryId(null); } }}
                                    className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-2 text-sm font-semibold rounded-lg transition-all",
                                        "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                        dragOverCategoryId === category.id && "bg-accent/10 ring-1 ring-accent/40"
                                    )}
                                >
                                    {expanded.has(category.id)
                                        ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                                        : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                                    }
                                    <Folder className="h-3.5 w-3.5 flex-shrink-0 text-accent/70" />
                                    <span className="flex-1 text-left truncate">{category.name}</span>
                                    <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{catProjects.length}</span>
                                </button>
                                <button
                                    onClick={e => handleDeleteCategory(category.id, e)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all opacity-0 group-hover/item:opacity-100"
                                    title="Delete Category"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {expanded.has(category.id) && (
                                <div className="ml-3 mt-0.5 space-y-0.5 pl-2">
                                    {catProjects.length === 0
                                        ? <div className="px-3 py-2 text-sm text-muted-foreground italic">No projects</div>
                                        : catProjects.map(p => renderProjectItem(p))
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Collapse / Expand button — always visible at bottom ──── */}
            <div className="flex-shrink-0 border-t border-slate-200/50 dark:border-[#383e59] p-3">
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
                        "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                        isCollapsed && "justify-center px-0"
                    )}
                >
                    {isCollapsed
                        ? <PanelLeftOpen className="h-4 w-4 flex-shrink-0" />
                        : <>
                            <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                            <span>Collapse</span>
                        </>
                    }
                </button>
            </div>
        </aside>
    );
}