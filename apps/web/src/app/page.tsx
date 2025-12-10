"use client";

import { useEffect, useState } from "react";
import { UrlInput } from "@/components/ingest/UrlInput";
import {
  FileText, Youtube, Globe, Sparkles, Brain, Zap, Palette,
  Clock, ArrowRight, Target, Search, Mic, Share2, Video, Folder,
  Layers, PenTool, Layout, MoreHorizontal, Trash2, RefreshCcw
} from "lucide-react";
import { projectsApi, Project, categoriesApi, Category } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // New State
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-sidebar', handleRefresh);
    // Close dropdown on outside click
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('refresh-sidebar', handleRefresh);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    // ... (existing loadData)
    try {
      const [projs, cats] = await Promise.all([
        projectsApi.list(),
        categoriesApi.list()
      ]);
      setProjects(projs);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveProject = async (projectId: string, categoryId: string | null) => {
    // 1. Optimistic Update (Instant Feedback)
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, category_id: categoryId } : p
    ));
    setActiveDropdown(null);

    try {
      // 2. API Call
      await projectsApi.updateCategory(projectId, categoryId);

      // 3. Buffered Refresh (Wait for DB to settle, then fetch fresh to fill slots)
      setTimeout(() => {
        loadData();
        window.dispatchEvent(new Event('refresh-sidebar'));
      }, 300);
    } catch (error) {
      console.error("Failed to move project:", error);
      loadData(); // Revert on error
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    // 1. Optimistic Update
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setActiveDropdown(null);

    try {
      // 2. API Call
      await projectsApi.delete(projectId);

      // 3. Buffered Refresh
      setTimeout(() => {
        loadData();
        window.dispatchEvent(new Event('refresh-sidebar'));
      }, 300);
    } catch (error) {
      console.error("Failed to delete project:", error);
      loadData(); // Revert on error
    }
  };


  // Filter projects: Max 5 per category, grouped for display
  const getGroupedProjects = () => {
    const grouped: Record<string, Project[]> = {};
    projects.forEach(p => {
      const catId = p.category_id || 'uncategorized';
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(p);
    });

    const groups: { id: string; name: string; projects: Project[] }[] = [];

    // 1. Uncategorized (Always First)
    if (grouped['uncategorized'] && grouped['uncategorized'].length > 0) {
      const sorted = grouped['uncategorized'].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groups.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        totalCount: sorted.length,
        projects: sorted.slice(0, 5)
      });
    }

    // 2. Other Categories
    categories.forEach(cat => {
      if (grouped[cat.id] && grouped[cat.id].length > 0) {
        const sorted = grouped[cat.id].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        groups.push({
          id: cat.id,
          name: cat.name,
          totalCount: sorted.length,
          projects: sorted.slice(0, 5)
        });
      }
    });

    return groups;
  };

  const projectGroups = getGroupedProjects();


  const getCategoryName = (id: string | null) => {
    if (!id) return "Uncategorized";
    return categories.find(c => c.id === id)?.name || "Uncategorized";
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 overflow-hidden border border-slate-200 rounded-[3rem] max-w-6xl mx-auto mt-4 bg-white/50 backdrop-blur-3xl">
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-[80%] mx-auto text-center space-y-8"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-900/50 backdrop-blur-sm shadow-sm group hover:border-indigo-300 transition-colors cursor-default">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">The OS for Learning</span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Master Any Topic. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 animate-gradient bg-300% leading-[1.4] pb-4">
              In Record Time.
            </span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            The AI workspace that turns your YouTube videos, PDFs, and web pages into deep understanding.
            Generate flashcards, quizzes, and essays instantly.
          </motion.p>

          <motion.div variants={fadeInUp} className="w-full mx-auto pt-4 relative z-20">
            {/* Redesigned Input Box - Full Width, No Outer Wrapper Styling */}
            <div className="transform hover:scale-[1.01] transition-transform duration-300">
              <UrlInput />
            </div>

            {/* Expanded Feature List */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-900 dark:text-white font-semibold">
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><Youtube className="h-4 w-4" /> YouTube</span>
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><Globe className="h-4 w-4" /> Websites</span>
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><FileText className="h-4 w-4" /> PDFs & Docs</span>
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><Mic className="h-4 w-4" /> Audio</span>
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><Video className="h-4 w-4" /> TED Talks</span>
              <span className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default"><Share2 className="h-4 w-4" /> Social Threads</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Grid (2x2 Equal Size) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="max-w-6xl mx-auto px-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Deep Understanding */}
          <motion.div variants={fadeInUp} className="group relative p-8 h-[320px] rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Deep Understanding</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Don't just read. Understand. Our AI analyzes your sources to create a personalized knowledge base.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Active Recall */}
          <motion.div variants={fadeInUp} className="group relative p-8 h-[320px] rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="h-20 w-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Active Recall</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Auto-generated flashcards and spaced repetition to lock knowledge into your long-term memory.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Smart Quizzes */}
          <motion.div variants={fadeInUp} className="group relative p-8 h-[320px] rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="h-20 w-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 text-amber-600 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart Quizzes</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Test yourself before the exam. AI generates relevant, difficult questions from your study materials.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Creation Studio */}
          <motion.div variants={fadeInUp} className="group relative p-8 h-[320px] rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="h-20 w-20 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                <Palette className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Creation Studio</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Turn insights into output. Generate blog posts, social threads, and soon—AI-produced audio podcasts.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Learning Goals Section */}
      {!loading && projects.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-4 pt-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Your Learning Goals</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Pick up where you left off</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await loadData();
                  setIsRefreshing(false);
                }}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all"
                title="Refresh Projects"
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search goals..." className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>


          <div className="space-y-12">
            {projectGroups.map((group) => (
              <div key={group.id}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 px-1">
                  <Folder className="h-5 w-5 text-indigo-500" />
                  {group.name}
                  <span className="ml-2 text-sm font-medium text-slate-400">
                    ({group.projects.length} / {group.totalCount})
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {group.projects.map((project, i) => {
                    // Alternating Pastel Colors
                    const isViolet = i % 2 === 0;
                    const bgColorClass = isViolet ? 'bg-violet-100 border border-violet-200' : 'bg-emerald-100 border border-emerald-200';
                    const themeColorClass = isViolet ? 'text-violet-600' : 'text-emerald-600';
                    const categoryName = group.name;

                    return (
                      <div key={project.id} className="relative group/card">
                        <Link href={project.first_source_id ? `/source/${project.first_source_id}` : '#'}>
                          <motion.div
                            whileHover={{ y: -8, scale: 1.02 }}
                            className={cn(
                              "aspect-square rounded-3xl p-6 relative overflow-visible group shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full z-0",
                              bgColorClass
                            )}
                          >
                            {/* Background Decor - Pastel Style (Subtle blobs) */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/40 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                            {/* Valid Header Icon */}
                            <div className="relative z-10 flex justify-between items-start pointer-events-none">
                              <div className={cn("w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm", themeColorClass)}>
                                {project.type === 'youtube' && <Youtube className="h-5 w-5" />}
                                {project.type === 'pdf' && <FileText className="h-5 w-5" />}
                                {project.type === 'web' && <Globe className="h-5 w-5" />}
                              </div>
                              {project.status === 'Ready' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title="Active"></div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="relative z-10 pointer-events-none">
                              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {categoryName}
                              </div>
                              <h3 className="text-slate-900 font-bold text-lg leading-snug line-clamp-3 mb-2">
                                {project.title}
                              </h3>
                            </div>

                            {/* Footer */}
                            <div className="relative z-10 pt-4 border-t border-slate-200/60 flex items-center justify-between text-slate-500 text-xs pointer-events-none">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(project.created_at).toLocaleDateString()}
                              </span>
                              <ArrowRight className={cn("h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300", themeColorClass)} />
                            </div>
                          </motion.div>
                        </Link>

                        {/* Move/Options Menu Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === project.id ? null : project.id);
                          }}
                          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-all opacity-0 group-hover/card:opacity-100"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeDropdown === project.id && (
                          <div
                            className="absolute right-4 top-12 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                              Move to...
                            </div>
                            <button
                              onClick={() => handleMoveProject(project.id, null)}
                              className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors text-slate-700",
                                !project.category_id && "text-purple-600 bg-purple-50"
                              )}
                            >
                              <Folder className="h-3.5 w-3.5" />
                              Uncategorized
                            </button>
                            {categories.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => handleMoveProject(project.id, cat.id)}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors text-slate-700",
                                  project.category_id === cat.id && "text-purple-600 bg-purple-50"
                                )}
                              >
                                <Folder className="h-3.5 w-3.5" />
                                {cat.name}
                              </button>
                            ))}
                            <div className="border-t border-slate-100 mt-1 pt-1">
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty State / CTA */}
      {!loading && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto text-center py-20"
        >
          <div className="w-16 h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Start Your First Goal</h3>
          <p className="text-slate-500 dark:text-slate-400">
            Paste a URL above to create your first Learning Goal. <br />
            Your future self will thank you.
          </p>
        </motion.div>
      )}
    </div>
  );
}
