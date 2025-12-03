"use client";

import { useState, useEffect } from "react";
import { Loader2, Palette, Share2, GitGraph, FilePenLine, Layers, Trash2, Folder, ChevronLeft } from "lucide-react";
import { projectsApi, categoriesApi, Project, Category } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";

export default function StudioPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [projs, cats] = await Promise.all([
                projectsApi.list(),
                categoriesApi.list()
            ]);
            setProjects(projs);
            setCategories(cats);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

        try {
            await projectsApi.delete(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
            toast.success("Project deleted successfully");
        } catch (error) {
            console.error("Failed to delete project:", error);
            toast.error("Failed to delete project");
        }
    };

    const getCategoryProjects = (categoryId: string | null) => {
        let filtered = projects.filter(p => {
            if (categoryId === "uncategorized") {
                return !p.category_id;
            }
            return p.category_id === categoryId;
        });

        // Apply search filter if query exists
        if (searchQuery.trim()) {
            filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return filtered;
    };

    const uncategorizedCount = projects.filter(p => !p.category_id).length;

    // If a category is selected, show projects in that category
    if (selectedCategory !== null) {
        const categoryProjects = getCategoryProjects(selectedCategory);
        const categoryName = selectedCategory === "uncategorized"
            ? "Uncategorized"
            : categories.find(c => c.id === selectedCategory)?.name || "Category";

        return (
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                        title="Back to categories"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 flex flex-col space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{categoryName}</h1>
                        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{categoryProjects.length} project{categoryProjects.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xl">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects in this category..."
                        className="w-full px-4 py-2.5 pl-10 text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-colors duration-300"
                    />
                    <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {categoryProjects.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                        <Palette className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No projects in this category</h3>
                        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Create a project to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {categoryProjects.map((project) => (
                            <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 group flex flex-col relative">
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDelete(e, project.id)}
                                        className="p-2 bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 dark:bg-red-900/30 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-200"
                                        title="Delete Project"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 transition-colors">
                                        {project.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6 line-clamp-2">
                                        {project.description || "No description available"}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Quick Actions</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <Link
                                            href={project.first_source_id ? `/source/${project.first_source_id}?tab=flashcards` : '#'}
                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:bg-orange-900/30 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors group/btn"
                                            title="Flashcards"
                                        >
                                            <Layers className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-medium">Flashcards</span>
                                        </Link>
                                        <Link
                                            href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=social` : '#'}
                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 transition-colors group/btn"
                                            title="Social Media"
                                        >
                                            <Share2 className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-medium">Social</span>
                                        </Link>
                                        <Link
                                            href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=diagram` : '#'}
                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/30 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 dark:text-purple-400 transition-colors group/btn"
                                            title="Diagrams"
                                        >
                                            <GitGraph className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-medium">Diagrams</span>
                                        </Link>
                                        <Link
                                            href={project.first_source_id ? `/source/${project.first_source_id}?tab=studio&tool=article` : '#'}
                                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:bg-emerald-900/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:text-emerald-400 transition-colors group/btn"
                                            title="Article Writer"
                                        >
                                            <FilePenLine className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-medium">Article</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Category selection view
    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Content Studio</h1>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a category to view your projects.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Uncategorized Category */}
                    {/* Uncategorized Category */}
                    <button
                        onClick={() => setSelectedCategory("uncategorized")}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 dark:border-slate-600 transition-all duration-200 group text-left"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 group-hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors">
                                <Folder className="h-8 w-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:text-slate-300 transition-colors">
                                    Uncategorized
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                    {uncategorizedCount} project{uncategorizedCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Regular Categories */}
                    {categories.map((category) => {
                        const count = getCategoryProjects(category.id).length;

                        return (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 group text-left"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 transition-colors">
                                        <Folder className="h-8 w-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 transition-colors">
                                            {category.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                            {count} project{count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {/* Empty state */}
                    {categories.length === 0 && uncategorizedCount === 0 && (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                            <Palette className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No projects yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Create a project to start using the Content Studio.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
