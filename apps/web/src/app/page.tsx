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
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

// ─── animation presets ───────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { visible: { transition: { staggerChildren: 0.09 } } };
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
      <section className="relative overflow-hidden rounded-[2.5rem] max-w-6xl mx-auto mt-4">
        {/* Background mesh */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/15 dark:bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-400/15 dark:bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-sky-400/10 dark:bg-sky-600/8 rounded-full blur-3xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />
        </div>

        <div className="px-6 pt-14 pb-16 lg:px-14 lg:pt-16 lg:pb-20">
          {/* Eyebrow pill */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200/70 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              The open-source alternative to NotebookLM
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: copy + CTA */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center lg:text-left">
              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
                Turn any content
                <span className="block mt-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  into mastery.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Paste a YouTube video, PDF, or any URL. Get instant summaries, flashcards, quizzes, and publishable content — powered by your own AI keys.
              </motion.p>

              {/* Source type pills */}
              <motion.div variants={fadeUp} className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
                {SOURCE_TYPES.map(s => (
                  <span key={s.label} className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300", s.color)}>
                    {s.icon} {s.label}
                  </span>
                ))}
              </motion.div>

              {/* URL input */}
              <motion.div variants={fadeUp} className="mt-7">
                <UrlInput />
              </motion.div>

              {/* Differentiators */}
              <motion.div variants={fadeUp} className="mt-8 grid grid-cols-2 gap-3">
                {DIFFERENTIATORS.map(d => (
                  <div key={d.label} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <div className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center text-indigo-500 flex-shrink-0 shadow-sm">
                      {d.icon}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">{d.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: animated output preview */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex items-center justify-center pt-6 pb-8"
            >
              {/* How it works + demo card stack */}
              <div className="w-full max-w-sm space-y-5">
                {/* Steps */}
                <div className="space-y-3">
                  {[
                    { n: "1", icon: <Globe className="h-4 w-4" />, title: "Drop any source", sub: "YouTube · PDF · Web · Audio" },
                    { n: "2", icon: <Sparkles className="h-4 w-4" />, title: "AI processes it", sub: "Your key, your model, your privacy" },
                    { n: "3", icon: <Zap className="h-4 w-4" />, title: "Study & create", sub: "Summary · Cards · Quiz · Articles" },
                  ].map(step => (
                    <div key={step.n} className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                        {step.n}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-indigo-500">{step.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{step.sub}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Demo preview cards */}
                <div className="flex justify-center pt-2">
                  <DemoPreview />
                </div>
              </div>
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
        className="max-w-6xl mx-auto px-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Lock className="h-5 w-5 text-violet-500" />,
              title: "Your data, your control",
              body: "Self-host on your own machine or server. Nothing leaves unless you send it to your own AI keys.",
              accent: "violet",
            },
            {
              icon: <Sparkles className="h-5 w-5 text-indigo-500" />,
              title: "Any model, any provider",
              body: "Use OpenAI, Claude, or Gemini. Switch models per task. Not locked into Google's stack.",
              accent: "indigo",
            },
            {
              icon: <PenTool className="h-5 w-5 text-sky-500" />,
              title: "Learn → Create",
              body: "Go from source to publishable blog posts, social threads, and study guides in one click.",
              accent: "sky",
            },
          ].map(card => (
            <motion.div
              key={card.title}
              variants={fadeUp}
              className="group relative p-6 rounded-2xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-${card.accent}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`h-10 w-10 rounded-xl bg-${card.accent}-500/10 flex items-center justify-center mb-3`}>{card.icon}</div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1.5">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{card.body}</p>
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
        className="hidden md:block max-w-6xl mx-auto px-4"
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Everything you need to go deep</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">One URL. Five powerful outputs. Infinite possibilities.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              icon: <Brain className="h-7 w-7" />,
              color: "indigo",
              title: "Deep Summaries",
              body: "Three modes — Article, Concise, ELI5. Strips noise, keeps signal. Works on 3-hour lectures and dense research papers.",
            },
            {
              icon: <BookOpen className="h-7 w-7" />,
              color: "sky",
              title: "Smart Flashcards",
              body: "Spaced-repetition ready cards generated from any source. Scientifically-backed review scheduling built in.",
            },
            {
              icon: <Target className="h-7 w-7" />,
              color: "violet",
              title: "Adaptive Quizzes",
              body: "Pinpoints your weak spots with AI-generated multiple choice. Walk into any exam battle-ready.",
            },
            {
              icon: <Palette className="h-7 w-7" />,
              color: "emerald",
              title: "Content Studio",
              body: "Turn your knowledge base into blog posts, social threads, and study guides. From learner to creator instantly.",
            },
          ].map(f => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group relative p-7 rounded-3xl bg-white/65 dark:bg-slate-950/25 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-${f.color}-500/8 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-150 transition-transform duration-700`} />
              <div className="relative flex items-start gap-4">
                <div className={`h-12 w-12 bg-${f.color}-500/10 dark:bg-${f.color}-400/10 rounded-2xl flex items-center justify-center text-${f.color}-600 dark:text-${f.color}-300 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.body}</p>
                </div>
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
          className="max-w-6xl mx-auto px-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white/55 dark:bg-slate-950/20 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 rounded-2xl px-5 py-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Your Learning Goals</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Pick up where you left off</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }}
                className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 hover:bg-white text-slate-600 dark:text-slate-300 hover:text-indigo-700 transition-all"
                title="Refresh"
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search goals..."
                  className="w-full sm:w-60 pl-9 pr-4 py-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Project groups */}
          <div className="space-y-12">
            {projectGroups.map(group => (
              <div key={group.id}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2 px-1">
                  <Folder className="h-4.5 w-4.5 text-indigo-500" />
                  {group.name}
                  <span className="text-sm font-medium text-slate-400">({group.projects.length}/{group.totalCount})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {group.projects.map((project, i) => (
                    <div key={project.id} className="relative group/card">
                      <Link href={project.first_source_id ? `/source/${project.first_source_id}` : "#"}>
                        <motion.div
                          whileHover={{ y: -6, scale: 1.02 }}
                          className="h-64 rounded-2xl p-5 relative overflow-hidden group border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-950/25 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                        >
                          {/* Accent glow */}
                          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none", i % 2 === 0 ? "bg-indigo-500/10" : "bg-sky-500/10")} />
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Folder className="h-3 w-3" />{group.name}
                              </span>
                              {project.status === "Ready" && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 mb-2">{project.title}</h3>
                            {project.first_source_url && (
                              <div className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 truncate opacity-80 mb-1.5">
                                {project.first_source_url.replace(/^https?:\/\/(www\.)?/, "")}
                              </div>
                            )}
                            {project.first_source_preview && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{project.first_source_preview}</p>
                            )}
                          </div>
                          <div className="relative z-10 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(project.created_at).toLocaleDateString()}</span>
                            <ArrowRight className={cn("h-3.5 w-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300", i % 2 === 0 ? "text-indigo-500" : "text-sky-500")} />
                          </div>
                        </motion.div>
                      </Link>
                      {/* Options */}
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(activeDropdown === project.id ? null : project.id); }}
                        className="absolute top-3 right-3 z-20 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-full transition-all opacity-0 group-hover/card:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeDropdown === project.id && (
                        <div className="absolute right-3 top-10 z-50 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2" onClick={e => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1">Move to...</div>
                          <button onClick={() => handleMoveProject(project.id, null)} className={cn("w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300", !project.category_id && "text-violet-600 bg-violet-50")}>
                            <Folder className="h-3.5 w-3.5" /> Uncategorized
                          </button>
                          {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleMoveProject(project.id, cat.id)} className={cn("w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300", project.category_id === cat.id && "text-violet-600 bg-violet-50")}>
                              <Folder className="h-3.5 w-3.5" /> {cat.name}
                            </button>
                          ))}
                          <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                            <button onClick={() => handleDeleteProject(project.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
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
