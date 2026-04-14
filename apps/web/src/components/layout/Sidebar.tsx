"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder, Plus, LayoutDashboard, MoreHorizontal, Trash2, Palette, BookOpen, PanelLeftClose, PanelLeftOpen, Route, RefreshCw, Search, Globe, Youtube, ChevronRight, ChevronDown, Map as MapIcon, Compass, Inbox, Settings, Target, Check } from "lucide-react";
import { toast } from "sonner";
import { categoriesApi, projectsApi, Project, API_BASE } from "@/lib/api";
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
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [missions, setMissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Dropdown anchor — fixed positioning to escape overflow:hidden on sidebar
    type DropdownAnchor = { x: number; y: number; project: Project };
    const [dropdownAnchor, setDropdownAnchor] = useState<{ x: number; y: number; project: Project } | null>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<"none" | "move-source" | "move-path">("none");
    const [pendingMoveProjectId, setPendingMoveProjectId] = useState<string | null>(null);

    // Source-level three-dot menu
    type SourceMenuAnchor = { x: number; y: number; sourceId: string; projectId: string; currentCategoryId?: string | null };
    const [sourceMenuAnchor, setSourceMenuAnchor] = useState<SourceMenuAnchor | null>(null);

    // Expanded state for collections and the "Uncollected" group (start collapsed by default)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Inline creation
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");

    useEffect(() => {
        loadData();
        const handleRefresh = () => loadData();
        const handleClose = () => { setDropdownAnchor(null); setSourceMenuAnchor(null); };
        window.addEventListener("refresh-sidebar", handleRefresh);
        window.addEventListener("click", handleClose);
        return () => {
            window.removeEventListener("refresh-sidebar", handleRefresh);
            window.removeEventListener("click", handleClose);
        };
    }, [isAuthenticated]);

    // Claim guest projects on login
    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            const guestProjects = JSON.parse(localStorage.getItem("guest_projects") || "[]");
            const ids = (guestProjects as any[]).map((p) => p.id).filter(Boolean);
            if (ids.length > 0) {
                projectsApi.claim(ids).then(() => {
                    localStorage.removeItem("guest_projects");
                    loadData();
                }).catch(() => { });
            }
        } catch { }
    }, [isAuthenticated]);

    const loadData = async () => {
        if (!isAuthenticated) {
            try {
                const gp = JSON.parse(localStorage.getItem("guest_projects") || "[]");
                setProjects((gp as any[]).filter((p) => p?.id) as Project[]);
            } catch { setProjects([]); }
            setLoading(false);
            return;
        }
        try {
            const { curriculumApi } = await import("@/lib/api");
            const [catsRes, projsRes, missRes] = await Promise.allSettled([
                categoriesApi.list(),
                projectsApi.list(),
                curriculumApi.listMissions()
            ]);
            setCategories(catsRes.status === "fulfilled" ? catsRes.value : []);
            setProjects(projsRes.status === "fulfilled" ? Array.from(new Map((projsRes.value as Project[]).map((p) => [p.id, p])).values()) : []);
            setMissions(missRes.status === "fulfilled" ? missRes.value : []);
            // No longer auto-expanding all groups to allow for a cleaner default view
            setExpandedGroups(prev => prev); 
        } catch { }
        finally { setLoading(false); }
    };



    const handleMoveSourceToAnotherPath = async (sourceId: string, targetProjectId: string) => {
        try {
            const res = await fetch(`${API_BASE}/sources/${sourceId}/project`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ project_id: targetProjectId }),
            });
            if (res.ok) {
                toast.success("Consolidated successfully");
                setDropdownAnchor(null);
                loadData();
                window.dispatchEvent(new Event("refresh-sidebar"));
                router.push(`/paths/${targetProjectId}`);
            }
        } catch { toast.error("Failed to consolidate paths"); }
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;
        try {
            const newCat = await categoriesApi.create(newCollectionName.trim());
            setNewCollectionName("");
            setCreatingCollection(false);
            
            // If we came from a project context menu, move that project to the new cat automatically
            if (pendingMoveProjectId) {
                await projectsApi.updateCategory(pendingMoveProjectId, newCat.id);
                setPendingMoveProjectId(null);
                toast.success(`Project moved to new path: "${newCat.name}"`);
            } else {
                toast.success(`Learning Path "${newCat.name}" created`);
            }
            loadData();
        } catch { toast.error("Failed to create learning path"); }
    };

    // Move a source to a target category:
    // - If the source's project has only this source, reassign the whole project to the new category.
    // - Otherwise, move just the source to the first project in the target category.
    const handleMoveSourceToPath = async (sourceId: string, projectId: string, targetCategoryId: string | null) => {
        try {
            const proj = projects.find(p => p.id === projectId);
            const sourceCount = proj?.source_count ?? (proj?.sources?.length ?? 0);
            if (sourceCount <= 1) {
                // Move whole project to the target category
                await projectsApi.updateCategory(projectId, targetCategoryId);
            } else {
                // Find (or pick) the first project in the target category
                const targetProjects = projects.filter(p => p.category_id === targetCategoryId);
                if (targetProjects.length === 0) {
                    // No existing project in target — move just this source via source-project endpoint
                    await fetch(`${API_BASE}/sources/${sourceId}/project`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                        body: JSON.stringify({ project_id: projectId, new_category_id: targetCategoryId }),
                    });
                } else {
                    await handleMoveSourceToAnotherPath(sourceId, targetProjects[0].id);
                    return; // handleMoveSourceToAnotherPath already refreshes
                }
            }
            setSourceMenuAnchor(null);
            toast.success(targetCategoryId ? "Moved to path" : "Moved to inbox");
            loadData();
            window.dispatchEvent(new Event("refresh-sidebar"));
        } catch { toast.error("Failed to move"); }
    };

    const handleMoveToCollection = async (productId: string, categoryId: string | null) => {
        try {
            await projectsApi.updateCategory(productId, categoryId);
            setDropdownAnchor(null);
            loadData();
        } catch { toast.error("Failed to move path"); }
    };

    const handleDeleteCollection = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast(`Delete "${name}"?`, {
            action: {
                label: "Delete",
                onClick: async () => {
                    try { 
                        await categoriesApi.delete(id); 
                        loadData(); 
                    } catch { toast.error("Failed to delete folder"); }
                }
            }
        });
    };



    const handleDeleteProject = (projectId: string, title: string) => {
        toast(`Delete "${title}"?`, {
            description: "Resources will be unlinked.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await projectsApi.delete(projectId);
                        loadData();
                        window.dispatchEvent(new Event("refresh-sidebar"));
                        toast.success("Path deleted");
                    } catch { toast.error("Failed to delete"); }
                }
            },
        });
    };

    const handleUpdateTitle = async (projectId: string, newTitle: string) => {
        try {
            await fetch(`${API_BASE}/sources/projects/${projectId}/title`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
            });
            window.dispatchEvent(new Event("refresh-sidebar"));
        } catch { }
    };

    const sorted = [...projects].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const filtered = searchQuery.trim()
        ? sorted.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : sorted;

    const uncollected = filtered.filter(p => !p.category_id);
    const getCollectionPaths = (catId: string) => filtered.filter(p => p.category_id === catId);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };


    /* ── Single path row (used only for Global Inbox / uncategorised projects) ── */
    const PathRow = ({ project, indent = false }: { project: Project; indent?: boolean }) => {
        // Global inbox items navigate to the first source directly (no tutorial page)
        const targetHref = project.first_source_id
            ? `/source/${project.first_source_id}`
            : `/source/${(project.sources ?? [])[0]?.id ?? ""}`;
        const isActive = pathname === targetHref || (project.sources ?? []).some(s => pathname === `/source/${s.id}`);
        // Auto-expand when this path is active
        const [expanded, setExpanded] = useState(isActive && (project.source_count ?? 0) > 0);
        const hasSources = (project.source_count ?? 0) > 0;

        return (
            <div
                className={cn("group/path", draggedProjectId === project.id && "opacity-40")}
                draggable
                onDragStart={e => { setDraggedProjectId(project.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => setDraggedProjectId(null)}
            >
                {/* Path title row */}
                <div className="relative flex items-center">
                    {/* Expand/collapse chevron */}
                    <button
                        onClick={e => { e.preventDefault(); setExpanded(v => !v); }}
                        className="flex-shrink-0 p-1 ml-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                    >
                        <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-90")} />
                    </button>

                    <Link
                        href={targetHref}
                        onClick={() => { setExpanded(true); onNavigate?.(); }}
                        className={cn(
                            "flex-1 flex items-center gap-2 py-1.5 pr-8 rounded-lg text-[12px] font-semibold transition-all duration-150 min-w-0",
                            indent ? "pl-2" : "pl-1",
                            isActive
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <Route className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-emerald-500" : "text-slate-300 dark:text-slate-600")} />
                        <EditableTitle
                            initialValue={project.title}
                            onSave={v => handleUpdateTitle(project.id, v)}
                            className="flex-1 truncate"
                            editOnIconOnly
                        />
                        {hasSources && (
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 tabular-nums",
                                isActive
                                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-slate-100 dark:bg-white/8 text-slate-400 dark:text-slate-500"
                            )}>
                                {project.source_count}
                            </span>
                        )}
                    </Link>

                    {/* Context menu trigger */}
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (dropdownAnchor?.project.id === project.id) {
                                setDropdownAnchor(null);
                            } else {
                                const dropdownWidth = 256;
                                const margin = 8;
                                const vw = window.innerWidth;
                                const vh = window.innerHeight;
                                let x = rect.right + 6;
                                if (x + dropdownWidth > vw - margin) x = Math.max(margin, rect.left - dropdownWidth - 6);
                                const estimatedHeight = 420;
                                let y = rect.top;
                                if (y + estimatedHeight > vh - margin) y = Math.max(margin, vh - estimatedHeight - margin);
                                setDropdownAnchor({ x, y, project });
                            }
                        }}
                        className="absolute right-1 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover/path:opacity-100 transition-all z-10"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Source sub-items */}
                {expanded && hasSources && (
                    <div className="ml-5 pl-2 border-l border-slate-200 dark:border-white/8 space-y-0.5 py-0.5">
                        {(project.sources ?? []).map(s => {
                            const sourceHref = `/source/${s.id}`;
                            const isSourceActive = pathname === sourceHref;
                            return (
                                <Link
                                    key={s.id}
                                    href={sourceHref}
                                    onClick={onNavigate}
                                    className={cn(
                                        "flex items-center gap-2 py-1 px-2 rounded-lg text-[11px] transition-all duration-150 min-w-0",
                                        isSourceActive
                                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold"
                                            : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300"
                                    )}
                                >
                                    {s.type === "video"
                                        ? <Youtube className="h-3 w-3 shrink-0 text-red-400" />
                                        : <Globe className="h-3 w-3 shrink-0 text-sky-400" />}
                                    <span className="truncate">{s.title || "Untitled"}</span>
                                    {s.has_content && (
                                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Ingested" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    /* ── Main render ─────────────────────────────────────────────────────── */
    return (
        <aside className={cn(
            "glass-panel border-r border-white/20 dark:border-white/5 flex flex-col h-full transition-all duration-500 overflow-x-hidden shadow-2xl",
            isCollapsed ? "w-16" : "w-[300px]"
        )}>

            {/* Logo */}
            <div className={cn(
                "flex items-center border-b border-slate-200/50 dark:border-[var(--surface-border)] flex-shrink-0",
                isCollapsed ? "justify-center p-4" : "px-4 py-4 gap-3"
            )}>
                <Link href="/" onClick={onNavigate} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                    <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center shadow-lg dark:sidebar-logo-glow">
                        <Route className="h-4 w-4 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <span className="block font-mono font-black text-[15px] tracking-tight leading-tight"><span className="text-indigo-600 dark:text-indigo-400">Vibe</span><span className="text-emerald-500 dark:text-emerald-400">Learn</span></span>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] mt-0.5">Mastery System</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* ── LEARNING PATHS (primary zone, scrollable) ───────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {!isCollapsed ? (
                    <>
                        {/* Zone header */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-1.5 flex-shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                My Workspace
                            </span>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => loadData()} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all" title="Refresh">
                                    <RefreshCw className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Search — always visible */}
                        {!loading && (
                            <div className="px-3 pb-2 flex-shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Filter records..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Path tree */}
                        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4 space-y-0.5" key={refreshKey}>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <RefreshCw className="h-4 w-4 animate-spin text-slate-300" />
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {/* 1. Global Inbox / Processing */}
                                    {uncollected.length > 0 && (() => {
                                        // Flatten all sources from all uncollected projects
                                        const inboxSources = uncollected.flatMap(p => (p.sources ?? []).map(s => ({ ...s, projectId: p.id })));
                                        const inboxCount = inboxSources.length || uncollected.length;
                                        return (
                                            <div className="mb-4"
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                                onDrop={e => { e.preventDefault(); if (draggedProjectId) handleMoveToCollection(draggedProjectId, null); }}
                                            >
                                                <div className="group/cat flex items-center gap-1.5 px-2 py-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl mb-0.5 border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                                                    <button onClick={() => toggleGroup("__inbox__")} className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-left">
                                                        <Compass className={cn("h-3.5 w-3.5", expandedGroups.has("__inbox__") ? "text-emerald-500" : "text-slate-400")} />
                                                        <span className="truncate">Global Inbox / Processing</span>
                                                        <span className="ml-auto text-[9px] font-bold bg-white/50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                                                            {inboxCount}
                                                        </span>
                                                        <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", expandedGroups.has("__inbox__") && "rotate-180")} />
                                                    </button>
                                                </div>
                                                {expandedGroups.has("__inbox__") && (
                                                    <div className="ml-3 pl-2 border-l-2 border-emerald-500/10 space-y-0.5 py-1">
                                                        {inboxSources.length > 0 ? inboxSources.map(s => {
                                                            const sourceHref = `/source/${s.id}`;
                                                            const isSourceActive = pathname === sourceHref;
                                                            return (
                                                                <div key={s.id} className="group/src relative flex items-center">
                                                                    <Link
                                                                        href={sourceHref}
                                                                        onClick={onNavigate}
                                                                        className={cn(
                                                                            "flex-1 flex items-center gap-2 py-1 pl-2 pr-7 rounded-lg text-[11px] transition-all duration-150 min-w-0",
                                                                            isSourceActive
                                                                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                                                                                : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300"
                                                                        )}
                                                                    >
                                                                        {s.type === "video"
                                                                            ? <Youtube className="h-3 w-3 shrink-0 text-red-400" />
                                                                            : <Globe className="h-3 w-3 shrink-0 text-sky-400" />}
                                                                        <span className="truncate">{s.title || "Untitled"}</span>
                                                                        {s.has_content && (
                                                                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Ingested" />
                                                                        )}
                                                                    </Link>
                                                                    <button
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setSourceMenuAnchor(prev => prev?.sourceId === s.id ? null : { x: rect.right + 4, y: rect.top, sourceId: s.id, projectId: s.projectId, currentCategoryId: null });
                                                                        }}
                                                                        className="absolute right-1 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover/src:opacity-100 transition-all"
                                                                    >
                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        }) : uncollected.map(p => {
                                                            // Fallback: project has no sources array yet — show project title linking to its path
                                                            const href = `/paths/${p.id}`;
                                                            return (
                                                                <Link key={p.id} href={href} onClick={onNavigate}
                                                                    className="flex items-center gap-2 py-1 px-2 rounded-lg text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 transition-all"
                                                                >
                                                                    <Globe className="h-3 w-3 shrink-0 text-slate-400" />
                                                                    <span className="truncate">{p.title || "Untitled"}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 1.1 GLOBAL MISSIONS (GOAL-DRIVEN) */}
                                    {missions.length > 0 && (
                                        <div className="mb-4">
                                            <div className="group/cat flex items-center gap-1.5 px-2 py-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl mb-0.5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                                                <button onClick={() => toggleGroup("__missions__")} className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-left">
                                                    <Target className={cn("h-3.5 w-3.5", expandedGroups.has("__missions__") ? "text-indigo-500" : "text-slate-400")} />
                                                    <span className="truncate">Active Missions</span>
                                                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-300 ml-auto", expandedGroups.has("__missions__") && "rotate-180")} />
                                                </button>
                                            </div>
                                            {expandedGroups.has("__missions__") && (
                                                <div className="ml-3 pl-2 border-l-2 border-indigo-500/10 space-y-0.5 py-1">
                                                     {missions.map(m => (
                                                         <div key={m.id} className="group/mission relative flex items-center">
                                                             <Link 
                                                                 href={`/mastery?missionId=${m.id}`}
                                                                 onClick={onNavigate}
                                                                 className={cn(
                                                                     "flex-1 flex items-center gap-2 py-1.5 px-2 rounded-lg text-[12px] font-semibold transition-all duration-150 min-w-0",
                                                                     pathname === "/mastery" && new URLSearchParams(window.location.search).get("missionId") === m.id
                                                                         ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                                                         : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                                                 )}
                                                             >
                                                                 <Target className="h-3 w-3 shrink-0 opacity-40" />
                                                                 <span className="truncate">{m.goal}</span>
                                                             </Link>
                                                             <button 
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     if (window.confirm(`Delete mission: "${m.goal}"?`)) {
                                                                         const { curriculumApi } = require("@/lib/api");
                                                                         curriculumApi.deleteMission(m.id).then(() => {
                                                                             toast.success("Mission deleted");
                                                                             loadData();
                                                                             if (pathname === "/mastery" && new URLSearchParams(window.location.search).get("missionId") === m.id) {
                                                                                 router.push("/mission");
                                                                             }
                                                                         }).catch(() => toast.error("Failed to delete mission"));
                                                                     }
                                                                 }}
                                                                 className="absolute right-1 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover/mission:opacity-100 transition-all"
                                                             >
                                                                 <Trash2 className="h-3 w-3" />
                                                             </button>
                                                         </div>
                                                     ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. My Learning Paths (Folders) */}
                                    {categories.length >= 0 && (
                                        <div data-onboarding="nav-paths" className="px-2 pb-1.5 pt-1 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">My Mastery Paths</span>
                                            <button 
                                                onClick={() => setCreatingCollection(true)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                                                title="New Learning Path"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Inline creation form */}
                                    <AnimatePresence>
                                        {creatingCollection && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="px-2 pb-3 overflow-hidden"
                                            >
                                                <form onSubmit={handleCreateCollection} className="flex gap-1.5 p-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/15">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={newCollectionName}
                                                        onChange={e => setNewCollectionName(e.target.value)}
                                                        onKeyDown={e => e.key === "Escape" && setCreatingCollection(false)}
                                                        placeholder="Path name..."
                                                        className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-[var(--card)] border-none rounded-lg focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                    <button type="submit" className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] rounded-lg font-bold">Add</button>
                                                </form>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {categories.map((cat: any) => {
                                        const catPaths = getCollectionPaths(cat.id);
                                        const isOpen = expandedGroups.has(cat.id);
                                        // Aggregate all sources from all projects in this category
                                        const allCatSources = catPaths.flatMap(p => (p.sources ?? []).map(s => ({ ...s, projectId: p.id })));
                                        // Navigate to the category-level page
                                        const catHref = `/category/${cat.id}`;
                                        const isCatActive = pathname === catHref || pathname.startsWith(`/category/${cat.id}`);
                                        return (
                                            <div key={cat.id} className="mb-2"
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                                onDrop={e => { e.preventDefault(); if (draggedProjectId) handleMoveToCollection(draggedProjectId, cat.id); }}
                                            >
                                                <div className={cn(
                                                    "group/cat flex items-center gap-3 px-3.5 py-2.5 rounded-2xl mb-1.5 border transition-all duration-300",
                                                    isCatActive
                                                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20"
                                                        : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/5 hover:border-indigo-500/30",
                                                    draggedProjectId && "ring-2 ring-indigo-500/40 bg-indigo-500/10"
                                                )}>
                                                    <div
                                                        onClick={() => {
                                                            router.push(catHref);
                                                            onNavigate?.();
                                                            toggleGroup(cat.id);
                                                        }}
                                                        className="flex-1 flex items-center gap-3.5 text-[11px] font-black uppercase tracking-[0.15em] text-left min-w-0 cursor-pointer"
                                                    >
                                                        <div className={cn(
                                                            "h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-all",
                                                            isCatActive
                                                                ? "bg-indigo-100 dark:bg-indigo-500/20"
                                                                : "bg-slate-100 dark:bg-white/5 group-hover/cat:bg-indigo-500/10"
                                                        )}>
                                                            <MapIcon className={cn("h-4 w-4", isCatActive ? "text-indigo-500" : "text-slate-400 group-hover/cat:text-indigo-400")} />
                                                        </div>
                                                        <span className={cn(
                                                            "truncate transition-colors",
                                                            isCatActive ? "text-indigo-700 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"
                                                        )}>
                                                            {cat.name}
                                                        </span>
                                                        <span className={cn(
                                                            "ml-auto text-[9px] font-black px-2 py-0.5 rounded-lg border tabular-nums transition-colors",
                                                            isCatActive
                                                                ? "bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                                                : "bg-white dark:bg-white/10 border-slate-100 dark:border-white/5 text-slate-500"
                                                        )}>
                                                            {allCatSources.length}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleGroup(cat.id); }}
                                                        className="p-1.5 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                                                    >
                                                        <ChevronDown className={cn(
                                                            "h-3.5 w-3.5 transition-transform duration-300 text-slate-400",
                                                            isOpen && "rotate-180"
                                                        )} />
                                                    </button>
                                                </div>
                                                {isOpen && (
                                                    <div className="ml-3 pl-2 border-l-2 border-indigo-500/10 space-y-0.5 py-1">
                                                        {allCatSources.length === 0 ? (
                                                            <p className="px-2 py-2 text-[10px] text-slate-400 italic">No sources ingested yet.</p>
                                                        ) : (
                                                            allCatSources.map(s => {
                                                                const sourceHref = `/source/${s.id}`;
                                                                const isSourceActive = pathname === sourceHref;
                                                                return (
                                                                    <div key={s.id} className="group/src relative flex items-center">
                                                                        <Link
                                                                            href={sourceHref}
                                                                            onClick={onNavigate}
                                                                            className={cn(
                                                                                "flex-1 flex items-center gap-2 py-1 pl-2 pr-7 rounded-lg text-[11px] transition-all duration-150 min-w-0",
                                                                                isSourceActive
                                                                                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold"
                                                                                    : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300"
                                                                            )}
                                                                        >
                                                                            {s.type === "video"
                                                                                ? <Youtube className="h-3 w-3 shrink-0 text-red-400" />
                                                                                : <Globe className="h-3 w-3 shrink-0 text-sky-400" />}
                                                                            <span className="truncate">{s.title || "Untitled"}</span>
                                                                            {s.has_content && (
                                                                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Ingested" />
                                                                            )}
                                                                        </Link>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setSourceMenuAnchor(prev => prev?.sourceId === s.id ? null : { x: rect.right + 4, y: rect.top, sourceId: s.id, projectId: s.projectId, currentCategoryId: cat.id });
                                                                            }}
                                                                            className="absolute right-1 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover/src:opacity-100 transition-all"
                                                                        >
                                                                            <MoreHorizontal className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Empty State if absolutely nothing */}
                                    {uncollected.length === 0 && categories.length === 0 && (
                                        <div className="px-3 py-10 text-center space-y-3">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto opacity-50">
                                                <Compass className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-[12px] font-bold text-slate-500">Your roadmap is empty.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </>
                ) : (
                    /* Collapsed icon mode */
                    <div className="flex flex-col items-center py-3 gap-1">
                        {projects.slice(0, 10).map(p => (
                            <Link key={p.id} href={`/paths/${p.id}`} onClick={onNavigate} title={p.title}
                                className={cn("p-2.5 rounded-xl transition-all", pathname === `/paths/${p.id}` ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5")}
                            >
                                <Route className="h-4 w-4" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Secondary Nav ─────────────────────────────────── */}
            <div className={cn(
                "flex-shrink-0 border-t border-slate-200/50 dark:border-[var(--surface-border)]",
                isCollapsed ? "px-2 py-3 space-y-1" : "px-3 py-3 space-y-0.5"
            )}>
                {!isCollapsed && (
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600 px-2 pb-1">
                        Other Tools
                    </p>
                )}
                <NavLink href="/mission" icon={<Target className="h-4 w-4" />} label="Mission Control" active={pathname === "/mission"} isCollapsed={isCollapsed} onNavigate={onNavigate} />
                <NavLink href="/studio" icon={<Palette className="h-4 w-4" />} label="Content Repo" active={pathname === "/studio"} isCollapsed={isCollapsed} onNavigate={onNavigate} dataOnboarding="nav-studio" />
                <NavLink href="/chat" icon={<BookOpen className="h-4 w-4" />} label="Knowledge Base" active={pathname === "/chat"} isCollapsed={isCollapsed} onNavigate={onNavigate} dataOnboarding="nav-chat" />
            </div>

            {/* Collapse button */}
            <div className="flex-shrink-0 border-t border-slate-200/50 dark:border-[var(--surface-border)] p-3">
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "Expand" : "Collapse"}
                    className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-xl transition-all text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white", isCollapsed && "justify-center px-0")}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span>Collapse</span></>}
                </button>
            </div>

            {/* Dropdown rendered at component root as fixed to escape overflow:hidden */}
            <AnimatePresence>
                {dropdownAnchor && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="fixed z-[9999] w-64 bg-white dark:bg-[var(--surface-input)] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[85vh] overflow-y-auto"
                        style={{ 
                            left: dropdownAnchor.x, 
                            top: dropdownAnchor.y,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                                {dropdownAnchor.project.title}
                            </p>
                        </div>

                        {/* Roadmap management (Safe Check) */}
                        {dropdownAnchor && (
                        <div className="p-1.5 space-y-1">
                            {/* Category/Folder Selection */}
                            <div className="space-y-1">
                                <div className="px-1.5 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 mb-1">
                                    Organize under Learning Path
                                </div>
                                <button 
                                    onClick={() => setActiveSubmenu(activeSubmenu === "move-path" ? "none" : "move-path")}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg transition-all",
                                        activeSubmenu === "move-path" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Folder className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>Assign to Learning Path</span>
                                    <ChevronRight className={cn("h-3 w-3 ml-auto transition-transform", activeSubmenu === "move-path" && "rotate-90")} />
                                </button>

                                {activeSubmenu === "move-path" && (
                                    <div className="max-h-56 overflow-y-auto p-1 bg-slate-50 dark:bg-black/20 rounded-xl space-y-1 shadow-inner">
                                        <button 
                                            onClick={() => handleMoveToCollection(dropdownAnchor.project.id, null)} 
                                            className={cn(
                                                "w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                !dropdownAnchor.project.category_id ? "text-emerald-600 bg-white shadow-sm" : "text-slate-400 hover:bg-white"
                                            )}
                                        >
                                            🧭 Discovery / Inbox
                                        </button>
                                        
                                        {/* Show Learning Paths (Categories) */}
                                        {categories.map(cat => (
                                            <button 
                                                key={cat.id} 
                                                onClick={() => handleMoveToCollection(dropdownAnchor.project.id, cat.id)} 
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 text-xs rounded-lg transition-all truncate",
                                                    dropdownAnchor.project.category_id === cat.id ? "text-indigo-600 bg-white font-bold shadow-sm" : "text-slate-500 hover:bg-white"
                                                )}
                                            >
                                                🛤️ {cat.name}
                                            </button>
                                        ))}

                                        <div className="border-t border-slate-200 dark:border-white/5 my-1" />
                                        <button 
                                            onClick={() => { 
                                                setPendingMoveProjectId(dropdownAnchor.project.id);
                                                setDropdownAnchor(null); 
                                                setCreatingCollection(true); 
                                            }}
                                            className="w-full text-left px-2 py-1.5 text-xs text-indigo-500 font-bold hover:bg-indigo-50 rounded-lg flex items-center gap-1.5"
                                        >
                                            <Plus className="h-3 w-3" /> Create New Learning Path...
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Consolidate sources (Resource Move) */}
                            {dropdownAnchor.project.source_count > 0 && (
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setActiveSubmenu(activeSubmenu === "move-source" ? "none" : "move-source")}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg transition-all",
                                            activeSubmenu === "move-source" ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                                        )}
                                    >
                                        <Route className="h-3.5 w-3.5" />
                                        <span>Merge with Another Roadmap</span>
                                        <ChevronRight className={cn("h-3 w-3 ml-auto transition-transform", activeSubmenu === "move-source" && "rotate-90")} />
                                    </button>

                                    {activeSubmenu === "move-source" && (
                                        <div className="max-h-48 overflow-y-auto p-1 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-xl space-y-0.5 shadow-inner">
                                            <p className="px-2 py-1 text-[9px] text-slate-400 font-bold uppercase italic">Combine this content with...</p>
                                            {sorted.filter(p => p.id !== dropdownAnchor.project.id).map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        const sourceToMove = dropdownAnchor.project.sources?.[0]?.id;
                                                        if (sourceToMove) handleMoveSourceToAnotherPath(sourceToMove, p.id);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-all truncate"
                                                >
                                                    🎯 {p.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="border-t border-slate-100 dark:border-white/5 pt-1 mt-1">
                                <button
                                    onClick={() => handleDeleteProject(dropdownAnchor.project.id, dropdownAnchor.project.title)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Resource
                                </button>
                            </div>
                        </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Source three-dot dropdown — fixed to escape overflow:hidden */}
            <AnimatePresence>
                {sourceMenuAnchor && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="fixed z-[9999] w-52 bg-white dark:bg-[var(--surface-input)] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                        style={{ left: Math.min(sourceMenuAnchor.x, window.innerWidth - 216), top: sourceMenuAnchor.y }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-3 pt-2 pb-1 border-b border-slate-100 dark:border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Move to path</p>
                        </div>
                        <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                            {/* Inbox option — only show if source is currently in a path */}
                            {sourceMenuAnchor.currentCategoryId && (
                                <button
                                    onClick={() => handleMoveSourceToPath(sourceMenuAnchor.sourceId, sourceMenuAnchor.projectId, null)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 rounded-lg transition-all text-left"
                                >
                                    <Compass className="h-3 w-3 shrink-0 text-emerald-400" />
                                    <span>Global Inbox</span>
                                </button>
                            )}
                            {categories.map((cat: any) => {
                                const isCurrent = cat.id === sourceMenuAnchor.currentCategoryId;
                                return (
                                    <button
                                        key={cat.id}
                                        disabled={isCurrent}
                                        onClick={() => !isCurrent && handleMoveSourceToPath(sourceMenuAnchor.sourceId, sourceMenuAnchor.projectId, cat.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-lg transition-all text-left",
                                            isCurrent
                                                ? "text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 cursor-default font-semibold"
                                                : "text-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700"
                                        )}
                                    >
                                        <MapIcon className="h-3 w-3 shrink-0 text-indigo-400" />
                                        <span className="truncate">{cat.name}</span>
                                        {isCurrent && <Check className="h-3 w-3 ml-auto shrink-0 text-indigo-400" />}
                                    </button>
                                );
                            })}
                            {categories.length === 0 && (
                                <p className="px-2.5 py-2 text-[10px] text-slate-400 italic">No mastery paths yet.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </aside>
    );
}

function NavLink({ href, icon, label, active, isCollapsed, onNavigate, dataOnboarding }: {
    href: string; icon: React.ReactNode; label: string; active: boolean; isCollapsed: boolean; onNavigate?: () => void; dataOnboarding?: string;
}) {
    return (
        <Link href={href} onClick={onNavigate} title={isCollapsed ? label : undefined}
            data-onboarding={dataOnboarding}
            className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-semibold transition-all",
                isCollapsed && "justify-center px-0 py-3",
                active ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            )}>
            {icon}
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );
}