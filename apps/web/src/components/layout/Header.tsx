"use client";

import { Menu } from "lucide-react";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
    onMenuClick?: () => void;
    title?: string;
}

export function Header({ onMenuClick, title = "Dashboard" }: HeaderProps) {
    return (
        <header className="relative z-[100] h-16 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button
                    className="hidden md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-all duration-200"
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</div>
            </div>

            <div className="flex items-center gap-4">
                <UserMenu />
            </div>
        </header>
    );
}
