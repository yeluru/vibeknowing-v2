"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ThemeToggle } from "./ThemeToggle";

export default function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Determine page title based on route if not explicitly provided
    const getPageTitle = () => {
        if (title) return title;

        if (pathname === "/") return "Home";
        if (pathname.startsWith("/source/")) return "Content Studio";

        return "Dashboard";
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 transition-colors duration-300">


            {/* Mobile Overlay with enhanced blur */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md md:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container with smooth animation */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out
                md:relative md:translate-x-0 md:shadow-none
                ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden w-full">
                <Header onMenuClick={() => setSidebarOpen(true)} title={getPageTitle()} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
