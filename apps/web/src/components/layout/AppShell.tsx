"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface PageMeta { title: string; subtitle: string; }

function getPageMeta(pathname: string): PageMeta {
    if (pathname === "/")                    return { title: "VibeKnowing",      subtitle: "Your AI learning workspace" };
    if (pathname.startsWith("/source/"))     return { title: "Study Workspace",  subtitle: "Explore, summarize, and create from your source" };
    if (pathname.startsWith("/studio"))      return { title: "Content Studio",   subtitle: "Turn your knowledge into publishable content" };
    if (pathname.startsWith("/chat"))        return { title: "Knowledge Base",   subtitle: "Chat across all your uploaded documents" };
    if (pathname.startsWith("/flashcards"))  return { title: "Flashcard Decks",  subtitle: "Spaced-repetition review for every project" };
    if (pathname.startsWith("/projects"))    return { title: "Library",          subtitle: "All your learning goals in one place" };
    if (pathname.startsWith("/settings"))    return { title: "Settings",         subtitle: "API keys and model preferences" };
    if (pathname.startsWith("/auth"))        return { title: "VibeKnowing",      subtitle: "Sign in to continue" };
    return                                          { title: "VibeKnowing",      subtitle: "AI learning suite" };
}

/* Ambient background orbs — only visible in dark mode */
function AmbientOrbs() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-1000">
            {/* Emerald orb — top left */}
            <div className="animate-orb-1 absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-emerald-500/[0.05] blur-[100px]" />
            {/* Indigo orb — top right */}
            <div className="animate-orb-2 absolute -top-[10%] -right-[15%] w-[45%] h-[45%] rounded-full bg-indigo-600/[0.06] blur-[120px]" />
            {/* Purple orb — bottom center */}
            <div className="animate-orb-3 absolute bottom-[-15%] left-[30%] w-[40%] h-[40%] rounded-full bg-violet-600/[0.05] blur-[100px]" />
        </div>
    );
}

function LandingNav() {
    const { theme, toggleTheme } = useTheme();
    return (
        <nav className="fixed top-0 inset-x-0 z-50 h-[60px] flex items-center justify-between px-5 lg:px-10
                        bg-white/50 dark:bg-[#020617]/60 backdrop-blur-2xl
                        border-b border-slate-200/40 dark:border-white/[0.05]
                        shadow-sm dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-[15px] tracking-tight text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center shadow-lg dark:sidebar-logo-glow flex-shrink-0">
                    <span className="text-white text-[12px] font-black">V</span>
                </div>
                <span className="font-mono">VibeKnowing</span>
            </Link>
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleTheme}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                </button>
                <Link href="/auth/login"
                    className="px-3.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Sign in
                </Link>
                <Link href="/auth/signup"
                    className="vk-btn vk-btn-gradient px-4 py-1.5 text-sm shadow-lg">
                    Get started
                </Link>
            </div>
        </nav>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const { title, subtitle } = getPageMeta(pathname);
    const { isAuthenticated, isLoading } = useAuth();

    // Auth pages — no chrome
    if (pathname.startsWith("/auth")) {
        return (
            <>
                <AmbientOrbs />
                {children}
            </>
        );
    }

    // Logged out — minimal landing nav, no sidebar
    if (!isLoading && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-transparent transition-colors duration-300 relative">
                <AmbientOrbs />
                <LandingNav />
                <main className="pt-12 relative z-10">{children}</main>
            </div>
        );
    }

    // Loading — blank to avoid layout flash
    if (isLoading) return (
        <div className="min-h-screen bg-transparent">
            <AmbientOrbs />
        </div>
    );

    // Logged in — full app shell
    return (
        <div className="flex h-screen bg-transparent transition-colors duration-300 relative">
            <AmbientOrbs />

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-out
                md:relative md:translate-x-0 md:shadow-none
                ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>
                <Sidebar
                    onNavigate={() => setSidebarOpen(false)}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(v => !v)}
                />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0 relative z-10">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    title={title}
                    subtitle={subtitle}
                />
                <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8 bg-transparent pb-24 md:pb-6">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

            <div className="md:hidden">
                <MobileNav onMenuClick={() => setSidebarOpen(true)} />
            </div>
        </div>
    );
}
