"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen, Sparkles, ChevronRight, ChevronLeft, Check, Copy,
  Search, Loader2, Brain, Zap, Target, AlertTriangle, Lightbulb,
  Code2, Play, GraduationCap, Layers, RotateCcw, Home,
  Clock, CheckCircle2, Circle, ChevronDown, X, Menu,
  Terminal, Quote, BookMarked, FlaskConical, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────────────── */
interface Concept { name: string; explanation: string; example: string }
interface TutorialStep { step: number; title: string; body: string; code?: string }
interface WorkedExample { title: string; problem: string; solution: string; verify: string }
interface Pitfall { name: string; description: string; fix: string }
interface ProTip { title: string; insight: string }
interface Chapter {
  id: string; title: string; duration: string;
  concepts: Concept[]; tutorialSteps: TutorialStep[];
  workedExample: WorkedExample; pitfalls: Pitfall[]; proTip: ProTip;
}
interface Module { id: string; title: string; emoji: string; description: string; chapters: Chapter[] }
interface TutorialData {
  title: string;
  topicType: "Technical" | "Mathematical" | "Scientific" | "Philosophical" | "Historical" | "Creative";
  theme: string;
  centralMentalModel: { name: string; tagline: string; description: string };
  stats: { modules: number; chapters: number; concepts: number; estimatedMinutes: number };
  modules: Module[];
}

type TabType = "concepts" | "tutorial" | "example" | "pitfalls" | "protip";

/* ── Tab config per topic type ──────────────────────────────────────── */
const TAB_CONFIG: Record<string, Record<TabType, { label: string; icon: string }>> = {
  Technical:     { concepts: { label: "Core Concepts", icon: "brain" },    tutorial: { label: "Tutorial Steps", icon: "play" },   example: { label: "Code Pattern",    icon: "code" },  pitfalls: { label: "Pitfalls",          icon: "shield" }, protip: { label: "Pro Tip",  icon: "lightbulb" } },
  Mathematical:  { concepts: { label: "Core Concepts", icon: "brain" },    tutorial: { label: "Step-by-Step",   icon: "play" },   example: { label: "Worked Example",  icon: "flask" }, pitfalls: { label: "Common Mistakes",   icon: "shield" }, protip: { label: "Insight", icon: "lightbulb" } },
  Scientific:    { concepts: { label: "Core Concepts", icon: "brain" },    tutorial: { label: "Method",         icon: "play" },   example: { label: "Case Study",      icon: "flask" }, pitfalls: { label: "Watch Out",         icon: "shield" }, protip: { label: "Pro Tip",  icon: "lightbulb" } },
  Philosophical: { concepts: { label: "Core Ideas",    icon: "brain" },    tutorial: { label: "Argument",       icon: "play" },   example: { label: "Full Argument",   icon: "quote" }, pitfalls: { label: "Counter-Arguments", icon: "shield" }, protip: { label: "Reframe", icon: "lightbulb" } },
  Historical:    { concepts: { label: "Key Events",    icon: "bookmark" }, tutorial: { label: "Narrative",      icon: "play" },   example: { label: "Case Study",      icon: "flask" }, pitfalls: { label: "Misconceptions",    icon: "shield" }, protip: { label: "Insight", icon: "lightbulb" } },
  Creative:      { concepts: { label: "Core Elements", icon: "brain" },    tutorial: { label: "Process",        icon: "play" },   example: { label: "Example",         icon: "flask" }, pitfalls: { label: "Pitfalls",          icon: "shield" }, protip: { label: "Pro Tip",  icon: "lightbulb" } },
};

const TOPIC_COLORS: Record<string, string> = {
  Technical:     "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Mathematical:  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  Scientific:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Philosophical: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Historical:    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  Creative:      "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
};

const LOADING_MSGS = [
  "Analyzing the source material...",
  "Identifying the topic type and mental model...",
  "Structuring modules and chapters...",
  "Writing concept explanations...",
  "Building tutorial steps with examples...",
  "Crafting worked examples and solutions...",
  "Naming and detailing the pitfalls...",
  "Writing expert pro tips...",
  "Assembling your tutorial...",
];

/* ── Utilities ──────────────────────────────────────────────────────── */
function buildAIHeaders(): Record<string, string> {
  try {
    const keys = JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
    const prefs = JSON.parse(localStorage.getItem("vk_ai_prefs") || "{}");
    const h: Record<string, string> = {};
    if (keys.openai)    h["X-OpenAI-Key"]    = keys.openai;
    if (keys.anthropic) h["X-Anthropic-Key"] = keys.anthropic;
    if (keys.google)    h["X-Google-Key"]    = keys.google;
    if (prefs.defaultProvider) h["X-AI-Provider"] = prefs.defaultProvider;
    const token = localStorage.getItem("token");
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  } catch { return {}; }
}

function flatChapters(modules: Module[]) {
  const result: { module: Module; chapter: Chapter; globalIdx: number }[] = [];
  let idx = 0;
  for (const m of modules) for (const c of m.chapters) result.push({ module: m, chapter: c, globalIdx: idx++ });
  return result;
}

/* ── Rich text renderer — handles paragraphs, numbered lists, bullets ── */
function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  // Split by double newline for paragraphs, or single newline for line breaks
  const blocks = text.split(/\n{2,}/).filter(b => b.trim());
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        // Detect numbered list block (starts with "1." or "Step 1:")
        const numberedLines = trimmed.split("\n").filter(l => l.trim());
        const isNumberedList = numberedLines.length > 1 && numberedLines.every(l => /^(Step\s*)?\d+[.:)]/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={bi} className="space-y-2">
              {numberedLines.map((line, li) => {
                const stripped = line.replace(/^(Step\s*)?\d+[.:)]\s*/, "").trim();
                return (
                  <li key={li} className="flex gap-3 text-sm text-[var(--foreground)] leading-relaxed">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-[var(--secondary-light)] text-[var(--secondary)] text-[10px] font-bold flex items-center justify-center mt-0.5">{li + 1}</span>
                    <span>{stripped}</span>
                  </li>
                );
              })}
            </ol>
          );
        }
        // Detect bullet list
        const bulletLines = trimmed.split("\n").filter(l => l.trim());
        const isBullet = bulletLines.length > 1 && bulletLines.every(l => /^[•\-\*]/.test(l.trim()));
        if (isBullet) {
          return (
            <ul key={bi} className="space-y-1.5">
              {bulletLines.map((line, li) => (
                <li key={li} className="flex gap-2.5 text-sm text-[var(--foreground)] leading-relaxed">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--secondary)] mt-2" />
                  <span>{line.replace(/^[•\-\*]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        // Plain paragraph — handle inline newlines
        return (
          <p key={bi} className="text-sm text-[var(--foreground)] leading-[1.75] tracking-tight">
            {trimmed.split("\n").map((line, li, arr) => (
              <span key={li}>{line}{li < arr.length - 1 && <br />}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/* ── Code block with copy ────────────────────────────────────────────── */
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group mt-4">
      <div className="flex items-center justify-between bg-[#0d1117] dark:bg-[#090d13] rounded-t-xl px-4 py-2 border border-b-0 border-white/8">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">code</span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="bg-[#0d1117] dark:bg-[#090d13] border border-white/8 rounded-b-xl px-4 py-4 text-sm font-mono text-emerald-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Concept card — fully expanded with rich content ──────────────────── */
function ConceptCard({ concept, idx, typeColor }: { concept: Concept; idx: number; typeColor: string }) {
  const [open, setOpen] = useState(idx < 2);
  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 overflow-hidden",
      open
        ? "border-[var(--secondary)]/25 shadow-sm"
        : "border-[var(--surface-border)] hover:border-[var(--surface-border-strong)]"
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
          open ? "bg-[var(--secondary-light)]/25" : "bg-[var(--card)] hover:bg-[var(--card-hover)]"
        )}
      >
        <span className={cn(
          "flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
          open ? "bg-[var(--secondary)] text-white shadow-sm" : "bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--surface-border)]"
        )}>
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className={cn("font-bold text-sm leading-tight block", open ? "text-[var(--secondary)]" : "text-[var(--foreground)]")}>
            {concept.name}
          </span>
          {!open && (
            <span className="text-xs text-[var(--muted-foreground)] line-clamp-1 mt-0.5 block">
              {concept.explanation.slice(0, 90)}…
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 bg-[var(--card)] space-y-4">
          {/* Explanation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2.5">Explanation</div>
            <RichText text={concept.explanation} />
          </div>

          {/* Example */}
          <div className="rounded-xl border border-[var(--secondary)]/15 bg-[var(--secondary-light)]/10 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", typeColor)}>
                Example
              </span>
            </div>
            <RichText text={concept.example} className="[&_p]:text-[var(--foreground)]" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tutorial step card ───────────────────────────────────────────────── */
function StepCard({ step, isLast }: { step: TutorialStep; isLast: boolean }) {
  return (
    <div className="flex gap-5">
      {/* Step indicator + connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-extrabold shadow-md flex-shrink-0">
          {step.step}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-[var(--secondary)]/30 to-transparent mt-2" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", !isLast && "pb-8")}>
        <div className="bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl p-5 hover:border-[var(--surface-border-strong)] transition-colors">
          <h4 className="font-extrabold text-[var(--foreground)] text-sm mb-3 tracking-tight">{step.title}</h4>
          <RichText text={step.body} />
          {step.code && <CodeBlock code={step.code} />}
        </div>
      </div>
    </div>
  );
}

/* ── Worked example ───────────────────────────────────────────────────── */
function WorkedExamplePanel({ example }: { example: WorkedExample }) {
  const [showSolution, setShowSolution] = useState(false);
  return (
    <div className="space-y-3">
      {/* Problem */}
      <div className="bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-[var(--background)]/60 border-b border-[var(--surface-border)]">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Problem</div>
            <div className="text-sm font-bold text-[var(--foreground)]">{example.title}</div>
          </div>
        </div>
        <div className="p-5">
          <RichText text={example.problem} />
          {!showSolution && (
            <button
              onClick={() => setShowSolution(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--secondary)] text-white text-xs font-bold hover:bg-[var(--secondary-hover)] transition-colors"
            >
              <Play className="h-3.5 w-3.5" /> Show Solution
            </button>
          )}
        </div>
      </div>

      {/* Solution — revealed on demand */}
      {showSolution && (
        <>
          <div className="bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--secondary-light)]/20 border-b border-[var(--secondary)]/15">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-[var(--secondary)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--secondary)]">Solution Walkthrough</span>
              </div>
            </div>
            <div className="p-5">
              <RichText text={example.solution} />
            </div>
          </div>

          {/* Verify */}
          <div className="flex gap-3.5 bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-2xl p-5">
            <CheckCircle2 className="h-5 w-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-2">Verify Your Work</div>
              <RichText text={example.verify} className="[&_p]:text-[var(--foreground)]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Pitfall card ─────────────────────────────────────────────────────── */
function PitfallCard({ pitfall, idx }: { pitfall: Pitfall; idx: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-amber-500/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left bg-amber-500/5 hover:bg-amber-500/8 transition-colors"
      >
        <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 mb-0.5">Pitfall #{idx + 1}</div>
          <div className="font-extrabold text-[var(--foreground)] text-sm">{pitfall.name}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="bg-[var(--card)] p-5 space-y-4">
          {/* What goes wrong */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">What Goes Wrong</span>
            </div>
            <RichText text={pitfall.description} />
          </div>

          {/* The fix */}
          <div className="bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">The Fix</span>
            </div>
            <RichText text={pitfall.fix} className="[&_p]:text-[var(--foreground)]" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pro tip panel ────────────────────────────────────────────────────── */
function ProTipPanel({ proTip }: { proTip: ProTip }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--secondary)]/20 bg-[var(--card)]">
      {/* Top gradient bar */}
      <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)]" />

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--secondary)]/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg flex-shrink-0">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--secondary)] mb-1">Expert Insight</div>
            <h4 className="font-extrabold text-[var(--foreground)] text-lg tracking-tight leading-tight">{proTip.title}</h4>
          </div>
        </div>

        {/* Left accent bar + insight text */}
        <div className="relative pl-5">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]" />
          <RichText text={proTip.insight} className="[&_p]:text-[var(--foreground)] [&_p]:text-base [&_p]:leading-[1.8] [&_p]:font-medium" />
        </div>
      </div>
    </div>
  );
}

/* ── Tab icon renderer ────────────────────────────────────────────────── */
function TabIcon({ icon }: { icon: string }) {
  const map: Record<string, React.ReactNode> = {
    brain: <Brain className="h-3.5 w-3.5" />,
    play: <Play className="h-3.5 w-3.5" />,
    code: <Code2 className="h-3.5 w-3.5" />,
    flask: <FlaskConical className="h-3.5 w-3.5" />,
    quote: <Quote className="h-3.5 w-3.5" />,
    bookmark: <BookMarked className="h-3.5 w-3.5" />,
    shield: <ShieldAlert className="h-3.5 w-3.5" />,
    lightbulb: <Lightbulb className="h-3.5 w-3.5" />,
  };
  return <>{map[icon] ?? <Brain className="h-3.5 w-3.5" />}</>;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export function TutorialInterface({ sourceId }: { sourceId: string }) {
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [tutorialData, setTutorialData] = useState<TutorialData | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("concepts");
  const [scrollPct, setScrollPct] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const mainRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Generate ── */
  const generateTutorial = useCallback(async (force = false) => {
    // Persist "generating" flag so if user switches tabs mid-generation
    // the component can resume automatically on remount
    sessionStorage.setItem(`tutorial-${sourceId}-generating`, force ? "force" : "1");
    setStatus("generating");
    setLoadingProgress(0);
    let msgIdx = 0;
    loadingIntervalRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
      setLoadingProgress(p => Math.min(p + 100 / LOADING_MSGS.length, 90));
    }, 3000);
    try {
      const res = await fetch(`${API_BASE}/ai/tutorial/${sourceId}?force=${force}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildAIHeaders() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TutorialData = await res.json();
      localStorage.setItem(`tutorial-${sourceId}`, JSON.stringify(data));
      if (data.modules.length > 0) setExpandedModules(new Set([data.modules[0].id]));
      setLoadingProgress(100);
      await new Promise(r => setTimeout(r, 500));
      setTutorialData(data);
      setActiveChapter(null);
      setStatus("ready");
      toast.success("Tutorial ready!");
    } catch (err) {
      toast.error("Generation failed. Check your AI provider settings.");
      setStatus("idle");
    } finally {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      // Clear the flag regardless of outcome
      sessionStorage.removeItem(`tutorial-${sourceId}-generating`);
    }
  }, [sourceId]);

  /* ── Load cache or resume in-progress generation ── */
  useEffect(() => {
    const cached = localStorage.getItem(`tutorial-${sourceId}`);
    if (cached) {
      try {
        const parsed: TutorialData = JSON.parse(cached);
        setTutorialData(parsed);
        setStatus("ready");
        const savedTab = sessionStorage.getItem(`tutorial-${sourceId}-tab`) as TabType | null;
        if (savedTab) setActiveTab(savedTab);
        const savedChapter = sessionStorage.getItem(`tutorial-${sourceId}-chapter`);
        if (savedChapter) setActiveChapter(savedChapter);
        const savedCompleted = localStorage.getItem(`tutorial-${sourceId}-completed`);
        if (savedCompleted) setCompletedChapters(new Set(JSON.parse(savedCompleted)));
        if (parsed.modules.length > 0) setExpandedModules(new Set([parsed.modules[0].id]));
        // Clear any stale generating flag now that we have a result
        sessionStorage.removeItem(`tutorial-${sourceId}-generating`);
        return;
      } catch { localStorage.removeItem(`tutorial-${sourceId}`); }
    }

    // No cached result — check if generation was in progress when user switched tabs
    const generatingFlag = sessionStorage.getItem(`tutorial-${sourceId}-generating`);
    if (generatingFlag) {
      // Resume: force=true only if the original call was forced, otherwise hit DB cache
      generateTutorial(generatingFlag === "force");
    }
  }, [sourceId, generateTutorial]);

  /* ── Scroll progress ── */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setScrollPct(scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [status, activeChapter]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    sessionStorage.setItem(`tutorial-${sourceId}-tab`, tab);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectChapter = (chapterId: string) => {
    setActiveChapter(chapterId);
    sessionStorage.setItem(`tutorial-${sourceId}-chapter`, chapterId);
    setActiveTab("concepts");
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markComplete = (chapterId: string) => {
    setCompletedChapters(prev => {
      const next = new Set(prev);
      next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
      localStorage.setItem(`tutorial-${sourceId}-completed`, JSON.stringify([...next]));
      return next;
    });
  };

  /* ── Derived data ── */
  const allFlat = tutorialData ? flatChapters(tutorialData.modules) : [];
  const currentEntry = allFlat.find(e => e.chapter.id === activeChapter);
  const currentChapter = currentEntry?.chapter ?? null;
  const currentModule  = currentEntry?.module ?? null;
  const currentIdx     = currentEntry?.globalIdx ?? -1;
  const prevEntry = currentIdx > 0 ? allFlat[currentIdx - 1] : null;
  const nextEntry = currentIdx >= 0 && currentIdx < allFlat.length - 1 ? allFlat[currentIdx + 1] : null;
  const tabCfg = tutorialData ? (TAB_CONFIG[tutorialData.topicType] ?? TAB_CONFIG.Technical) : TAB_CONFIG.Technical;
  const typeColor = tutorialData ? (TOPIC_COLORS[tutorialData.topicType] ?? "") : "";

  const filteredModules = tutorialData?.modules.map(m => ({
    ...m,
    chapters: m.chapters.filter(c =>
      !sidebarSearch ||
      c.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      m.title.toLowerCase().includes(sidebarSearch.toLowerCase())
    ),
  })).filter(m => !sidebarSearch || m.chapters.length > 0) ?? [];

  /* ══════════ GENERATE STATE ══════════ */
  if (status === "idle") return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center min-h-[65vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/20 to-[var(--secondary)]/20 blur-3xl rounded-full scale-150" />
        <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-2xl">
          <GraduationCap className="h-12 w-12 text-white" />
        </div>
      </div>
      <div className="max-w-lg">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--secondary-light)] border border-[var(--secondary)]/20 text-[var(--secondary)] text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="h-3 w-3" /> Deep-Dive Study Guide
        </div>
        <h3 className="text-2xl font-extrabold text-[var(--foreground)] mb-3 tracking-tight">Generate Your Tutorial</h3>
        <p className="text-[var(--muted-foreground)] leading-relaxed mb-8 text-sm">
          Claude analyzes this source and builds a premium, chapter-by-chapter tutorial with substantive concept explanations, code-level worked examples, named pitfalls with root-cause analysis, and expert pro tips — all tuned to the actual topic type.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8 text-left">
          {[
            { icon: <Layers className="h-4 w-4 text-[var(--secondary)]" />, label: "4–5 Modules", sub: "Coherent learning arc" },
            { icon: <BookOpen className="h-4 w-4 text-[var(--primary)]" />, label: "10–14 Chapters", sub: "Rich, multi-paragraph" },
            { icon: <Target className="h-4 w-4 text-amber-500" />, label: "5 Tabs each", sub: "Concepts → Pro Tip" },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-[var(--card)] border border-[var(--surface-border)] rounded-xl p-3.5">
              <div className="mb-2">{icon}</div>
              <div className="text-[var(--foreground)] text-sm font-bold">{label}</div>
              <div className="text-[var(--muted-foreground)] text-xs mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => generateTutorial(false)}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          <GraduationCap className="h-5 w-5" /> Generate Tutorial
        </button>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">~60–90 seconds · Cached for future visits</p>
      </div>
    </div>
  );

  /* ══════════ LOADING STATE ══════════ */
  if (status === "generating") return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center min-h-[65vh]">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-[var(--secondary)]/20 blur-3xl rounded-full scale-150" />
        <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-2xl">
          <Brain className="h-12 w-12 text-white animate-pulse" />
        </div>
      </div>
      <h3 className="text-xl font-extrabold text-[var(--foreground)] mb-2 tracking-tight">Building Your Tutorial</h3>
      <p className="text-[var(--muted-foreground)] text-sm mb-8 min-h-[1.4rem] transition-all">{loadingMsg}</p>
      <div className="w-72 mb-2">
        <div className="h-2 bg-[var(--surface-border)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-[2s]" style={{ width: `${loadingProgress}%` }} />
        </div>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] font-mono">{Math.round(loadingProgress)}%</p>
      <p className="mt-4 text-xs text-[var(--muted-foreground)]/60">Writing multi-paragraph content for every concept, step, and example…</p>
    </div>
  );

  /* ══════════ HOME STATE ══════════ */
  if (status === "ready" && tutorialData && !activeChapter) {
    const totalDone = completedChapters.size;
    const total = allFlat.length;
    const pct = total > 0 ? (totalDone / total) * 100 : 0;
    return (
      <div className="space-y-6 pb-12">
        {/* Hero */}
        <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl p-7 sm:p-9">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--secondary)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[var(--primary)]/6 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", typeColor)}>
                <BookOpen className="h-3 w-3" /> {tutorialData.topicType}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-[var(--surface-border)] bg-[var(--background)] text-[var(--muted-foreground)]">
                <Zap className="h-3 w-3" /> {tutorialData.theme}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 leading-tight"
              style={{ background: "linear-gradient(135deg, var(--foreground) 0%, var(--secondary) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {tutorialData.title}
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm mb-6 max-w-2xl">{tutorialData.centralMentalModel.tagline}</p>
            {/* Stats */}
            <div className="flex flex-wrap gap-5 mb-6">
              {[
                { icon: <Layers className="h-4 w-4 text-[var(--secondary)]" />, val: tutorialData.stats.modules, label: "Modules" },
                { icon: <BookOpen className="h-4 w-4 text-[var(--primary)]" />, val: tutorialData.stats.chapters, label: "Chapters" },
                { icon: <Brain className="h-4 w-4 text-[var(--accent)]" />, val: tutorialData.stats.concepts, label: "Concepts" },
                { icon: <Clock className="h-4 w-4 text-amber-500" />, val: `${tutorialData.stats.estimatedMinutes}m`, label: "Est. read" },
              ].map(({ icon, val, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {icon}
                  <span className="text-[var(--foreground)] font-extrabold text-sm">{val}</span>
                  <span className="text-[var(--muted-foreground)] text-xs">{label}</span>
                </div>
              ))}
            </div>
            {/* Progress */}
            {totalDone > 0 && (
              <div>
                <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1.5">
                  <span>{totalDone}/{total} chapters done</span>
                  <span className="text-[var(--primary)] font-bold">{Math.round(pct)}%</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Central mental model */}
        <div className="bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Central Mental Model</span>
          </div>
          <h3 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">{tutorialData.centralMentalModel.name}</h3>
          <p className="text-[var(--muted-foreground)] text-sm leading-relaxed mb-5">{tutorialData.centralMentalModel.description}</p>
          {/* Module chain diagram */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {tutorialData.modules.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => selectChapter(m.chapters[0]?.id)}
                  className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-[var(--background)] hover:bg-[var(--secondary-light)] border border-[var(--surface-border)] hover:border-[var(--secondary)]/30 transition-all group min-w-[90px] text-center"
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] group-hover:text-[var(--secondary)] leading-tight">{m.title}</span>
                </button>
                {i < tutorialData.modules.length - 1 && <ChevronRight className="h-4 w-4 text-[var(--surface-border-strong)] flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Module grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">All Modules</h2>
            <button onClick={() => generateTutorial(true)} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <RotateCcw className="h-3 w-3" /> Regenerate
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tutorialData.modules.map((mod, mi) => {
              const done = mod.chapters.filter(c => completedChapters.has(c.id)).length;
              return (
                <div key={mod.id}
                  onClick={() => selectChapter(mod.chapters[0]?.id)}
                  className="group bg-[var(--card)] border border-[var(--surface-border)] hover:border-[var(--secondary)]/30 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg cursor-pointer">
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="h-11 w-11 rounded-xl bg-[var(--background)] border border-[var(--surface-border)] flex items-center justify-center text-2xl flex-shrink-0">
                      {mod.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">Module {mi + 1} · {mod.chapters.length} chapters</div>
                      <h3 className="font-extrabold text-[var(--foreground)] text-sm leading-tight group-hover:text-[var(--secondary)] transition-colors">{mod.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4 line-clamp-2">{mod.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 items-center">
                      {mod.chapters.map(c => (
                        <div key={c.id} className={cn("h-1.5 rounded-full transition-all duration-300", completedChapters.has(c.id) ? "bg-[var(--primary)] w-5" : "bg-[var(--surface-border)] w-2")} />
                      ))}
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{done}/{mod.chapters.length} done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════ CHAPTER VIEW ══════════ */
  if (status === "ready" && tutorialData && currentChapter && currentModule) {
    const isCompleted = completedChapters.has(currentChapter.id);

    const SidebarContent = () => (
      <div className="flex flex-col h-full gap-3">
        <button
          onClick={() => setActiveChapter(null)}
          className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-border)]/30 transition-colors"
        >
          <Home className="h-3.5 w-3.5" /> Tutorial Home
        </button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <input
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            placeholder="Search chapters..."
            className="w-full bg-[var(--surface-input)] border border-[var(--surface-border)] rounded-xl pl-8 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--secondary)]/50"
          />
          {sidebarSearch && <button onClick={() => setSidebarSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /></button>}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {filteredModules.map(mod => {
            const exp = expandedModules.has(mod.id);
            const done = mod.chapters.filter(c => completedChapters.has(c.id)).length;
            return (
              <div key={mod.id}>
                <button
                  onClick={() => setExpandedModules(prev => { const n = new Set(prev); n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id); return n; })}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[var(--surface-border)]/30 transition-colors"
                >
                  <span className="text-base flex-shrink-0">{mod.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-[var(--foreground)] truncate block">{mod.title}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{done}/{mod.chapters.length}</span>
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--muted-foreground)] flex-shrink-0 transition-transform", exp && "rotate-180")} />
                </button>
                {exp && (
                  <div className="ml-4 pl-3 border-l border-[var(--surface-border)] space-y-0.5 py-1">
                    {mod.chapters.map(ch => {
                      const active = ch.id === activeChapter;
                      const done2 = completedChapters.has(ch.id);
                      return (
                        <button key={ch.id} onClick={() => selectChapter(ch.id)}
                          className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] transition-all",
                            active ? "bg-[var(--secondary-light)] text-[var(--secondary)] font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)]/30")}>
                          {done2
                            ? <CheckCircle2 className="h-3 w-3 text-[var(--primary)] flex-shrink-0" />
                            : <Circle className={cn("h-3 w-3 flex-shrink-0", active ? "text-[var(--secondary)]" : "text-[var(--surface-border-strong)]")} />}
                          <span className="truncate flex-1">{ch.title}</span>
                          <span className="text-[9px] text-[var(--muted-foreground)] ml-auto flex-shrink-0">{ch.duration}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-[var(--surface-border)]">
          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mb-1.5">
            <span>Progress</span>
            <span className="text-[var(--primary)] font-bold">{completedChapters.size}/{allFlat.length}</span>
          </div>
          <div className="h-1 bg-[var(--surface-border)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-500"
              style={{ width: `${allFlat.length > 0 ? (completedChapters.size / allFlat.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    );

    return (
      <div className="flex min-h-0 gap-0 h-full">
        {/* Scroll progress bar */}
        <div className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-[var(--surface-border)]">
          <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-100" style={{ width: `${scrollPct}%` }} />
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl p-4 mr-5 h-[calc(100vh-200px)] sticky top-4 overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-[var(--card)] border-r border-[var(--surface-border)] p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">Chapters</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-[var(--surface-border)]/30"><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
              </div>
              <div className="h-[calc(100%-3rem)]"><SidebarContent /></div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div ref={mainRef} className="flex-1 min-w-0 overflow-y-auto pb-12 scroll-smooth">
          {/* Chapter header */}
          <div className="bg-[var(--card)] border border-[var(--surface-border)] rounded-2xl p-5 mb-5 sticky top-0 z-10 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--surface-border)]/30 text-[var(--muted-foreground)]">
                    <Menu className="h-4 w-4" />
                  </button>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                    <span className="text-base">{currentModule.emoji}</span> {currentModule.title}
                  </span>
                  <ChevronRight className="h-3 w-3 text-[var(--surface-border-strong)]" />
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", typeColor)}>{tutorialData.topicType}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight leading-tight">{currentChapter.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--muted-foreground)] bg-[var(--background)] border border-[var(--surface-border)] rounded-xl px-2.5 py-1.5">
                  <Clock className="h-3 w-3" /> {currentChapter.duration}
                </span>
                <button
                  onClick={() => markComplete(currentChapter.id)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                    isCompleted ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20" : "bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--surface-border)]")}>
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {isCompleted ? "Done" : "Mark done"}
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {(Object.keys(tabCfg) as TabType[]).map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0",
                    activeTab === tab ? "bg-[var(--secondary-light)] text-[var(--secondary)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)]/30")}>
                  <TabIcon icon={tabCfg[tab].icon} />
                  {tabCfg[tab].label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="space-y-4">
            {/* CONCEPTS */}
            {activeTab === "concepts" && (
              <div className="space-y-3">
                {currentChapter.concepts.map((c, i) => (
                  <ConceptCard key={i} concept={c} idx={i} typeColor={typeColor} />
                ))}
              </div>
            )}

            {/* TUTORIAL STEPS */}
            {activeTab === "tutorial" && (
              <div className="space-y-0">
                {currentChapter.tutorialSteps.map((step, i) => (
                  <StepCard key={i} step={step} isLast={i === currentChapter.tutorialSteps.length - 1} />
                ))}
              </div>
            )}

            {/* EXAMPLE */}
            {activeTab === "example" && currentChapter.workedExample && (
              <WorkedExamplePanel example={currentChapter.workedExample} />
            )}

            {/* PITFALLS */}
            {activeTab === "pitfalls" && (
              <div className="space-y-3">
                {currentChapter.pitfalls.map((p, i) => (
                  <PitfallCard key={i} pitfall={p} idx={i} />
                ))}
              </div>
            )}

            {/* PRO TIP */}
            {activeTab === "protip" && currentChapter.proTip && (
              <ProTipPanel proTip={currentChapter.proTip} />
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between mt-8 gap-3">
            <div className="flex-1">
              {prevEntry && (
                <button onClick={() => selectChapter(prevEntry.chapter.id)}
                  className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--card)] border border-[var(--surface-border)] hover:border-[var(--secondary)]/30 rounded-2xl transition-all w-full text-left hover:shadow-md">
                  <ChevronLeft className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--secondary)] flex-shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Previous</div>
                    <div className="text-sm font-bold text-[var(--foreground)] truncate group-hover:text-[var(--secondary)] transition-colors">{prevEntry.chapter.title}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{prevEntry.module.emoji} {prevEntry.module.title}</div>
                  </div>
                </button>
              )}
            </div>
            <button onClick={() => setActiveChapter(null)} className="flex-shrink-0 p-3 rounded-2xl bg-[var(--card)] border border-[var(--surface-border)] hover:border-[var(--secondary)]/30 text-[var(--muted-foreground)] hover:text-[var(--secondary)] transition-all" title="Tutorial home">
              <Home className="h-4 w-4" />
            </button>
            <div className="flex-1 flex justify-end">
              {nextEntry && (
                <button onClick={() => selectChapter(nextEntry.chapter.id)}
                  className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--card)] border border-[var(--surface-border)] hover:border-[var(--secondary)]/30 rounded-2xl transition-all w-full text-right hover:shadow-md">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-bold">Next</div>
                    <div className="text-sm font-bold text-[var(--foreground)] truncate group-hover:text-[var(--secondary)] transition-colors">{nextEntry.chapter.title}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{nextEntry.module.emoji} {nextEntry.module.title}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--secondary)] flex-shrink-0 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
