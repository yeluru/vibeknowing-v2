"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Palette
} from "lucide-react";
import { categoriesApi, projectsApi, Category, Project } from "@/lib/api";
import { cn } from "@/lib/utils";

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

    useEffect(() => {
        loadData();

        const handleRefresh = () => loadData();
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
        return projects.filter(p => p.category_id === categoryId);
    };

    const renderProjectItem = (project: Project) => (
        <div key={project.id} className="group/project relative flex items-center" data-project-id={project.id}>
            <Link
                href={project.first_source_id ? `/source/${project.first_source_id}` : '#'}
                onClick={onNavigate}
                className={cn(
                    "flex-1 block px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-purple-600 truncate transition-colors pr-8",
                    project.first_source_id && pathname === `/source/${project.first_source_id}` && "bg-purple-50 text-purple-700 font-medium"
                )}
            >
                {project.title}
            </Link>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Three dots clicked for project:', project.id);
                    setActiveDropdown(activeDropdown === project.id ? null : project.id);
                }}
                className="absolute right-1 p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover/project:opacity-100 transition-opacity"
            >
                <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {activeDropdown === project.id && (
                <div
                    className="absolute left-0 top-full mt-1 z-50 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
                        Move to...
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('Clicking Uncategorized');
                            handleMoveProject(project.id, null);
                        }}
                        className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2",
                            !project.category_id ? "text-purple-600 font-medium bg-purple-50" : "text-gray-700"
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
                                "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2",
                                project.category_id === cat.id ? "text-purple-600 font-medium bg-purple-50" : "text-gray-700"
                            )}
                        >
                            <Folder className="h-3.5 w-3.5" />
                            {cat.name}
                        </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Project
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const uncategorizedProjects = getCategoryProjects(null);

    return (
        <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200 flex flex-col h-full shadow-xl">
            <div className="p-4 border-b border-slate-200 space-y-1">
                <Link href="/" onClick={onNavigate} className="flex items-center gap-3 text-slate-900 hover:text-blue-600 transition-all duration-200 mb-4 group">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-200">
                        <Home className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">VibeKnowing</span>
                </Link>

                <Link
                    href="/studio"
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        pathname === '/studio'
                            ? "bg-purple-50 text-purple-600 shadow-sm"
                            : "text-slate-600 hover:bg-slate-50 hover:text-purple-600"
                    )}
                >
                    <Palette className="h-4 w-4" />
                    Content Studio
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1" key={refreshKey}>
                {/* Uncategorized Section */}
                {uncategorizedProjects.length > 0 && (
                    <div className="mb-2">
                        <button
                            onClick={() => toggleExpand("uncategorized")}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors group"
                        >
                            {expanded.has("uncategorized") ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <Folder className="h-4 w-4 text-gray-400 group-hover:text-purple-500" />
                            <span>Uncategorized</span>
                            <span className="ml-auto text-xs text-gray-400">{uncategorizedProjects.length}</span>
                        </button>

                        {expanded.has("uncategorized") && (
                            <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-100 pl-2">
                                {uncategorizedProjects.map(renderProjectItem)}
                            </div>
                        )}
                    </div>
                )}

                {/* Categories */}
                {categories.map(category => {
                    const catProjects = getCategoryProjects(category.id);
                    return (
                        <div key={category.id} className="mb-2">
                            <div className="flex items-center group/item">
                                <button
                                    onClick={() => toggleExpand(category.id)}
                                    className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors group"
                                >
                                    {expanded.has(category.id) ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                    <Folder className="h-4 w-4 text-purple-500" />
                                    <span className="truncate">{category.name}</span>
                                    <span className="ml-auto text-xs text-gray-400">{catProjects.length}</span>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteCategory(category.id, e)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-all"
                                    title="Delete Category"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {expanded.has(category.id) && (
                                <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-100 pl-2">
                                    {catProjects.length === 0 ? (
                                        <p className="px-2 py-1 text-xs text-gray-400 italic">No projects</p>
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
                            className="w-full px-2 py-1 text-sm border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center gap-2 px-2 py-2 mt-2 text-sm text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors border border-dashed border-gray-200 hover:border-purple-200"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Category</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
