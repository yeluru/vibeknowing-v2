"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Cpu } from "lucide-react";

// Actual model display names
const MODEL_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "o1": "o1 Reasoning",
  "o3-mini": "o3-mini",
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-opus-4-20250514": "Claude Opus 4",
  "claude-haiku-3-5-20241022": "Claude Haiku 3.5",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
};

// Map route patterns to task keys used in settings
function getTaskForPath(pathname: string): string {
  if (pathname.startsWith("/source/")) return "summary";
  if (pathname.startsWith("/flashcards")) return "flashcard";
  if (pathname.startsWith("/studio")) return "article";
  if (pathname.startsWith("/quiz")) return "quiz";
  return "summary"; // default fallback
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

function getModelForTask(task: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const prefs = JSON.parse(
      localStorage.getItem("vk_ai_prefs") ||
        '{"defaultProvider":"openai","taskModels":{}}'
    );
    const defaultProvider: string = prefs.defaultProvider || "openai";

    // Task-specific model takes priority
    const taskEntry: string | undefined = prefs.taskModels?.[task];
    if (taskEntry) {
      const modelId = taskEntry.split(":")[1];
      return modelId ? (MODEL_LABELS[modelId] ?? modelId) : null;
    }

    // Any model for the default provider
    const fallbackEntry = Object.values(prefs.taskModels as Record<string, string>).find(
      (v) => v.startsWith(defaultProvider + ":")
    );
    if (fallbackEntry) {
      const modelId = fallbackEntry.split(":")[1];
      return modelId ? (MODEL_LABELS[modelId] ?? modelId) : null;
    }

    // Always show something — at minimum the provider name
    return PROVIDER_LABELS[defaultProvider] ?? defaultProvider;
  } catch {
    return null;
  }
}

export function ModelBadge() {
  const router = useRouter();
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const update = () => {
      const task = getTaskForPath(pathname);
      const model = getModelForTask(task);
      setLabel(model);
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [pathname]);

  if (!isAuthenticated || !label) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Cpu className="h-3.5 w-3.5 text-indigo-500" />
        <span>{label}</span>
      </div>
      <button
        onClick={() => router.push("/settings")}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline transition-colors"
      >
        Change
      </button>
    </div>
  );
}