"use client";

import { useEffect, useState } from "react";
import { UrlInput } from "@/components/ingest/UrlInput";
import { Logo } from "@/components/Logo";
import {
  FileText, Youtube, Globe, Sparkles, Brain, Zap, Palette,
  Clock, ArrowRight, Target, Search, Mic, Share2, Video, Folder,
  Layers, PenTool, MoreHorizontal, Trash2, RefreshCcw,
  Twitter, Linkedin, Github, Instagram, Music, MessageCircle, File
} from "lucide-react";
import { toast } from "sonner";
import { projectsApi, Project, categoriesApi, Category } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // New State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isAuthenticated } = useAuth();

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
  }, [isAuthenticated]); // Re-run when auth state changes

  const loadData = async () => {
    if (!isAuthenticated) {
      const guestProjects = JSON.parse(localStorage.getItem('guest_projects') || '[]');
      setProjects(guestProjects);
      setCategories([]);
      setLoading(false);
      return;
    }
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

  const executeDeleteProject = async (projectId: string) => {
    // 1. Optimistic Update (Immediate Feedback)
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setActiveDropdown(null);

    // GUEST MODE HANDLER
    if (!isAuthenticated) {
      const current = JSON.parse(localStorage.getItem('guest_projects') || '[]');
      // Use loose comparison or string conversion to be safe
      const updated = current.filter((p: Project) => String(p.id) !== String(projectId));
      localStorage.setItem('guest_projects', JSON.stringify(updated));
      window.dispatchEvent(new Event('refresh-sidebar'));
      toast.success("Project deleted");
      return;
    }

    try {
      // 2. API Call (Auth Users Only)
      await projectsApi.delete(projectId);
      toast.success("Project deleted");

      // 3. Buffered Refresh
      setTimeout(() => {
        loadData();
        window.dispatchEvent(new Event('refresh-sidebar'));
      }, 300);
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
      loadData(); // Revert on error
    }
  };

  const handleDeleteProject = (projectId: string) => {
    toast("Are you sure you want to delete this project?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => executeDeleteProject(projectId),
      },
    });
  };


  // Filter projects: Max 5 per category, grouped for display
  const getGroupedProjects = () => {
    const grouped: Record<string, Project[]> = {};
    projects.forEach(p => {
      const catId = p.category_id || 'uncategorized';
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(p);
    });

    const groups: { id: string; name: string; totalCount: number; projects: Project[] }[] = [];

    // 1. Uncategorized (Always First)
    if (grouped['uncategorized'] && grouped['uncategorized'].length > 0) {
      const sorted = grouped['uncategorized'].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groups.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        totalCount: sorted.length,
        projects: sorted.slice(0, 4)
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
          projects: sorted.slice(0, 4)
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
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
    <div className="space-y-16 pb-20 relative">
      <section className="vk-hero relative pt-6 pb-8 lg:pt-12 lg:pb-14 px-4 lg:px-8 overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] max-w-6xl mx-auto mt-0 lg:mt-4">
        {/* Brand Logo - Inside Top Right */}
        <Logo className="absolute top-3 left-3 md:top-8 md:left-8 z-50 pointer-events-none scale-75 md:scale-100 origin-top-left" />

        {/* Desktop: move eyebrow to the top-right corner */}
        <div className="hidden md:block absolute top-8 right-8 z-40">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full vk-eyebrow text-slate-700 dark:text-slate-200"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold">The OS for Learning</span>
          </motion.div>
        </div>

        {/* Subtle grid + glow for “industry SaaS” feel */}
        <div className="absolute inset-0 -z-10 vk-subtle-grid opacity-60" />

        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="vk-shell">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
            {/* Left: “product preview” panel (purely visual) */}
            <motion.div variants={fadeInUp} className="order-2 md:order-1 md:col-span-5 md:justify-self-start md:self-start md:pt-14">
              <div className="vk-card w-full max-w-[420px] rounded-3xl p-6 lg:p-7 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">How it works</div>
                  <div className="vk-pill px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">~ 60 seconds</div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="vk-card rounded-2xl p-4 bg-white/70 dark:bg-slate-950/30">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">1</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Drop a link or file</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">YouTube, websites, PDFs, docs, audio.</div>
                      </div>
                    </div>
                  </div>

                  <div className="vk-card rounded-2xl p-4 bg-white/70 dark:bg-slate-950/30">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">2</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Get a knowledge workspace</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Chat, summaries, concepts, and structure.</div>
                      </div>
                    </div>
                  </div>

                  <div className="vk-card rounded-2xl p-4 bg-white/70 dark:bg-slate-950/30">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 flex items-center justify-center font-bold">3</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Practice + create</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Flashcards, quizzes, and studio tools.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="vk-card rounded-2xl p-4 bg-white/60 dark:bg-slate-950/25">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outputs</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Flashcards · Quizzes · Notes</div>
                  </div>
                  <div className="vk-card rounded-2xl p-4 bg-white/60 dark:bg-slate-950/25">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Best for</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Individuals &amp; Teams · Learn fast. Grow.</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: copy + CTA */}
            <div className="order-1 md:order-2 md:col-span-7 text-center md:text-left">
              {/* Mobile: keep eyebrow in-flow */}
              <motion.div variants={fadeInUp} className="md:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full vk-eyebrow text-slate-700 dark:text-slate-200 mt-8">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold">The OS for Learning</span>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="mt-5 text-4xl sm:text-6xl md:text-6xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.04] text-center md:text-center">
                Master any topic.
                <span className="block mt-2 vk-gradient-text">In record time.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed text-center md:text-center">
                Turn YouTube videos, PDFs, and web pages into deep understanding. Generate flashcards, quizzes, and essays instantly.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-7 relative z-20">
                <div className="transform hover:scale-[1.01] transition-transform duration-300">
                  <UrlInput />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-200 font-semibold">
                  <span className="inline-flex items-center gap-1.5"><Youtube className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> YouTube</span>
                  <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4 text-sky-600 dark:text-sky-300" /> Websites</span>
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" /> PDFs & Docs</span>
                  <span className="inline-flex items-center gap-1.5"><Mic className="h-4 w-4 text-cyan-600 dark:text-cyan-300" /> Audio</span>
                  <span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> TED</span>
                  <span className="inline-flex items-center gap-1.5"><Share2 className="h-4 w-4 text-sky-600 dark:text-sky-300" /> Social</span>
                </div>
              </motion.div>
            </div>
          </div>
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
          <motion.div variants={fadeInUp} className="vk-card group relative p-8 h-full rounded-3xl bg-white/65 dark:bg-slate-950/25 backdrop-blur-xl hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-5 mb-5">
                <div className="h-16 w-16 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl flex items-center justify-center text-indigo-700 dark:text-indigo-300 group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Brain className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Deep Understanding</h3>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                  Stop drowning in information. VibeKnowing doesn't just summarize; it deconstructs complex topics into their core concepts. From 3-hour lectures to dense research papers, our AI extracts the signal from the noise, creating a structured knowledge base you can actually master in minutes.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Active Recall */}
          <motion.div variants={fadeInUp} className="vk-card group relative p-8 h-full rounded-3xl bg-white/65 dark:bg-slate-950/25 backdrop-blur-xl hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-5 mb-5">
                <div className="h-16 w-16 bg-sky-500/10 dark:bg-sky-400/10 rounded-2xl flex items-center justify-center text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Active Recall</h3>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                  Forget the forgetting curve. Our system automatically generates scientifically-backed flashcards, scheduling reviews at the exact moment you're about to forget. It's not just studying; it's downloading knowledge directly into your long-term memory with maximum efficiency.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Smart Quizzes */}
          <motion.div variants={fadeInUp} className="vk-card group relative p-8 h-full rounded-3xl bg-white/65 dark:bg-slate-950/25 backdrop-blur-xl hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-5 mb-5">
                <div className="h-16 w-16 bg-cyan-500/10 dark:bg-cyan-400/10 rounded-2xl flex items-center justify-center text-cyan-800 dark:text-cyan-300 group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Smart Quizzes</h3>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                  Walk into every exam with confidence. VibeKnowing analyzes your material to predict the toughest questions. It generates adaptive quizzes that pinpoint your weak spots and provide instant feedback. Turn passive reading into active mastery and be battle-ready for any test.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Creation Studio */}
          <motion.div variants={fadeInUp} className="vk-card group relative p-8 h-full rounded-3xl bg-white/65 dark:bg-slate-950/25 backdrop-blur-xl hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-5 mb-5">
                <div className="h-16 w-16 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl flex items-center justify-center text-indigo-700 dark:text-indigo-300 group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Palette className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Creation Studio</h3>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                  Transform from learner to creator. Don't let insights gather dust—instantly remix your knowledge base into engaging blog posts, viral social threads, or comprehensive study guides. Coming soon: Turn your notes into studio-quality audio podcasts to share with the world.
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
          className="max-w-6xl mx-auto px-4 pt-4 lg:pt-8"
        >
          <div className="vk-card bg-white/55 dark:bg-slate-950/20 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 rounded-3xl p-5 sm:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Your Learning Goals</h2>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm lg:text-base">Pick up where you left off</p>
                </div>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await loadData();
                    setIsRefreshing(false);
                  }}
                  className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 hover:bg-white text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all sm:hidden"
                  title="Refresh Projects"
                >
                  <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Desktop Refresh Button */}
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await loadData();
                    setIsRefreshing(false);
                  }}
                  className="hidden sm:block p-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 hover:bg-white text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all"
                  title="Refresh Projects"
                >
                  <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </button>
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search goals..."
                    className="vk-input w-full sm:w-72 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {group.projects.map((project, i) => {
                    // Option A: neutral cards with indigo/sky accent
                    const isIndigo = i % 2 === 0;
                    const bgColorClass = "vk-card bg-white/70 dark:bg-slate-950/20 border border-slate-200/70 dark:border-slate-800";
                    const themeColorClass = isIndigo ? 'text-indigo-700 dark:text-indigo-300' : 'text-sky-700 dark:text-sky-300';
                    const categoryName = group.name;

                    return (
                      <div key={project.id} className="relative group/card">
                        <Link href={project.first_source_id ? `/source/${project.first_source_id}` : '#'}>
                          <motion.div
                            whileHover={{ y: -8, scale: 1.02 }}
                            className={cn(
                              "h-72 rounded-3xl p-6 relative overflow-visible group shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between z-0",
                              bgColorClass
                            )}
                          >
                            {/* Background Decor (subtle v2 glow) */}
                            <div className={cn("absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none", isIndigo ? "bg-indigo-500/10" : "bg-sky-500/10")} />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                            {/* Valid Header Icon */}
                            <div className="relative z-10 flex justify-end items-start pointer-events-none">
                              {project.status === 'Ready' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title="Active"></div>
                              )}
                            </div>

                            <div className="relative z-10 pointer-events-none">
                              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {categoryName}
                              </div>
                              <h3 className="text-slate-900 font-bold text-base leading-snug line-clamp-2 mb-2">
                                {project.title}
                              </h3>
                              {/* Enhanced Details: URL & Preview */}
                              {project.first_source_url && (
                                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-2 truncate opacity-80">
                                  {project.first_source_url.replace(/^https?:\/\/(www\.)?/, '')}
                                </div>
                              )}
                              {project.first_source_preview && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                  {project.first_source_preview}
                                </p>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="relative z-10 pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs pointer-events-none">
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
