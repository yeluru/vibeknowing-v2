"use client";

import { Menu } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModelBadge } from "./ModelBadge";

interface HeaderProps {
    onMenuClick?: () => void;
    title?: string;
    subtitle?: string;
}

export function Header({ onMenuClick, title = "VibeKnowing", subtitle }: HeaderProps) {
    return (
        <header className="relative z-[100] flex-none h-14 bg-white/85 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300">

            {/* Left: hamburger + title */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 leading-tight">
                    <span className="block text-[13px] font-semibold text-slate-800 tracking-tight truncate">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="block text-[11px] text-slate-400 truncate hidden sm:block">
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: model badge + user */}
            <div className="flex items-center gap-2">
                <ModelBadge />
                <UserMenu />
            </div>
        </header>
    );
}
