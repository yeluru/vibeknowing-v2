"use client";

import { Moon, Sun, Menu } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModelBadge } from "./ModelBadge";
import { useTheme } from "@/contexts/ThemeContext";

interface HeaderProps {
    onMenuClick?: () => void;
    title?: string;
    subtitle?: string;
}

export function Header({ onMenuClick, title = "VibeLearn", subtitle }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="relative z-[100] flex-none h-[60px] bg-white/40 dark:bg-[#09090b]/40 backdrop-blur-3xl border-b border-slate-200/50 dark:border-[#383e59] flex items-center justify-between px-6 transition-colors duration-300">

            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    className="md:hidden p-1.5 -ml-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 leading-tight">
                    <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5">
                <ModelBadge />
                <button
                    onClick={toggleTheme}
                    className="h-8 w-8 flex items-center justify-center rounded-lg transition-all
                               text-slate-500 dark:text-slate-400
                               hover:text-slate-900 dark:hover:text-slate-100
                               hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark"
                        ? <Sun className="h-4 w-4 text-amber-400" />
                        : <Moon className="h-4 w-4 text-indigo-500" />
                    }
                </button>
                <UserMenu />
            </div>
        </header>
    );
}
