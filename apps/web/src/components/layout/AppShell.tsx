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
    if (pathname === "/")                    return { title: "VibeKnowing",     subtitle: "Your AI learning workspace" };
    if (pathname.startsWith("/source/"))     return { title: "Study Workspace", subtitle: "Explore, summarize, and create from your source" };
    if (pathname.startsWith("/studio"))      return { title: "Content Studio",  subtitle: "Turn your knowledge into publishable content" };
    if (pathname.startsWith("/chat"))        return { title: "Knowledge Base",  subtitle: "Chat across all your uploaded documents" };
    if (pathname.startsWith("/flashcards"))  return { title: "Flashcard Decks", subtitle: "Spaced-repetition review for every project" };
    if (pathname.startsWith("/projects"))    return { title: "Library",         subtitle: "All your learning goals in one place" };
    if (pathname.startsWith("/settings"))    return { title: "Settings",        subtitle: "API keys and model preferences" };
    if (pathname.startsWith("/auth"))        return { title: "VibeKnowing",     subtitle: "Sign in to continue" };
    return                                          { title: "VibeKnowing",     subtitle: "AI learning suite" };
}

function LandingNav() {
    const { theme, toggleTheme } = useTheme();
    return (
        <nav className="fixed top-0 inset-x-0 z-50 h-12 flex items-center justify-between px-5 lg:px-10
                        bg-transparent backdrop-blur-3xl border-b border-transparent">
            <Link href="/" className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white text-[10px] font-black">V</span>
                </div>
                VibeKnowing
            </Link>
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleTheme}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                    {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                </button>
                <Link href="/auth/login"
                    className="px-3.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Sign in
                </Link>
                <Link href="/auth/signup"
                    className="vk-btn vk-btn-primary px-4 py-1.5 shadow-sm">
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
        return <>{children}</>;
    }

    // Logged out — minimal landing nav, no sidebar
    if (!isLoading && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-transparent transition-colors duration-300">
                <LandingNav />
                <main className="pt-12">{children}</main>
            </div>
        );
    }

    // Loading — blank to avoid layout flash
    if (isLoading) return <div className="min-h-screen bg-transparent" />;

    // Logged in — full app shell
    return (
        <div className="flex h-screen bg-transparent transition-colors duration-300">

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
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

            <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0">
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
