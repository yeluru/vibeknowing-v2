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
const fadeUp: Variants = { 
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' }, 
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  } 
};
const stagger: Variants = { visible: { transition: { staggerChildren: 0.12 } } };
const fadeInUp = fadeUp;
const staggerContainer = stagger;
const pulseGlow: Variants = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    scale: [1, 1.05, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
  }
};

function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    let { left, top } = currentTarget.getBoundingClientRect();
    setMouseX(clientX - left);
    setMouseY(clientY - top);
  }

  return (
    <motion.div
      variants={fadeUp}
      onMouseMove={handleMouseMove}
      className={cn("group relative", className)}
    >
      <div
        className="vk-spotlight"
        style={{ "--x": `${mouseX}px`, "--y": `${mouseY}px` } as any}
      />
      {children}
    </motion.div>
  );
}

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
          <div key={i} className="flex items-start gap-2 bg-white/60 dark:bg-[#1a1e30]/40 rounded-lg p-2">
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
              : "bg-white/50 dark:bg-[#1a1e30]/30 border-slate-200/50 dark:border-[#383e59]/50 text-slate-600 dark:text-slate-300"
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
  { icon: <Instagram className="h-4 w-4" />, label: "Instagram", color: "text-pink-500" },
  { icon: <Twitter className="h-4 w-4" />, label: "X / Twitter", color: "text-slate-900 dark:text-slate-300" },
  { icon: <Linkedin className="h-4 w-4" />, label: "LinkedIn", color: "text-blue-600" },
  { icon: <Globe className="h-4 w-4" />, label: "Websites", color: "text-sky-500" },
  { icon: <FileText className="h-4 w-4" />, label: "PDFs", color: "text-indigo-500" },
  { icon: <Mic className="h-4 w-4" />, label: "Audio", color: "text-violet-500" },
];

const DIFFERENTIATORS = [
  { icon: <Server className="h-4 w-4" />, label: "Self-hostable", desc: "Own your data" },
  { icon: <Lock className="h-4 w-4" />, label: "BYOK", desc: "Bring your own API key" },
  { icon: <Sparkles className="h-4 w-4" />, label: "Multi-model", desc: "OpenAI · Claude · Gemini" },
  { icon: <Github className="h-4 w-4" />, label: "Open source", desc: "MIT License" },
];

// ─── floating constellation demo component ────────────────────────────────────
function DemoPreview() {
  return (
    <div className="relative w-full max-w-[420px] h-[480px]">
      {/* Deep glow orb behind the constellation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-violet-500/20 blur-[80px] rounded-full pointer-events-none" />

      {/* 5. Social Threads (Top Left) */}
      <motion.div
        animate={{ y: [8, -8, 8] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        className="absolute -top-6 left-10 w-[240px] z-10"
      >
        <div className="vk-card p-3 border-pink-200/60 dark:border-pink-700/40 bg-white/75 dark:bg-[#0b0e17]/75 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-pink-100 dark:border-pink-900/30">
             <Share2 className="h-3.5 w-3.5 text-pink-500" />
             <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Viral Thread</span>
          </div>
          <div className="flex items-start gap-2">
             <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 shrink-0" />
             <div className="space-y-1.5 mt-0.5 opacity-90 w-full">
                <div className="h-1.5 w-full bg-pink-500/20 rounded-full" />
                <div className="h-1.5 w-5/6 bg-pink-500/20 rounded-full" />
                <div className="flex gap-1 mt-2">
                   <span className="text-[9px] text-pink-600 dark:text-pink-400 font-bold bg-pink-50 dark:bg-pink-500/10 px-1 rounded-sm">#TECH</span>
                   <span className="text-[9px] text-pink-600 dark:text-pink-400 font-bold bg-pink-50 dark:bg-pink-500/10 px-1 rounded-sm">#LEARNING</span>
                </div>
             </div>
          </div>
        </div>
      </motion.div>

      {/* 1. Extraction / Transcript Card (Top, slightly right) */}
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 right-0 w-[260px] z-20"
      >
        <div className="vk-card p-3 border-emerald-200/60 dark:border-emerald-700/40 bg-white/70 dark:bg-[#0b0e17]/70 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 mb-2 border-b border-emerald-100 dark:border-emerald-900/30 pb-2">
            <Mic className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Transcription</span>
          </div>
          <div className="space-y-1.5 opacity-80">
            <div className="h-1.5 w-full bg-emerald-500/20 rounded-full" />
            <div className="h-1.5 w-11/12 bg-emerald-500/20 rounded-full" />
            <div className="h-1.5 w-4/5 bg-emerald-500/20 rounded-full" />
            <div className="h-1.5 w-full bg-emerald-500/20 rounded-full" />
            <div className="h-1.5 w-2/3 bg-emerald-500/20 rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* 2. AI Summary Card (Left, middle) */}
      <motion.div
        animate={{ y: [5, -5, 5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-40 -left-6 w-[240px] z-30"
      >
        <div className="vk-card p-4 border-indigo-200/60 dark:border-indigo-700/40 bg-white/70 dark:bg-[#0b0e17]/70 backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">AI Summary</span>
            </div>
            <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {"• Extracted key arguments"} <br/>
              {"• Bypassed paywalls seamlessly"} <br/>
              {"• Structured output format"}
            </div>
            <div className="mt-3 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400">Processing signals...</span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* 6. Chat with Doc (Middle Right) */}
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
        className="absolute top-48 -right-8 w-[230px] z-30"
      >
        <div className="vk-card p-3 border-amber-200/60 dark:border-amber-700/40 bg-white/80 dark:bg-[#0b0e17]/80 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-3 border-b border-amber-100 dark:border-amber-900/30 pb-2">
            <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Chat with Doc</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {/* User message */}
            <div className="self-end bg-slate-100 dark:bg-[#1e2235] px-2.5 py-1.5 rounded-l-xl rounded-tr-xl max-w-[85%] border border-slate-200 dark:border-[#383e59]/50">
               <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">Explain the 3rd principle?</span>
            </div>
            {/* AI message */}
            <div className="self-start bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-r-xl rounded-tl-xl max-w-[90%] border border-amber-200/50 dark:border-amber-500/20">
               <div className="flex items-center gap-1.5 mb-1">
                 <div className="h-2 w-2 rounded-full bg-amber-500" />
                 <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">AI Assistant</span>
               </div>
               <div className="space-y-1">
                  <div className="h-1 w-full bg-amber-500/20 rounded-full" />
                  <div className="h-1 w-5/6 bg-amber-500/20 rounded-full" />
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Flashcards (Center bottom) */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-16 right-4 w-[220px] z-40"
      >
         <div className="vk-card p-3 border-sky-200/60 dark:border-sky-700/40 bg-white/70 dark:bg-[#0b0e17]/70 backdrop-blur-xl shadow-xl hover:scale-105 transition-transform cursor-pointer">
           <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Flashcards Generated</span>
            </div>
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                 <div key={i} className="w-10 h-12 bg-white dark:bg-[#1a1e30] border border-slate-200 dark:border-slate-700 rounded-md shadow-sm transform -rotate-6 origin-bottom-left" style={{ zIndex: 10 - i, rotate: `${-6 + (i*4)}deg` }} />
              ))}
            </div>
            <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              34 cards ready for review
            </div>
         </div>
      </motion.div>

      {/* 4. Quiz Validation (Bottom left) */}
      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute bottom-4 -left-2 w-[250px] z-50"
      >
        <div className="glass-panel p-4 rounded-3xl shadow-2xl border-white/40 dark:border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-2xl -mr-12 -mt-12" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-wider uppercase">Quiz Testing</span>
            </div>
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black tracking-wide">+5 XP</span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-3 leading-relaxed relative z-10">What is the primary function of the core extraction loop?</p>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-xl border border-slate-100 dark:border-white/5 opacity-60">
               <div className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-500 shrink-0" />
               <div className="h-1.5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-full" />
            </div>
            <div className="flex items-center gap-2.5 bg-emerald-500/10 px-2 py-1.5 rounded-xl border border-emerald-500/30">
               <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
               <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Maintains signal-to-noise</span>
            </div>
          </div>
        </div>
      </motion.div>
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
      const projs = await projectsApi.list();
      setProjects(projs);
      setCategories([]);
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
      <section className="relative overflow-hidden w-full max-w-[2700px] mx-auto mt-4 px-4 sm:px-6 lg:px-24 lg:rounded-[3rem] border border-transparent dark:border-white/5 bg-transparent overflow-hidden">
        {/* Deep background & atmospheric layers */}
        <div className="absolute inset-0 -z-10 bg-transparent overflow-hidden">
          {/* Base cinematic dark gradient (only visible in dark mode) */}
          <div className="absolute inset-0 bg-[#fdfcfb] dark:bg-[#020203]" />

          {/* Animated Atmospheric Blobs - Cinema Mobile Style */}
          <motion.div 
            animate={{ 
              x: [0, 100, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 dark:bg-indigo-600/10 blur-[140px] mix-blend-screen opacity-60" 
          />
          <motion.div 
            animate={{ 
              x: [0, -80, 0], 
              y: [0, 100, 0],
              scale: [1, 1.3, 1] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-cyan-500/20 dark:bg-violet-600/10 blur-[140px] mix-blend-screen opacity-50" 
          />
          <motion.div 
            animate={{ 
              opacity: [0.3, 0.6, 0.3] 
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-blue-500/10 dark:bg-blue-400/5 blur-[160px] mix-blend-overlay" 
          />

          {/* Grid Pattern with subtle mask */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{ 
              backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", 
              backgroundSize: "40px 40px",
              maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
            }}
          />
        </div>

        <div className="max-w-[1400px] mx-auto relative z-20">
          <div className="pt-14 pb-10 lg:pt-20 lg:pb-18 grid lg:grid-cols-12 gap-20 items-center">
            
            {/* Left Column - High-Dominance Marketing (75%) */}
            <div className="lg:col-span-9 flex flex-col items-center lg:items-start text-center lg:text-left">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full">
                
                {/* Eyebrow pill */}
                <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-8 z-20">
                  <div className="relative group cursor-pointer">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <div className="relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white dark:bg-[#0c0f18] border border-slate-200/80 dark:border-[#383e59]/80 text-slate-800 dark:text-slate-300 text-xs font-black tracking-widest uppercase shadow-xl min-w-max">
                      <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      Welcome to VibeLearn!
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>

                <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-[-0.05em] text-slate-900 dark:text-white leading-tight drop-shadow-xl text-balance">
                  Turn any content <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-400 drop-shadow-2xl filter group-hover:brightness-110 transition-all duration-700">into mastery.</span>
                </motion.h1>

                <motion.p variants={fadeUp} className="mt-8 text-lg lg:text-xl tracking-[0.01em] text-slate-600 dark:text-slate-200 max-w-2xl leading-relaxed font-bold">
                  The problem isn’t a lack of information; it’s the cost of too much. Inspired by <span className="text-slate-900 dark:text-white font-bold opacity-100 italic">"Vibecoding,"</span> VibeLearn is the ultimate ingestion engine—a high-performance, 360-degree knowledge cycle.
                </motion.p>

                <motion.p variants={fadeUp} className="mt-4 text-[13px] text-slate-500 dark:text-slate-300 max-w-xl font-bold uppercase tracking-[0.25em] opacity-100">
                  Don't just watch it. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Vibe Learn it.</span>
                </motion.p>

                {/* URL input Hero Spotlight */}
                <motion.div variants={fadeUp} className="mt-12 w-full max-w-2xl relative z-30 group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 rounded-[2.5rem] blur-2xl opacity-15 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative glass-panel p-2.5 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                    <UrlInput />
                  </div>
                  {/* Privacy Disclaimer - The text that was yanked */}
                  <div className="mt-4 text-center lg:text-left px-6">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase opacity-80">
                      <span className="text-emerald-500 dark:text-emerald-400 mr-1.5 leading-none">●</span>
                      100% Private. Nothing leaves unless you send it to your own APIs.
                    </p>
                  </div>
                </motion.div>

                {/* Unified Capabilities Cloud - Sources + Differentiators (Center Aligned) */}
                <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto lg:mx-0">
                  {/* Sources */}
                  {SOURCE_TYPES.map(s => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-[#383e59]/50 text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:scale-105 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 group/pill">
                      <span className={cn("opacity-100 drop-shadow-sm group-hover/pill:scale-110 transition-transform", s.color)}>{s.icon}</span> {s.label}
                    </span>
                  ))}
                  
                  {/* Platform Features - Integrated Into The Cloud */}
                  {DIFFERENTIATORS.map(d => (
                    <span key={d.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50/50 dark:bg-indigo-500/10 backdrop-blur-xl border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm transition-all hover:scale-105 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 group/feature">
                      <span className="opacity-100 drop-shadow-sm group-hover/feature:scale-110 transition-transform">{d.icon}</span> {d.label}
                      <span className="ml-1 text-[8px] font-black uppercase tracking-[0.15em] opacity-40 bg-indigo-500/10 px-1 py-0.5 rounded-sm">Verified</span>
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* Right Column - Demo Interactive UI (25%) */}
            <div className="lg:col-span-3 hidden lg:flex relative justify-end items-center perspective-[3000px]">
              {/* Pulsating Cinematic Glow */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.25, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-indigo-600/30 via-violet-600/10 to-sky-500/30 blur-[120px] rounded-[100%] pointer-events-none" 
              />
              
              <motion.div 
                initial={{ opacity: 0, x: 80, rotateY: -20, rotateX: 5, scale: 0.9 }} 
                animate={{ 
                    opacity: 1, 
                    x: -20, 
                    rotateY: [-10, -5, -10],
                    rotateX: [2, 7, 2],
                    y: [-15, 10, -15],
                    scale: 1 
                }} 
                transition={{ 
                    opacity: { duration: 1.2, delay: 0.2 },
                    x: { duration: 1.2, delay: 0.2 },
                    scale: { duration: 1.2, delay: 0.2 },
                    rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                    rotateX: { duration: 10, repeat: Infinity, ease: "linear" },
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative w-full max-w-[400px] z-10"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="scale-[1.4] origin-right transform-gpu drop-shadow-[0_45px_70px_rgba(0,0,0,0.45)]">
                  <DemoPreview />
                </div>
                
                {/* Floating aesthetic elements - Enhanced Drift */}
                <motion.div 
                  animate={{ 
                    y: [-15, 15, -15],
                    rotate: [-3, 3, -3]
                  }} 
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-8 -left-20 h-28 w-28 bg-white/95 dark:bg-[#1a1e30]/95 backdrop-blur-3xl rounded-[32px] border border-slate-200/50 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex items-center justify-center -translate-z-20"
                >
                  <div className="text-center">
                    <span className="block text-3xl font-black text-indigo-500 drop-shadow-sm">A+</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full mt-1 inline-block">Score</span>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ 
                    y: [15, -15, 15],
                    rotate: [2, -2, 2]
                  }} 
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-10 -right-12 w-44 bg-white/95 dark:bg-[#1a1e30]/95 backdrop-blur-3xl p-4 rounded-[32px] border border-slate-200/50 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] translate-z-20"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">Fact Checked</div>
                  </div>
                  <div className="space-y-2 opacity-60">
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full" />
                    <div className="h-1.5 w-5/6 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
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
            <SpotlightCard
              key={card.title}
              className="vk-card px-6 py-8"
            >
              <div className="relative z-10">
                <div className="h-10 w-10 flex items-center justify-center mb-4 text-zinc-600 dark:text-white bg-slate-100 dark:bg-white/5 rounded-xl">
                  {card.icon}
                </div>
                <h3 className="font-semibold tracking-tight text-slate-900 dark:text-zinc-100 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{card.body}</p>
              </div>
            </SpotlightCard>
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
          <p className="mt-3 text-slate-600 dark:text-zinc-300 leading-relaxed">One URL. Five powerful outputs. Infinite possibilities built on the foundation of the best AI models.</p>
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
            <SpotlightCard
              key={f.title}
              className="vk-card flex flex-col justify-between p-8"
            >
              <div className="h-10 w-10 text-slate-900 dark:text-zinc-200 mb-6 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center shadow-sm">
                {f.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{f.body}</p>
              </div>
            </SpotlightCard>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-200 dark:border-[#383e59]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your Learning History</h2>
              <p className="text-slate-500 dark:text-zinc-300 text-sm mt-1">Pick up where you left off</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); }}
                className="p-2 rounded-xl bg-slate-50 dark:bg-[#1e2235] border border-slate-200 dark:border-[#383e59] hover:bg-slate-100 dark:hover:bg-[#252a42] text-slate-600 dark:text-indigo-200/80 transition-colors shadow-sm"
                title="Refresh"
              >
                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search goals..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200 dark:border-[#383e59] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                />
              </div>
            </div>
          </div>

          {/* Project groups */}
          <div className="space-y-12">
            {projectGroups.map(group => (
              <div key={group.id}>
                <h3 className="text-[13px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-300 mb-5 flex items-center gap-2">
                  {group.name}
                  <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 px-1.5 rounded-md">{group.projects.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {group.projects.map((project, i) => (
                    <div key={project.id} className="relative group/card">
                      <SpotlightCard className="vk-card h-56 p-0">
                        <Link href={project.first_source_id ? `/source/${project.first_source_id}` : "#"} className="h-full block">
                          <div className="h-full p-5 flex flex-col justify-between transition-all duration-300">
                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-3">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 opacity-70">
                                  <Folder className="h-3 w-3" />{group.name}
                                </span>
                                {project.status === "Ready" && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-[15px] tracking-tight leading-snug line-clamp-2 mb-2">{project.title}</h3>
                              {project.first_source_url && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-300 truncate mb-1">
                                  {project.first_source_url.replace(/^https?:\/\/(www\.)?/, "")}
                                </div>
                              )}
                            </div>
                            <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400">
                              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 opacity-60" />{new Date(project.created_at).toLocaleDateString()}</span>
                              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-slate-900 dark:text-white" />
                            </div>
                          </div>
                        </Link>
                      </SpotlightCard>
                      {/* Options */}
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(activeDropdown === project.id ? null : project.id); }}
                        className="absolute top-3 right-3 z-20 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md transition-all opacity-0 group-hover/card:opacity-100 bg-white/80 dark:bg-[#0b0e17]/80 backdrop-blur-md border border-slate-200 dark:border-[#383e59]"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                      {activeDropdown === project.id && (
                        <div className="absolute right-3 top-10 z-50 w-48 bg-white dark:bg-[#1e2235] rounded-xl shadow-xl border border-slate-200 dark:border-[#383e59] py-1.5" onClick={e => e.stopPropagation()}>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#383e59]/50 mb-1">Move to...</div>
                          <button onClick={() => handleMoveProject(project.id, null)} className={cn("w-full text-left px-4 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-zinc-300 transition-colors", !project.category_id && "text-slate-900 dark:text-white font-medium")}>
                            <Folder className="h-3.5 w-3.5 opacity-70" /> Uncategorized
                          </button>
                          {categories.map(cat => (
                            <button key={cat.id} onClick={() => handleMoveProject(project.id, cat.id)} className={cn("w-full text-left px-4 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-zinc-300 transition-colors", project.category_id === cat.id && "text-slate-900 dark:text-white font-medium")}>
                              <Folder className="h-3.5 w-3.5 opacity-70" /> {cat.name}
                            </button>
                          ))}
                          <div className="border-t border-slate-100 dark:border-[#383e59]/60 mt-1 pt-1">
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
