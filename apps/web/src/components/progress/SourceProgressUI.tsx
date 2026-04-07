"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, BookOpen, Brain, Telescope } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceProgress } from "@/hooks/useSourceProgress";

// ─── Mastery Ring ─────────────────────────────────────────────────────────────

interface MasteryRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function MasteryRing({
  score,
  size = 40,
  strokeWidth = 3.5,
  className,
  showLabel = false,
}: MasteryRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#10b981" : // emerald
    score >= 50 ? "#6366f1" : // indigo
    score >= 20 ? "#f59e0b" : // amber
    "#94a3b8";                 // slate

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute text-[10px] font-black tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Progress Steps ────────────────────────────────────────────────────────────

interface ProgressStepsProps {
  progress: SourceProgress;
  onTabChange: (tab: string) => void;
}

const STEPS = [
  { key: "hasTranscript", label: "Read", icon: BookOpen },
  { key: "hasSummary",    label: "Summary", icon: Sparkles },
  { key: "hasQuiz",       label: "Quizzed", icon: Brain },
  { key: "hasFlashcards", label: "Cards", icon: CheckCircle2 },
  { key: "hasVanguard",   label: "Explored", icon: Telescope },
] as const;

export function ProgressSteps({ progress }: ProgressStepsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, i) => {
        const done = progress[step.key];
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              title={step.label}
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-500",
                done
                  ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}
            >
              <Icon className="h-2.5 w-2.5" />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-3 transition-all duration-500",
                  done ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Smart Nudge Bar ───────────────────────────────────────────────────────────

interface NudgeBarProps {
  progress: SourceProgress;
  onTabChange: (tab: "transcript" | "summary" | "chat" | "quiz" | "flashcards" | "studio" | "view" | "podcast") => void;
}

const NUDGE_STYLES = {
  high: {
    bar: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30",
    dot: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    sub: "text-indigo-500/80 dark:text-indigo-400/70",
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/30",
    pulse: true,
  },
  medium: {
    bar: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30",
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    sub: "text-violet-500/80 dark:text-violet-400/70",
    btn: "bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/30",
    pulse: false,
  },
  low: {
    bar: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-700 dark:text-slate-300",
    sub: "text-slate-500 dark:text-slate-400",
    btn: "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white",
    pulse: false,
  },
};

export function SmartNudgeBar({ progress, onTabChange }: NudgeBarProps) {
  const { nudge, loading } = progress;

  if (loading || !nudge) return null;

  const style = NUDGE_STYLES[nudge.priority];

  const handleClick = () => {
    // Map nudge tab string to valid tab value
    const tab = nudge.tab as any;
    onTabChange(tab);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5 border-b",
          style.bar
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulsing dot indicator */}
          <div className="relative flex-shrink-0">
            <div className={cn("h-2 w-2 rounded-full", style.dot)} />
            {style.pulse && (
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-60",
                style.dot
              )} />
            )}
          </div>

          <div className="min-w-0">
            <p className={cn("text-xs font-bold truncate", style.text)}>
              {nudge.label}
            </p>
            <p className={cn("text-[10px] truncate hidden sm:block", style.sub)}>
              {nudge.description}
            </p>
          </div>
        </div>

        <button
          onClick={handleClick}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]",
            style.btn
          )}
        >
          Start <ArrowRight className="h-3 w-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Vanguard Badge ────────────────────────────────────────────────────────────

interface VanguardBadgeProps {
  count: number;
  onOpen: () => void;
  className?: string;
}

export function VanguardBadge({ count, onOpen, className }: VanguardBadgeProps) {
  if (count === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpen}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 rounded-xl",
        "bg-gradient-to-r from-violet-500/10 to-indigo-500/10",
        "border border-violet-300/50 dark:border-violet-500/30",
        "hover:border-violet-400/70 dark:hover:border-violet-400/50",
        "hover:from-violet-500/15 hover:to-indigo-500/15",
        "transition-all duration-300 hover:scale-[1.02]",
        className
      )}
    >
      <div className="relative">
        <Telescope className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
      </div>
      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap">
        Vanguard: {count} resource{count !== 1 ? "s" : ""} found
      </span>
      <ArrowRight className="h-3 w-3 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
    </motion.button>
  );
}
