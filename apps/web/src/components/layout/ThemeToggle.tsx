"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Theme toggle clicked, current theme:', theme);
    const newTheme = theme === "light" ? "dark" : "light";
    console.log('Switching to theme:', newTheme);
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "fixed top-4 right-4 z-50 p-3 rounded-full shadow-md transition-all duration-300 hover-lift",
        "bg-white/80 backdrop-blur-xl border border-slate-200/70",
        "dark:bg-slate-900/60 dark:border-slate-800",
        "hover:bg-white dark:hover:bg-slate-900/75",
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

