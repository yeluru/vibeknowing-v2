"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Folder,
    FileText,
    ChevronRight,
    ChevronDown,
    Plus,
    Home,
    MoreHorizontal,
    Trash2,
    Layers,
    Palette,
    Sparkles,
    Search,
    Zap,
    RefreshCw
} from "lucide-react";
import { categoriesApi, projectsApi, Category, Project, API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EditableTitle } from '@/components/ui/EditableTitle';

interface SidebarProps {
    onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
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
    const [sidebarWidth, setSidebarWidth] = useState(288);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            if (newWidth >= 200 && newWidth <= 480) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        loadData();

        const handleRefresh = () => {
            console.log('Sidebar received refresh-sidebar event');
            loadData();
        };
        window.addEventListener('refresh-sidebar', handleRefresh);

        // Close dropdown when clicking outside
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('refresh-sidebar', handleRefresh);
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const handleMoveProject = async (projectId: string, categoryId: string | null) => {
        try {
            console.log('Moving project:', projectId, 'to category:', categoryId);
            await projectsApi.updateCategory(projectId, categoryId);
            console.log('Move successful, reloading data...');

            // Force reload by fetching fresh data
            const [cats, projs] = await Promise.all([
                categoriesApi.list(),
                projectsApi.list()
            ]);

            console.log('Fetched categories:', cats.length, 'projects:', projs.length);
            console.log('Projects:', projs.map(p => ({ id: p.id, title: p.title, category_id: p.category_id })));

            setCategories(cats);
            setProjects(projs);
            setRefreshKey(prev => prev + 1); // Force re-render
            setActiveDropdown(null);

            console.log('State updated successfully');
        } catch (error) {
            console.error("Failed to move project:", error);
            alert(`Failed to move project: ${error}`);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return;
        }

        try {
            await projectsApi.delete(projectId);

            // Force reload
            const [cats, projs] = await Promise.all([
                categoriesApi.list(),
                projectsApi.list()
            ]);
            setCategories(cats);
            setProjects(projs);
            setRefreshKey(prev => prev + 1);
            setActiveDropdown(null);
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("Failed to delete project");
        }
    };

    const loadData = async () => {
        try {
            const [cats, projs] = await Promise.all([
                categoriesApi.list(),
                projectsApi.list()
            ]);
            setCategories(cats);
            setProjects(projs);
        } catch (error) {
            console.error("Failed to load sidebar data:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpanded(newExpanded);
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            await categoriesApi.create(newCategoryName);
            setNewCategoryName("");
            setIsCreating(false);
            loadData();
        } catch (error) {
            console.error("Failed to create category:", error);
        }
    };

    const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this category? Projects will be moved to Uncategorized.")) return;

        try {
            await categoriesApi.delete(id);
            loadData();
        } catch (error) {
            console.error("Failed to delete category:", error);
        }
    };

    const getCategoryProjects = (categoryId: string | null) => {
        let filtered = projects.filter(p => p.category_id === categoryId);
        if (searchQuery.trim()) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return filtered;
    };

    const filteredCategories = searchQuery.trim()
        ? categories.filter(cat =>
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getCategoryProjects(cat.id).length > 0
        )
        : categories;

    const uncategorizedProjects = getCategoryProjects(null);
    const filteredUncategorized = searchQuery.trim()
        ? uncategorizedProjects.filter(p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : uncategorizedProjects;

    const handleUpdateTitle = async (projectId: string, newTitle: string) => {
        try {
            const response = await fetch(`${API_BASE}/sources/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            if (response.ok) {
                // Dispatch event to update other components
                window.dispatchEvent(new Event('refresh-sidebar'));
            }
        } catch (error) {
            console.error("Failed to update title:", error);
        }
    };

    const renderProjectItem = (project: Project) => (
        <div
            key={project.id}
            className={cn(
                "group/project relative flex items-center transition-opacity duration-200",
                draggedProjectId === project.id ? "opacity-50" : "opacity-100"
            )}
            data-project-id={project.id}
            draggable
            onDragStart={(e) => {
                setDraggedProjectId(project.id);
                e.dataTransfer.effectAllowed = "move";
                // Set a custom drag image if needed, or let browser handle it
            }}
            onDragEnd={() => {
                setDraggedProjectId(null);
            }}
        >
            <Link
                href={project.first_source_id ? `/source/${project.first_source_id}` : '#'}
                onClick={onNavigate}
                className={cn(
                    "flex-1 block px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 dark:hover:from-slate-700 hover:to-purple-50/30 dark:hover:to-purple-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-all duration-300 pr-10 font-medium relative overflow-hidden group/link",
                    project.first_source_id && pathname === `/source/${project.first_source_id}` && "bg-gradient-to-r from-indigo-50 dark:from-indigo-900/30 to-purple-50/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 font-semibold shadow-md border border-indigo-200 dark:border-indigo-800/50"
                )}
            >
                <div className="relative z-10 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <EditableTitle
                            initialValue={project.title}
                            onSave={(val) => handleUpdateTitle(project.id, val)}
                            className="w-full"
                            editOnIconOnly={true}
                        />
                    </div>
                </div>
                {project.first_source_id && pathname === `/source/${project.first_source_id}` && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"></div>
                )}
            </Link>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Three dots clicked for project:', project.id);
                    setActiveDropdown(activeDropdown === project.id ? null : project.id);
                }}
                className="absolute right-1 z-20 p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg opacity-0 group-hover/project:opacity-100 transition-all duration-200 backdrop-blur-sm shadow-sm"
            >
                <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {activeDropdown === project.id && (
                <div
                    className="absolute left-0 top-full mt-2 z-50 w-56 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 py-2 transition-colors duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 mb-1">
                        Move to...
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('Clicking Uncategorized');
                            handleMoveProject(project.id, null);
                        }}
                        className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors",
                            !project.category_id ? "text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/30" : "text-gray-700 dark:text-slate-300"
                        )}
                    >
                        <Folder className="h-3.5 w-3.5" />
                        Uncategorized
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('Clicking category:', cat.name);
                                handleMoveProject(project.id, cat.id);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors",
                                project.category_id === cat.id ? "text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/30" : "text-gray-700 dark:text-slate-300"
                            )}
                        >
                            <Folder className="h-3.5 w-3.5" />
                            {cat.name}
                        </button>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Project
                        </button>
                    </div>
                </div>
            )}
        </div>
    );


    return (
        <aside
            ref={sidebarRef}
            style={{ width: `${sidebarWidth}px` }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col h-full shadow-2xl transition-colors duration-300 relative overflow-hidden group/sidebar"
        >
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 rounded-full blur-3xl"></div>
            </div>

            <div className="relative p-5 border-b border-slate-200/60 dark:border-slate-700/60 space-y-3 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 transition-colors duration-300">
                <Link href="/" onClick={onNavigate} className="flex items-center gap-3 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 mb-4 group">
                    <div className="relative p-2.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-indigo-500/50 group-hover:scale-110 transition-all duration-300 hover-lift">
                        <Home className="h-5 w-5 text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-2xl gradient-text tracking-tight">VibeKnowing</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AI Learning Suite</span>
                    </div>
                </Link>

                {/* Search Bar with Refresh Button */}
                <div className="relative mb-2 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200"
                        />
                    </div>
                    <button
                        onClick={() => loadData()}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                        title="Refresh projects"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>

                <Link
                    href="/studio"
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 hover-lift relative overflow-hidden group/studio",
                        pathname === '/studio'
                            ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30"
                            : "text-slate-600 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 dark:hover:from-slate-700 hover:to-indigo-50/30 dark:hover:to-indigo-900/30 hover:text-purple-600 dark:hover:text-purple-400"
                    )}
                >
                    <div className={cn(
                        "relative z-10 flex items-center gap-2.5",
                        pathname === '/studio' && "text-white"
                    )}>
                        <Palette className="h-4 w-4" />
                        <span>Content Studio</span>
                    </div>
                    {pathname === '/studio' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover/studio:opacity-100 transition-opacity duration-300"></div>
                    )}
                </Link>
            </div>

            <div className="relative flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" key={refreshKey}>
                {/* Stats Summary */}
                {!loading && (
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                <Zap className="h-3.5 w-3.5" />
                                <span className="font-semibold">Total Projects</span>
                            </div>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full">{projects.length}</span>
                        </div>
                    </div>
                )}

                {/* Uncategorized Section */}
                {filteredUncategorized.length > 0 && (
                    <div className="mb-2">
                        <button
                            onClick={() => toggleExpand("uncategorized")}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverCategoryId("uncategorized");
                            }}
                            onDragLeave={() => setDragOverCategoryId(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedProjectId) {
                                    handleMoveProject(draggedProjectId, null);
                                    setDragOverCategoryId(null);
                                }
                            }}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-50 dark:hover:from-slate-700 hover:to-indigo-50/30 dark:hover:to-indigo-900/30 rounded-xl transition-all duration-300 group hover-lift relative overflow-hidden",
                                dragOverCategoryId === "uncategorized" && "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500/50"
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10 flex items-center gap-2.5 w-full">
                                {expanded.has("uncategorized") ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 transform group-hover:scale-110" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 transform group-hover:translate-x-0.5" />
                                )}
                                <Folder className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 transform group-hover:scale-110" />
                                <span className="flex-1 text-left">Uncategorized</span>
                                <span className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 shadow-sm group-hover:shadow-md">{filteredUncategorized.length}</span>
                            </div>
                        </button>

                        {expanded.has("uncategorized") && (
                            <div className="ml-4 mt-1.5 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-800/50 pl-3 animate-in slide-in-from-top-2 duration-200">
                                {filteredUncategorized.map(renderProjectItem)}
                            </div>
                        )}
                    </div>
                )}

                {/* Categories */}
                {filteredCategories.map(category => {
                    const catProjects = getCategoryProjects(category.id);
                    return (
                        <div key={category.id} className="mb-2">
                            <div className="flex items-center group/item">
                                <button
                                    onClick={() => toggleExpand(category.id)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverCategoryId(category.id);
                                    }}
                                    onDragLeave={() => setDragOverCategoryId(null)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedProjectId) {
                                            handleMoveProject(draggedProjectId, category.id);
                                            setDragOverCategoryId(null);
                                        }
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-50 dark:hover:from-slate-700 hover:to-indigo-50/30 dark:hover:to-indigo-900/30 rounded-xl transition-all duration-300 group hover-lift relative overflow-hidden",
                                        dragOverCategoryId === category.id && "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500/50"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 flex items-center gap-2.5 w-full">
                                        {expanded.has(category.id) ? (
                                            <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 transform group-hover:scale-110" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 transform group-hover:translate-x-0.5" />
                                        )}
                                        <Folder className="h-4 w-4 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-all duration-300 transform group-hover:scale-110" />
                                        <span className="truncate flex-1 text-left">{category.name}</span>
                                        <span className="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 shadow-sm group-hover:shadow-md">{catProjects.length}</span>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteCategory(category.id, e)}
                                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all duration-200 opacity-0 group-hover/item:opacity-100 transform group-hover/item:scale-110"
                                    title="Delete Category"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {expanded.has(category.id) && (
                                <div className="ml-4 mt-1.5 space-y-1 border-l-2 border-indigo-200 dark:border-indigo-800/50 pl-3 animate-in slide-in-from-top-2 duration-200">
                                    {catProjects.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                            No projects
                                        </div>
                                    ) : (
                                        catProjects.map(renderProjectItem)
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* New Category Input */}
                {isCreating ? (
                    <form onSubmit={handleCreateCategory} className="px-2 mt-2">
                        <input
                            autoFocus
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onBlur={() => !newCategoryName && setIsCreating(false)}
                            placeholder="Category name..."
                            className="w-full px-2 py-1 text-sm border border-purple-200 dark:border-purple-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 mt-3 text-sm text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-r hover:from-purple-50 dark:hover:from-purple-900/30 hover:to-indigo-50/30 dark:hover:to-indigo-900/30 rounded-lg transition-all duration-300 border border-dashed border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 flex items-center gap-2">
                            <Plus className="h-4 w-4 transform group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-medium">New Category</span>
                        </div>
                    </button>
                )}
            </div>


            {/* Resize Handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-50"
                onMouseDown={startResizing}
            />
        </aside >
    );
}
