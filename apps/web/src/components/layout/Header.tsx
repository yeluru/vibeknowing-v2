"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
    onMenuClick?: () => void;
    title?: string;
}

export function Header({ onMenuClick, title = "Dashboard" }: HeaderProps) {
    return (
        <header className="h-16 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                    onClick={onMenuClick}
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{title}</div>
            </div>
        </header>
    );
}
