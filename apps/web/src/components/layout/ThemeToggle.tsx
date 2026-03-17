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
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200",
        "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60",
        "hover:bg-slate-200 dark:hover:bg-slate-700",
        "text-slate-600 dark:text-slate-300"
      )}
      aria-label="Toggle theme"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <><Moon className="h-3.5 w-3.5 text-indigo-500" /><span className="hidden sm:inline">Dark</span></>
      ) : (
        <><Sun className="h-3.5 w-3.5 text-amber-400" /><span className="hidden sm:inline">Light</span></>
      )}
    </button>
  );
}
