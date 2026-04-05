"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UserMenu() {
    const { user, logout, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isAuthenticated) {
        return (
            <Link
                href="/auth/login"
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
                Sign In
            </Link>
        );
    }

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.substring(0, 2).toUpperCase() || "U";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {initials}
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56
                                bg-white/90 dark:bg-[#0a0f1e]/95
                                backdrop-blur-2xl
                                rounded-2xl shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]
                                border border-slate-200/60 dark:border-white/[0.07]
                                overflow-hidden
                                animate-in fade-in slide-in-from-top-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                                    {user?.full_name || "User"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                        >
                            <Settings className="h-4 w-4 text-slate-400" />
                            Settings
                        </Link>
                        <button
                            onClick={() => { logout(); setIsOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
