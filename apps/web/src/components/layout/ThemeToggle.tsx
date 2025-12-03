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
        "fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover-lift",
        "bg-white/90 backdrop-blur-xl border border-slate-200",
        "dark:bg-slate-800/90 dark:border-slate-700",
        "hover:bg-white dark:hover:bg-slate-800",
        "text-slate-700 dark:text-slate-200"
      )}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      ) : (
        <Sun className="h-5 w-5 text-orange-500 dark:text-orange-300" />
      )}
    </button>
  );
}

