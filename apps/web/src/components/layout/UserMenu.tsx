"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, ChevronDown } from "lucide-react";
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
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
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
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm border border-indigo-200 dark:border-indigo-800">
                    {initials}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {user?.full_name || "User"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email}
                        </p>
                    </div>

                    <div className="py-1">
                        <button
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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
