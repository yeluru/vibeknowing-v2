"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, buildAIHeaders } from "@/lib/api";

export interface SourceProgress {
  // Completion flags
  hasTranscript: boolean;
  hasSummary: boolean;
  hasQuiz: boolean;
  hasFlashcards: boolean;
  hasVanguard: boolean;
  vanguardCount: number;

  // Derived score 0–100
  masteryScore: number;

  // Next recommended action
  nudge: {
    label: string;
    tab: string;
    description: string;
    priority: "high" | "medium" | "low";
  } | null;

  loading: boolean;
  refresh: () => void;
}

/**
 * Fetches artifact state for a source and derives:
 * - A mastery score (0–100) based on completed activities
 * - A context-aware "next action" nudge
 * - Vanguard finding count
 *
 * Pure frontend computation — uses existing API endpoints only.
 */
export function useSourceProgress(sourceId: string, source: any): SourceProgress {
  const [hasQuiz, setHasQuiz] = useState(false);
  const [hasFlashcards, setHasFlashcards] = useState(false);
  const [hasVanguard, setHasVanguard] = useState(false);
  const [vanguardCount, setVanguardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const hasTranscript = !!(source?.content_text && source.content_text.length > 100);
  const hasSummary = !!(source?.summary && source.summary.length > 50);

  const fetchArtifacts = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      const headers: HeadersInit = { ...buildAIHeaders() };
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Check quiz
      const quizRes = await fetch(`${API_BASE}/ai/quiz/${sourceId}`, { headers });
      if (quizRes.ok) {
        const quiz = await quizRes.json();
        setHasQuiz(!!(quiz?.questions?.length > 0));
      }

      // Check flashcards
      const fcRes = await fetch(`${API_BASE}/ai/flashcards/${sourceId}`, { headers });
      if (fcRes.ok) {
        const fc = await fcRes.json();
        setHasFlashcards(!!(fc?.cards?.length > 0 || fc?.flashcards?.length > 0));
      }

      // Check Vanguard recommendations via project artifacts
      if (source?.project_id) {
        const vRes = await fetch(`${API_BASE}/ai/vanguard/${sourceId}`, { headers });
        if (vRes.ok) {
          const v = await vRes.json();
          const recs = v?.recommendations ?? [];
          setHasVanguard(recs.length > 0);
          setVanguardCount(recs.length);
        } else {
          setHasVanguard(false);
          setVanguardCount(0);
        }
      }
    } catch {
      // Fail silently — progress tracking is non-critical
    } finally {
      setLoading(false);
    }
  }, [sourceId, source?.project_id]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts, tick]);

  // Mastery score: weighted sum
  // Transcript:  10 pts (just having content)
  // Summary:     20 pts
  // Quiz:        35 pts (highest cognitive load)
  // Flashcards:  25 pts
  // Vanguard:    10 pts (going deeper)
  const masteryScore = Math.min(
    100,
    (hasTranscript ? 10 : 0) +
    (hasSummary ? 20 : 0) +
    (hasQuiz ? 35 : 0) +
    (hasFlashcards ? 25 : 0) +
    (hasVanguard ? 10 : 0)
  );

  // Derive the single most impactful next action
  const nudge = (() => {
    if (!hasTranscript) return null; // Still processing, no nudge yet

    if (!hasSummary) return {
      label: "Get your AI summary",
      tab: "summary",
      description: "Distill this content into key insights in seconds.",
      priority: "high" as const,
    };

    if (!hasQuiz) return {
      label: "Test your understanding",
      tab: "studio",
      description: "Take a quiz to see how much you've actually retained.",
      priority: "high" as const,
    };

    if (!hasFlashcards) return {
      label: "Lock it in with flashcards",
      tab: "studio",
      description: "Create spaced-repetition cards to move this to long-term memory.",
      priority: "medium" as const,
    };

    if (hasVanguard && vanguardCount > 0) return {
      label: `Go deeper — ${vanguardCount} related resources found`,
      tab: "chat",
      description: "Vanguard has identified knowledge frontiers beyond this source.",
      priority: "medium" as const,
    };

    return {
      label: "Ask the AI anything",
      tab: "chat",
      description: "You've covered the basics. Dig deeper with the AI tutor.",
      priority: "low" as const,
    };
  })();

  return {
    hasTranscript,
    hasSummary,
    hasQuiz,
    hasFlashcards,
    hasVanguard,
    vanguardCount,
    masteryScore,
    nudge,
    loading,
    refresh: () => setTick(t => t + 1),
  };
}
