"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface PageMeta {
    title: string;
    subtitle: string;
}

function getPageMeta(pathname: string): PageMeta {
    if (pathname === "/")                    return { title: "VibeKnowing",      subtitle: "Your AI learning workspace" };
    if (pathname.startsWith("/source/"))     return { title: "Study Workspace",  subtitle: "Explore, summarize, and create from your source" };
    if (pathname.startsWith("/studio"))      return { title: "Content Studio",    subtitle: "Turn your knowledge into publishable content" };
    if (pathname.startsWith("/flashcards"))  return { title: "Flashcard Decks",  subtitle: "Spaced-repetition review for every project" };
    if (pathname.startsWith("/projects"))    return { title: "Library",          subtitle: "All your learning goals in one place" };
    if (pathname.startsWith("/settings"))    return { title: "Settings",         subtitle: "API keys and model preferences" };
    if (pathname.startsWith("/auth"))        return { title: "VibeKnowing",      subtitle: "Sign in to continue" };
    return                                          { title: "VibeKnowing",      subtitle: "AI learning suite" };
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { title, subtitle } = getPageMeta(pathname);

    return (
        <div className="flex h-screen bg-transparent transition-colors duration-300">

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out
                md:relative md:translate-x-0 md:shadow-none
                ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
            `}>
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>

            {/* Main */}
            <div className="flex flex-1 flex-col overflow-hidden w-full">
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

            {/* Mobile bottom nav */}
            <div className="md:hidden">
                <MobileNav onMenuClick={() => setSidebarOpen(true)} />
            </div>
        </div>
    );
}
