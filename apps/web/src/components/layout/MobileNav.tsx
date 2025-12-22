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
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-50 px-6 pb-safe">
            <div className="grid grid-cols-4 items-center h-full max-w-lg mx-auto">
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                        isActive("/") ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    <Home className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    href="/projects"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                        isActive("/projects") ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    <Folder className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Library</span>
                </Link>

                <Link
                    href="/studio"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                        isActive("/studio") ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    <Sparkles className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Studio</span>
                </Link>

                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center gap-1 h-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <Menu className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
}
