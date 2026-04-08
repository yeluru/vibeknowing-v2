"use client";

/**
 * OnboardingCoach — 8-step guided tour for first-time authenticated users.
 *
 * Steps:
 *  1. URL input         — "Drop anything here"
 *  2. Analyze button    — "Hit Analyze — your kit is ready in 60 s"
 *  3. Study Kit tabs    — Transcript · Summary · Chat · Flashcards · Quiz · Podcast · Studio
 *  4. Vanguard AI       — AI recommendations sidepanel inside each project
 *  5. Flashcard reviews — Spaced repetition scheduler
 *  6. Learning Paths    — Sidebar: organize sources into topics
 *  7. Content Studio    — Sidebar: turn notes into posts / articles / diagrams
 *  8. Knowledge Base    — Sidebar: chat across your entire library
 *
 * Anchored steps show a spotlight + directional arrow.
 * Floating steps (center) dim the background and show a centered card.
 * Persisted via localStorage "vl_onboarding_done". Portal-rendered z-9999.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, Sparkles, Brain, BookOpen, FlaskConical,
  Flame, FileText, Headphones, MessageCircle, Palette,
  Layers, Route, Telescope, ChevronRight,
} from "lucide-react";

const STORAGE_KEY = "vl_onboarding_done";
const TOOLTIP_W   = 340;
const GAP         = 14;
const ARROW_SZ    = 10;

// ─── types ───────────────────────────────────────────────────────────────────

type Placement = "bottom" | "right" | "center";

interface Feature { icon: React.ReactNode; label: string; desc: string }

interface StepDef {
  targetSelector: string | null;
  placement: Placement;
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  features?: Feature[];
  cta: string;
}

// ─── step definitions ────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  // 1 ── URL input
  {
    targetSelector: "[data-onboarding='url-input']",
    placement: "bottom",
    icon: <Sparkles className="h-3.5 w-3.5 text-indigo-500" />,
    label: "Paste",
    title: "Drop anything here",
    body: "Paste a YouTube link, PDF, article, Instagram post, TED talk — any URL or file. VibeLearn extracts everything worth knowing from it.",
    cta: "Next",
  },

  // 2 ── Analyze button
  {
    targetSelector: "[data-onboarding='submit-btn']",
    placement: "bottom",
    icon: <Brain className="h-3.5 w-3.5 text-violet-500" />,
    label: "Analyze",
    title: "Hit Analyze",
    body: "In about 60 seconds your full study kit is ready — no manual work needed. VibeLearn reads, extracts, and structures everything automatically.",
    cta: "Next",
  },

  // 3 ── Study kit tabs (floating — no single DOM target)
  {
    targetSelector: null,
    placement: "center",
    icon: <Layers className="h-3.5 w-3.5 text-sky-500" />,
    label: "Study Kit",
    title: "Your study kit — 7 tools in one",
    body: "Every source you add unlocks these tabs automatically:",
    features: [
      { icon: <FileText className="h-4 w-4 text-slate-500" />,     label: "Transcript",  desc: "Full raw text, timestamped" },
      { icon: <Sparkles className="h-4 w-4 text-indigo-500" />,    label: "Summary",     desc: "Key ideas, distilled by AI" },
      { icon: <MessageCircle className="h-4 w-4 text-sky-500" />,  label: "Chat",        desc: "Ask anything about the source" },
      { icon: <BookOpen className="h-4 w-4 text-emerald-500" />,   label: "Flashcards",  desc: "Auto-generated card deck" },
      { icon: <FlaskConical className="h-4 w-4 text-violet-500" />,label: "Quiz",        desc: "Active recall questions" },
      { icon: <Headphones className="h-4 w-4 text-pink-500" />,    label: "Podcast",     desc: "AI audio summary to listen to" },
      { icon: <Palette className="h-4 w-4 text-orange-500" />,     label: "Studio",      desc: "Turn content into posts & diagrams" },
    ],
    cta: "Next",
  },

  // 4 ── Vanguard AI agent (floating)
  {
    targetSelector: null,
    placement: "center",
    icon: <Telescope className="h-3.5 w-3.5 text-amber-500" />,
    label: "Vanguard",
    title: "Vibe-Vanguard AI Agent",
    body: "Open the Summary, Transcript, or View tab on any project and Vanguard appears on the right side. It's your AI research assistant — it reads what you're studying and recommends what to learn next, surfaces related sources, and builds your learning path automatically.",
    features: [
      { icon: <Telescope className="h-4 w-4 text-amber-500" />,    label: "Smart recommendations", desc: "Surfaces what matters next" },
      { icon: <Route className="h-4 w-4 text-sky-500" />,          label: "Path builder",          desc: "Adds sources to your learning path" },
      { icon: <Brain className="h-4 w-4 text-violet-500" />,       label: "Context-aware",         desc: "Reads the current source you're on" },
    ],
    cta: "Next",
  },

  // 5 ── Spaced repetition / streak (floating)
  {
    targetSelector: null,
    placement: "center",
    icon: <Flame className="h-3.5 w-3.5 text-orange-500" />,
    label: "Streak",
    title: "Review daily — build your streak",
    body: "VibeLearn schedules your flashcard reviews using spaced repetition (SM-2). Cards due today appear at the top. Rate each card Easy / Medium / Hard and the algorithm decides when to show it again — so you study less but remember more.",
    features: [
      { icon: <Flame className="h-4 w-4 text-orange-500" />,       label: "Daily streak",          desc: "Tracks your consistency" },
      { icon: <BookOpen className="h-4 w-4 text-sky-500" />,       label: "Due cards",             desc: "Only what needs review today" },
      { icon: <Sparkles className="h-4 w-4 text-indigo-500" />,    label: "SM-2 algorithm",        desc: "Proven spaced repetition science" },
    ],
    cta: "Next",
  },

  // 6 ── Learning Paths (sidebar)
  {
    targetSelector: "[data-onboarding='nav-paths']",
    placement: "right",
    icon: <Route className="h-3.5 w-3.5 text-emerald-500" />,
    label: "Paths",
    title: "Organize with Learning Paths",
    body: "Group related sources into a Learning Path — like a folder for a course, book, or topic. Hit + to create one, then drag sources into it. Each path has its own progress tracker.",
    cta: "Next",
  },

  // 7 ── Content Studio (sidebar nav)
  {
    targetSelector: "[data-onboarding='nav-studio']",
    placement: "right",
    icon: <Palette className="h-3.5 w-3.5 text-orange-500" />,
    label: "Studio",
    title: "Content Studio",
    body: "Turn what you learn into shareable content. Generate LinkedIn posts, Twitter threads, Instagram captions, full articles, or visual diagrams — all from the sources in your library. Great for creators and students who want to teach what they learn.",
    cta: "Next",
  },

  // 8 ── Knowledge Base chat (sidebar nav)
  {
    targetSelector: "[data-onboarding='nav-chat']",
    placement: "right",
    icon: <MessageCircle className="h-3.5 w-3.5 text-sky-500" />,
    label: "Knowledge Base",
    title: "Chat with your entire library",
    body: "Knowledge Base lets you ask questions across every source you've ever added — not just one project. Ask things like \"What do all my sources say about sleep?\" and get a synthesized answer with citations.",
    cta: "Let's go!",
  },
];

// ─── geometry ─────────────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

function getRect(sel: string): Rect | null {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface TPos { top: number; left: number; arrowLeft?: number; arrowTop?: number; placement: Placement }

function computePos(rect: Rect, placement: "bottom" | "right", tooltipH: number, vw: number, vh: number): TPos {
  let top = 0, left = 0, arrowLeft: number | undefined, arrowTop: number | undefined;
  let resolvedPlacement: Placement = placement;

  if (placement === "bottom") {
    top  = rect.top + rect.height + GAP;
    left = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
    arrowLeft = rect.left + rect.width / 2 - left;
    if (top + tooltipH > vh - 16) top = rect.top - tooltipH - GAP;
  } else {
    left = rect.left + rect.width + GAP;
    top  = Math.max(16, Math.min(rect.top + rect.height / 2 - tooltipH / 2, vh - tooltipH - 16));
    arrowTop = rect.top + rect.height / 2 - top;
    // flip below if sidebar pushes off-screen
    if (left + TOOLTIP_W > vw - 16) {
      left = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
      top  = rect.top + rect.height + GAP;
      resolvedPlacement = "bottom";
      arrowTop = undefined;
      arrowLeft = rect.left + rect.width / 2 - left;
    }
  }
  return { top, left, arrowLeft, arrowTop, placement: resolvedPlacement };
}

// ─── spotlight ────────────────────────────────────────────────────────────────

function Spotlight({ rect }: { rect: Rect }) {
  const p = 8;
  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9997 }}>
      <defs>
        <mask id="vl-coach-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={rect.left - p} y={rect.top - p} width={rect.width + p * 2} height={rect.height + p * 2} rx={10} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.62)" mask="url(#vl-coach-mask)" />
      <rect x={rect.left - p} y={rect.top - p} width={rect.width + p * 2} height={rect.height + p * 2}
        rx={10} fill="none" stroke="rgba(99,102,241,0.85)" strokeWidth={2} />
    </svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function OnboardingCoach() {
  const [step,      setStep]      = useState(0);
  const [visible,   setVisible]   = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [tRect,     setTRect]     = useState<Rect | null>(null);
  const [pos,       setPos]       = useState<TPos>({ top: 0, left: 0, placement: "center" });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => {
      if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) setVisible(true);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const recalc = useCallback(() => {
    const def = STEPS[step];
    if (!def || !visible) return;

    const centered = (): TPos => ({
      top:  window.innerHeight / 2 - (tooltipRef.current?.offsetHeight || 240) / 2,
      left: window.innerWidth  / 2 - TOOLTIP_W / 2,
      placement: "center",
    });

    if (!def.targetSelector || def.placement === "center") {
      setTRect(null);
      setPos(centered());
      return;
    }

    const rect = getRect(def.targetSelector);
    if (!rect) { setTRect(null); setPos(centered()); return; }

    setTRect(rect);
    setPos(computePos(rect, def.placement as "bottom" | "right", tooltipRef.current?.offsetHeight || 200, window.innerWidth, window.innerHeight));
  }, [step, visible]);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => { window.removeEventListener("resize", recalc); window.removeEventListener("scroll", recalc, true); };
  }, [recalc]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, dismiss]);

  if (!mounted || !visible) return null;

  const def      = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Dim backdrop for floating steps */}
          {!tRect && (
            <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px]" style={{ zIndex: 9997 }} onClick={dismiss} />
          )}

          {/* Spotlight for anchored steps */}
          {tRect && <Spotlight rect={tRect} />}

          {/* ── Tooltip card ── */}
          <motion.div
            key={`coach-${step}`}
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.93, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, width: TOOLTIP_W }}
            className="bg-white dark:bg-[var(--background-elevated)] border border-slate-200 dark:border-[var(--surface-border)] rounded-2xl shadow-[0_28px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 dark:bg-white/5 w-full">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-full"
                initial={{ width: `${(step / STEPS.length) * 100}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>

            <div className="p-5">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                    {def.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{def.title}</span>
                </div>
                <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0 mt-0.5" aria-label="Skip tour">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step breadcrumb strip */}
              <div className="flex items-center gap-0.5 mb-3 flex-wrap">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                      i === step
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : i < step
                        ? "text-slate-300 dark:text-slate-600 line-through"
                        : "text-slate-300 dark:text-slate-600"
                    }`}>{s.label}</span>
                    {i < STEPS.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-slate-200 dark:text-slate-700 shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Body */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{def.body}</p>

              {/* Feature grid */}
              {def.features && (
                <div className={`mb-4 ${def.features.length > 4 ? "grid grid-cols-2 gap-1.5" : "space-y-1.5"}`}>
                  {def.features.map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.04] rounded-xl px-2.5 py-2">
                      <div className="shrink-0">{icon}</div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{label}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                  Step {step + 1} of {STEPS.length}
                </span>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg px-3.5 py-2 transition-all"
                  >
                    {def.cta}
                    {step < STEPS.length - 1 && <ArrowRight className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Arrow — upward (bottom placement) */}
          {pos.placement === "bottom" && typeof pos.arrowLeft === "number" && (
            <div style={{
              position: "fixed", zIndex: 9999,
              top: pos.top - ARROW_SZ + 1,
              left: pos.left + pos.arrowLeft - ARROW_SZ,
              width: 0, height: 0,
              borderLeft:   `${ARROW_SZ}px solid transparent`,
              borderRight:  `${ARROW_SZ}px solid transparent`,
              borderBottom: `${ARROW_SZ}px solid`,
            }} className="border-b-white dark:border-b-[#0f1323]" />
          )}

          {/* Arrow — leftward (right placement) */}
          {pos.placement === "right" && typeof pos.arrowTop === "number" && (
            <div style={{
              position: "fixed", zIndex: 9999,
              left: pos.left - ARROW_SZ + 1,
              top:  pos.top + pos.arrowTop - ARROW_SZ,
              width: 0, height: 0,
              borderTop:    `${ARROW_SZ}px solid transparent`,
              borderBottom: `${ARROW_SZ}px solid transparent`,
              borderRight:  `${ARROW_SZ}px solid`,
            }} className="border-r-white dark:border-r-[#0f1323]" />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
