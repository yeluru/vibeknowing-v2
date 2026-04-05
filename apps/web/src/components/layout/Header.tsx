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

export function Header({ onMenuClick, title = "VibeKnowing", subtitle }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="relative z-[100] flex-none h-[60px] glass-panel border-b border-white/30 dark:border-white/[0.05] flex items-center justify-between px-5 transition-all duration-500">

            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    className="md:hidden p-1.5 -ml-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 leading-tight">
                    <span className="block text-[14px] font-mono font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block">
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
                    className="h-8 w-8 flex items-center justify-center rounded-lg transition-all cursor-pointer
                               text-slate-500 dark:text-slate-400
                               hover:text-slate-900 dark:hover:text-slate-100
                               hover:bg-slate-100 dark:hover:bg-white/5"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark"
                        ? <Sun className="h-4 w-4 text-amber-400" />
                        : <Moon className="h-4 w-4 text-slate-500" />
                    }
                </button>
                <UserMenu />
            </div>
        </header>
    );
}
