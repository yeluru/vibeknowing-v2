"use client";

import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { ChevronDown, Loader2, Briefcase, Plus, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/* ── Types ──────────────────────────────────────────────────────────── */
export interface InterviewQuestion {
  difficulty: "easy" | "medium" | "hard";
  question: string;
  answer: string;
}

interface InterviewData {
  topic: string;
  questions: InterviewQuestion[];
}

export type InterviewEntityType = "project" | "category" | "mission";

interface InterviewPrepPanelProps {
  entityType: InterviewEntityType;
  entityId: string;
}

/* ── Difficulty config ───────────────────────────────────────────────── */
const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  hard: {
    label: "Hard",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
};

/* ── Single question card ────────────────────────────────────────────── */
function QuestionCard({ q, idx }: { q: InterviewQuestion; idx: number }) {
  const [open, setOpen] = useState(false);
  const cfg = DIFFICULTY_CONFIG[q.difficulty];

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-200 overflow-hidden",
      open
        ? "border-[var(--surface-border-strong)] shadow-sm"
        : "border-[var(--surface-border)] hover:border-[var(--surface-border-strong)]"
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-start gap-3 px-3 py-3 sm:px-5 sm:py-4 text-left transition-colors",
          open ? "bg-[var(--card-hover)]" : "bg-[var(--card)] hover:bg-[var(--card-hover)]"
        )}
      >
        <span className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-lg bg-[var(--background)] border border-[var(--surface-border)] text-[var(--muted-foreground)] text-[11px] font-bold flex items-center justify-center">
          {idx + 1}
        </span>
        <span className="flex-1 min-w-0 text-sm font-semibold text-[var(--foreground)] leading-snug">
          {q.question}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
            cfg.bg, cfg.text, cfg.border
          )}>
            {cfg.label}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200 flex-shrink-0",
            open && "rotate-180"
          )} />
        </div>
      </button>

      {open && (
        <div className="px-3 py-3 sm:px-5 sm:py-4 bg-[var(--card)] border-t border-[var(--surface-border)]">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--secondary)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
              Model Answer
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--foreground)] leading-[1.75] [&_.katex]:text-[var(--foreground)] [&_code]:text-[var(--secondary)] [&_code]:bg-[var(--surface-input)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {q.answer}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Set block ───────────────────────────────────────────────────────── */
function QuestionSet({ questions, setNumber, isLatest }: {
  questions: InterviewQuestion[];
  setNumber: number;
  isLatest: boolean;
}) {
  const depthLabel = setNumber === 1
    ? "Foundational"
    : setNumber === 2
    ? "Advanced"
    : setNumber === 3
    ? "Expert"
    : "Frontier";

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isLatest
        ? "border-[var(--secondary)]/30 shadow-sm shadow-[var(--secondary)]/10"
        : "border-[var(--surface-border)]"
    )}>
      {/* Set header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-3 sm:px-5 border-b",
        isLatest
          ? "bg-[var(--secondary-light)]/15 border-[var(--secondary)]/20"
          : "bg-[var(--background)] border-[var(--surface-border)]"
      )}>
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "text-xs font-extrabold tracking-tight",
            isLatest ? "text-[var(--secondary)]" : "text-[var(--muted-foreground)]"
          )}>
            Set {setNumber}
          </span>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
            isLatest
              ? "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20"
              : "bg-[var(--surface-border)]/40 text-[var(--muted-foreground)] border-[var(--surface-border)]"
          )}>
            {depthLabel}
          </span>
          {isLatest && (
            <span className="text-[10px] font-bold text-[var(--secondary)] flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> New
            </span>
          )}
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {questions.filter(q => q.difficulty === "easy").length}E ·{" "}
          {questions.filter(q => q.difficulty === "medium").length}M ·{" "}
          {questions.filter(q => q.difficulty === "hard").length}H
        </span>
      </div>

      {/* Questions */}
      <div className="p-3 sm:p-4 space-y-3 bg-[var(--card)]">
        {questions.map((q, i) => (
          <QuestionCard key={i} q={q} idx={i} />
        ))}
      </div>
    </div>
  );
}

/* ── Main panel (forwardRef so parent can scroll to it) ──────────────── */
export const InterviewPrepPanel = forwardRef<HTMLDivElement, InterviewPrepPanelProps>(
  function InterviewPrepPanel({ entityType, entityId }, ref) {
    // Each element is one set of 5 questions
    const [sets, setSets] = useState<InterviewQuestion[][]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const batchRef = useRef(0);

    const cacheKey = `interview-${entityType}-${entityId}`;
    const apiBase = `${API_BASE}/ai/interview/${entityType}/${entityId}`;
    const newSetRef = useRef<HTMLDivElement>(null);

    function buildHeaders(): Record<string, string> {
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

    function saveToCache(allSets: InterviewQuestion[][]) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ sets: allSets, batch: batchRef.current }));
      } catch {}
    }

    const generate = useCallback(async (isMore = false) => {
      setGenerating(true);
      const batch = isMore ? batchRef.current : 0;
      try {
        const res = await fetch(`${apiBase}?force=true&batch=${batch}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...buildHeaders() },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const result: InterviewData = await res.json();
        const incoming = result.questions ?? [];

        setSets(prev => {
          const updated = isMore ? [...prev, incoming] : [incoming];
          batchRef.current = updated.length;
          saveToCache(updated);
          return updated;
        });

        toast.success(isMore ? "Set added!" : "Interview questions ready!");

        if (isMore) {
          setTimeout(() => {
            newSetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 200);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to generate interview questions.");
      } finally {
        setGenerating(false);
      }
    }, [apiBase, cacheKey]);

    // On mount: localStorage → backend → auto-generate
    useEffect(() => {
      batchRef.current = 0;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Support both old flat format and new sets format
          if (parsed.sets?.length) {
            setSets(parsed.sets);
            batchRef.current = parsed.batch ?? parsed.sets.length;
            return;
          }
          // Old flat format → wrap as single set
          const qs = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
          if (qs.length) {
            setSets([qs]);
            batchRef.current = 1;
            return;
          }
        } catch { localStorage.removeItem(cacheKey); }
      }
      setLoading(true);
      fetch(apiBase, { headers: buildHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then((result: InterviewData | null) => {
          if (result?.questions?.length) {
            setSets([result.questions]);
            batchRef.current = 1;
            saveToCache([result.questions]);
          } else {
            generate(false);
          }
        })
        .catch(() => generate(false))
        .finally(() => setLoading(false));
    }, [entityId, entityType]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Loading ── */
    if (loading || (generating && sets.length === 0)) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-[var(--secondary-light)]/30 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-[var(--secondary)]" />
            </div>
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-[var(--secondary)] animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">Generating interview questions…</p>
            <p className="text-xs mt-1 text-[var(--muted-foreground)] opacity-70">Crafting questions a real interviewer would ask</p>
          </div>
        </div>
      );
    }

    if (!sets.length) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-[var(--muted-foreground)]">
          <Briefcase className="h-10 w-10 opacity-20" />
          <p className="text-sm font-semibold">No questions yet.</p>
          <button onClick={() => generate(false)} className="vk-btn vk-btn-primary text-sm px-4 py-2">
            Generate Questions
          </button>
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-5">
        {/* Difficulty legend */}
        <div className="flex items-center gap-4">
          {(["easy", "medium", "hard"] as const).map(d => (
            <div key={d} className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", DIFFICULTY_CONFIG[d].dot)} />
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium capitalize">{d}</span>
            </div>
          ))}
        </div>

        {/* Sets */}
        {sets.map((qs, i) => {
          const isLatest = i === sets.length - 1 && sets.length > 1;
          return (
            <div key={i} ref={isLatest ? newSetRef : undefined}>
              <QuestionSet questions={qs} setNumber={i + 1} isLatest={isLatest} />
            </div>
          );
        })}

        {/* Generate More */}
        <button
          onClick={() => generate(true)}
          disabled={generating}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 border-dashed font-bold text-sm transition-all duration-200",
            generating
              ? "border-[var(--secondary)]/30 text-[var(--secondary)] bg-[var(--secondary-light)]/10 cursor-not-allowed"
              : "border-[var(--surface-border-strong)] text-[var(--muted-foreground)] hover:border-[var(--secondary)]/50 hover:text-[var(--secondary)] hover:bg-[var(--secondary-light)]/10"
          )}
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating Set {sets.length + 1}…</>
          ) : (
            <><Plus className="h-4 w-4" /><Sparkles className="h-3.5 w-3.5" /> Generate Set {sets.length + 1}</>
          )}
        </button>

        {sets.length > 1 && (
          <p className="text-center text-[10px] text-[var(--muted-foreground)] opacity-60">
            {sets.length} sets · questions get progressively deeper with each set
          </p>
        )}
      </div>
    );
  }
);
