"use client";

import { useEffect, useState } from "react";
import { UrlInput } from "@/components/ingest/UrlInput";
import { Logo } from "@/components/Logo";
import {
  FileText, Youtube, Globe, Sparkles, Brain, Zap, Palette,
  Clock, ArrowRight, Target, Search, Mic, Share2, Video, Folder,
  Layers, PenTool, MoreHorizontal, Trash2, RefreshCcw,
  Twitter, Linkedin, Github, Instagram, Music, MessageCircle, File,
  BookOpen, FlaskConical, Lock, Server, CheckCircle2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { projectsApi, Project, categoriesApi, Category } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

// ─── animation presets ───────────────────────────────────────────────────────
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
const stagger: Variants = { visible: { transition: { staggerChildren: 0.09 } } };
const fadeInUp = fadeUp;
const staggerContainer = stagger;

// ─── live demo card data ──────────────────────────────────────────────────────
const DEMO_CARDS = [
  {
    id: "summary",
    label: "AI Summary",
    color: "from-indigo-500/20 to-indigo-600/10",
    border: "border-indigo-200/60 dark:border-indigo-700/40",
    icon: <Brain className="h-4 w-4 text-indigo-500" />,
    preview: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full animate-pulse" />
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-5/6 animate-pulse" />
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5 animate-pulse" />
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full animate-pulse" />
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 animate-pulse" />
      </div>
    ),
  },
  {
    id: "flashcard",
    label: "Flashcards",
    color: "from-sky-500/20 to-sky-600/10",
    border: "border-sky-200/60 dark:border-sky-700/40",
    icon: <BookOpen className="h-4 w-4 text-sky-500" />,
    preview: (
      <div className="space-y-2">
        {["What is the main concept?", "Key difference between X and Y?", "Define the process of Z"].map((q, i) => (
          <div key={i} className="flex items-start gap-2 bg-white/60 dark:bg-slate-900/40 rounded-lg p-2">
            <div className="h-4 w-4 rounded bg-sky-500/20 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{q}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "quiz",
    label: "Quiz",
    color: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-200/60 dark:border-violet-700/40",
    icon: <FlaskConical className="h-4 w-4 text-violet-500" />,
    preview: (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Which statement is correct?</p>
        {["Option A: The primary mechanism", "Option B: Secondary pathway", "Option C: Both A and B"].map((opt, i) => (
          <div key={i} className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border",
            i === 2
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-white/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300"
          )}>
            {i === 2 && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
            {i !== 2 && <div className="h-3 w-3 rounded-full border border-current flex-shrink-0" />}
            {opt}
          </div>
        ))}
      </div>
    ),
  },
];

const SOURCE_TYPES = [
  { icon: <Youtube className="h-4 w-4" />, label: "YouTube", color: "text-red-500" },
  { icon: <Globe className="h-4 w-4" />, label: "Websites", color: "text-sky-500" },
  { icon: <FileText className="h-4 w-4" />, label: "PDFs", color: "text-indigo-500" },
  { icon: <Mic className="h-4 w-4" />, label: "Audio", color: "text-violet-500" },
  { icon: <Video className="h-4 w-4" />, label: "Video", color: "text-emerald-500" },
  { icon: <File className="h-4 w-4" />, label: "Docs", color: "text-amber-500" },
];

const DIFFERENTIATORS = [
  { icon: <Server className="h-4 w-4" />, label: "Self-hostable", desc: "Own your data" },
  { icon: <Lock className="h-4 w-4" />, label: "BYOK", desc: "Bring your own API key" },
  { icon: <Sparkles className="h-4 w-4" />, label: "Multi-model", desc: "OpenAI · Claude · Gemini" },
  { icon: <Github className="h-4 w-4" />, label: "Open source", desc: "MIT License" },
];

// ─── rotating demo card component ─────────────────────────────────────────────
function DemoPreview() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % DEMO_CARDS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const card = DEMO_CARDS[active];
  return (
    <div className="relative w-full max-w-[340px]">
      {/* Glow orb */}
      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-sky-500/15 blur-3xl rounded-full pointer-events-none" />
      {/* Stack of cards behind */}
      <div className="absolute top-3 left-3 right-0 h-full rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/30 backdrop-blur-sm" />
      <div className="absolute top-1.5 left-1.5 right-0 h-full rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 backdrop-blur-sm" />
      {/* Active card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "relative bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border p-4 shadow-xl",
            card.border
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 rounded-2xl", card.color)} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {card.icon}
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{card.label}</span>
              </div>
              <div className="flex gap-1">
                {DEMO_CARDS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={cn("h-1.5 rounded-full transition-all duration-300", i === active ? "w-4 bg-indigo-500" : "w-1.5 bg-slate-300 dark:bg-slate-600")}
                  />
                ))}
              </div>
            </div>
            {card.preview}
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Processing pill */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-md text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
        <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
        Generated in ~12s
      </div>
    </div>
  );
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("refresh-sidebar", handleRefresh);
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("refresh-sidebar", handleRefresh);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isAuthenticated]);

  const loadData = async () => {
    if (!isAuthenticated) {
      const guestProjects = JSON.parse(localStorage.getItem("guest_projects") || "[]");
      setProjects(guestProjects);
      setCategories([]);
      setLoading(false);
      return;
    }
    try {
      const [projs, cats] = await Promise.all([projectsApi.list(), categoriesApi.list()]);
      setProjects(projs);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveProject = async (projectId: string, categoryId: string | null) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, category_id: categoryId } : p));
    setActiveDropdown(null);
    try {
      await projectsApi.updateCategory(projectId, categoryId);
      setTimeout(() => { loadData(); window.dispatchEvent(new Event("refresh-sidebar")); }, 300);
    } catch {
      loadData();
    }
  };

  const executeDeleteProject = async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setActiveDropdown(null);
    if (!isAuthenticated) {
      const current = JSON.parse(localStorage.getItem("guest_projects") || "[]");
      localStorage.setItem("guest_projects", JSON.stringify(current.filter((p: Project) => String(p.id) !== String(projectId))));
      window.dispatchEvent(new Event("refresh-sidebar"));
      toast.success("Project deleted");
      return;
    }
    try {
      await projectsApi.delete(projectId);
      toast.success("Project deleted");
      setTimeout(() => { loadData(); window.dispatchEvent(new Event("refresh-sidebar")); }, 300);
    } catch {
      toast.error("Failed to delete project");
      loadData();
    }
  };

  const handleDeleteProject = (projectId: string) => {
    toast("Delete this project?", {
      description: "This action cannot be undone.",
      action: { label: "Delete", onClick: () => executeDeleteProject(projectId) },
    });
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return "Uncategorized";
    return categories.find(c => c.id === id)?.name || "Uncategorized";
  };

  const projectGroups = (() => {
    const map = new Map<string | null, Project[]>();
    projects.forEach(p => {
      const key = p.category_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).map(([id, projs]) => ({
      id: id ?? "uncategorized",
      name: getCategoryName(id),
      projects: projs.slice(0, 8),
      totalCount: projs.length,
    }));
  })();

  return (
    <div className="space-y-20 pb-24 relative">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden w-full max-w-[1200px] mx-auto mt-4 px-4 sm:px-6 lg:px-8">
        {/* Deep background & spotlight */}
        <div className="absolute inset-0 -z-10 bg-transparent">
          <div className="absolute inset-0 bg-[#fdfcfb] dark:bg-black" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200/40 via-white/0 to-white/0 dark:from-white/10 dark:via-[#09090b]/0 dark:to-transparent opacity-80 pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.02]"
            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />
        </div>

        <div className="pt-20 pb-16 lg:pt-32 lg:pb-24">
          {/* Eyebrow pill */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-300 text-[11px] font-semibold tracking-wide uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
              <Sparkles className="h-3 w-3 text-indigo-500 dark:text-white" />
              The open-source alternative to NotebookLM
            </div>
          </motion.div>

          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full">
              <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-[-0.04em] text-slate-900 dark:text-white leading-[1.02]">
                Turn any content <br />
                <span 
                  className="inline-block mt-2 font-black text-transparent bg-clip-text"
                  style={{ 
                    backgroundImage: "linear-gradient(135deg, #A8B1FF 0%, #E2E8FF 50%, #A8B1FF 100%)", 
                    backgroundSize: "200% auto",
                    animation: "textShine 8s linear infinite" 
                  }}>
                  into mastery.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-lg tracking-tight text-slate-600 dark:text-[#a1a1aa] max-w-2xl mx-auto leading-relaxed">
                Paste a YouTube video, PDF, or any URL. Get instant summaries, flashcards, quizzes, and publishable content — powered by your own API keys.
              </motion.p>

              {/* Source type pills */}
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-2.5 justify-center">
                {SOURCE_TYPES.map(s => (
                  <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/20">
                    <span className="opacity-70 grayscale">{s.icon}</span> {s.label}
                  </span>
                ))}
              </motion.div>

              {/* URL input */}
              <motion.div variants={fadeUp} className="mt-12 w-full max-w-3xl mx-auto relative z-20">
                <UrlInput />
              </motion.div>

              {/* Differentiators */}
              <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-center gap-6 sm:gap-10">
                {DIFFERENTIATORS.map(d => (
                  <div key={d.label} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-zinc-400">
                    <div className="text-indigo-500 dark:text-white opacity-90">
                      {d.icon}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 block text-xs tracking-tight">{d.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-500">{d.desc}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* ── VS NOTEBOOKLM DIFFERENTIATOR BAR ──────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="max-w-6xl mx-auto px-4 mt-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Lock className="h-5 w-5 text-zinc-900 dark:text-zinc-300" />,
              title: "Your data, your control",
              body: "Self-host on your own machine or server. Nothing leaves unless you send it to your own APIs.",
            },
            {
              icon: <Sparkles className="h-5 w-5 text-zinc-900 dark:text-zinc-300" />,
              title: "Any model, any provider",
              body: "Use OpenAI, Claude, or Gemini. Switch models per task. Not locked into Google's ecosystem.",
            },
            {
              icon: <PenTool className="h-5 w-5 text-zinc-900 dark:text-zinc-300" />,
              title: "From learning to creating",
              body: "Go from source to publishable blog posts, social threads, and study guides in one click.",
            },
          ].map(card => (
            <motion.div
              key={card.title}
              variants={fadeUp}
              className="group relative px-6 py-8 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
            >
              <div className="relative z-10">
                <div className="h-10 w-10 flex items-center justify-center mb-4 text-zinc-600 dark:text-white">
                  {card.icon}
                </div>
                <h3 className="font-semibold tracking-tight text-slate-900 dark:text-zinc-100 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500 leading-relaxed">{card.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── FEATURE GRID ──────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="hidden md:block max-w-6xl mx-auto px-4 mt-20"
      >
        <motion.div variants={fadeUp} className="max-w-xl mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-[-0.03em]">Everything you need to go deep</h2>
          <p className="mt-3 text-slate-500 dark:text-zinc-500 leading-relaxed">One URL. Five powerful outputs. Infinite possibilities built on the foundation of the best AI models.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: <Brain className="h-6 w-6" />,
              title: "Deep Summaries",
              body: "Three modes — Article, Concise, ELI5. Strips noise, keeps signal. Works on 3-hour lectures and dense research papers.",
            },
            {
              icon: <BookOpen className="h-6 w-6" />,
              title: "Smart Flashcards",
              body: "Spaced-repetition ready cards generated from any source. Scientifically-backed review scheduling built in.",
            },
            {
              icon: <Target className="h-6 w-6" />,
              title: "Adaptive Quizzes",
              body: "Pinpoints your weak spots with AI-generated multiple choice. Walk into any exam battle-ready.",
            },
            {
              icon: <Palette className="h-6 w-6" />,
              title: "Content Studio",
              body: "Turn your knowledge base into blog posts, social threads, and study guides. From learner to creator instantly.",
            },
          ].map(f => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group flex flex-col justify-between p-8 rounded-2xl bg-slate-50 dark:bg-[#0c0c0e] border border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
            >
              <div className="h-10 w-10 text-slate-900 dark:text-zinc-200 mb-6">
                {f.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-zinc-500 leading-relaxed">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── PROJECTS ──────────────────────────────────────────────────────── */}
      {!loading && projects.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-6xl mx-auto px-4 mt-20"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your Learning Goals</h2>
              <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1">Pick up where you left off</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }}
                className="p-2 rounded-xl bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1a1a1c] text-slate-600 dark:text-zinc-400 transition-colors"
                title="Refresh"
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search goals..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111113] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Project groups */}
          <div className="space-y-12">
            {projectGroups.map(group => (
              <div key={group.id}>
                <h3 className="text-[13px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-500 mb-5 flex items-center gap-2">
                  {group.name}
                  <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 px-1.5 rounded-md">{group.projects.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {group.projects.map((project, i) => (
                    <div key={project.id} className="relative group/card">
                      <Link href={project.first_source_id ? `/source/${project.first_source_id}` : "#"}>
                        <motion.div
                          whileHover={{ y: -4, scale: 1.01 }}
                          className="h-56 rounded-2xl p-5 relative group border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0c0e] hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-white/5 transition-all duration-300 flex flex-col justify-between"
                        >
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 opacity-70">
                                <Folder className="h-3 w-3" />{group.name}
                              </span>
                              {project.status === "Ready" && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-[15px] tracking-tight leading-snug line-clamp-2 mb-2">{project.title}</h3>
                            {project.first_source_url && (
                              <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 truncate mb-1">
                                {project.first_source_url.replace(/^https?:\/\/(www\.)?/, "")}
                              </div>
                            )}
                          </div>
                          <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 opacity-60" />{new Date(project.created_at).toLocaleDateString()}</span>
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-slate-900 dark:text-white" />
                          </div>
                        </motion.div>
                      </Link>
                      {/* Options */}
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(activeDropdown === project.id ? null : project.id); }}
                        className="absolute top-3 right-3 z-20 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md transition-all opacity-0 group-hover/card:opacity-100 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                      {activeDropdown === project.id && (
                        <div className="absolute right-3 top-10 z-50 w-48 bg-white dark:bg-[#111113] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5" onClick={e => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 mb-1">Move to...</div>
                          <button onClick={() => handleMoveProject(project.id, null)} className={cn("w-full text-left px-4 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-zinc-300 transition-colors", !project.category_id && "text-slate-900 dark:text-white font-medium")}>
                            <Folder className="h-3.5 w-3.5 opacity-70" /> Uncategorized
                          </button>
                          {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleMoveProject(project.id, cat.id)} className={cn("w-full text-left px-4 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-zinc-300 transition-colors", project.category_id === cat.id && "text-slate-900 dark:text-white font-medium")}>
                              <Folder className="h-3.5 w-3.5 opacity-70" /> {cat.name}
                            </button>
                          ))}
                          <div className="border-t border-slate-100 dark:border-white/5 mt-1 pt-1">
                            <button onClick={() => handleDeleteProject(project.id)} className="w-full text-left px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 flex items-center gap-2 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {!loading && projects.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-200/50 dark:border-indigo-800/50">
            <Layers className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Start your first goal</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Paste a YouTube URL, drop a PDF, or share a website above.<br />
            Your first learning workspace is 60 seconds away.
          </p>
        </motion.div>
      )}

    </div>
  );
}
