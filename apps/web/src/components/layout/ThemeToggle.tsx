"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-300",
        "bg-transparent border-slate-200/80 dark:border-[var(--surface-border)]",
        "hover:bg-slate-50 dark:hover:bg-white/5",
        "text-slate-700 dark:text-slate-300"
      )}
      aria-label="Toggle theme"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <><Moon className="h-3.5 w-3.5 text-zinc-900" /><span className="hidden sm:inline">Dark</span></>
      ) : (
        <><Sun className="h-3.5 w-3.5 text-white" /><span className="hidden sm:inline">Light</span></>
      )}
    </button>
  );
}
