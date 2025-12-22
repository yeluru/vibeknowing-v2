"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";

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
        <div className="flex h-screen bg-transparent transition-colors duration-300">


            {/* Mobile Overlay with enhanced blur */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm md:hidden transition-opacity duration-300"
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
