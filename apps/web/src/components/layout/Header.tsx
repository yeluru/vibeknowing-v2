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
        <header className="relative z-[100] flex-none h-[64px] glass-panel border-b border-white/40 dark:border-white/5 flex items-center justify-between px-6 transition-all duration-500 shadow-sm">

            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    className="md:hidden p-1.5 -ml-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 leading-tight group cursor-default">
                    <span className="block text-[14px] font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-primary transition-colors">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="block text-[11px] text-slate-500 dark:text-slate-300 font-medium truncate hidden sm:block">
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
