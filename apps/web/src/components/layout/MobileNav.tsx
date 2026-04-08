"use client";

import { Home, Sparkles, Folder, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
    onMenuClick: () => void;
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Glass bar */}
            <div className="h-16 bg-white/80 dark:bg-[var(--background)/85] backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/[0.06] px-6 pb-safe
                            shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
                <div className="grid grid-cols-4 items-center h-full max-w-lg mx-auto">
                    <Link
                        href="/"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 h-full transition-all cursor-pointer",
                            isActive("/")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Home className={cn("h-5 w-5 transition-all", isActive("/") && "drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]")} />
                        <span className="text-[10px] font-semibold">Home</span>
                    </Link>

                    <Link
                        href="/projects"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 h-full transition-all cursor-pointer",
                            isActive("/projects")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Folder className={cn("h-5 w-5 transition-all", isActive("/projects") && "drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]")} />
                        <span className="text-[10px] font-semibold">Library</span>
                    </Link>

                    <Link
                        href="/studio"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 h-full transition-all cursor-pointer",
                            isActive("/studio")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Sparkles className={cn("h-5 w-5 transition-all", isActive("/studio") && "drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]")} />
                        <span className="text-[10px] font-semibold">Repo</span>
                    </Link>

                    <button
                        onClick={onMenuClick}
                        className="flex flex-col items-center justify-center gap-1 h-full text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-semibold">Menu</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
