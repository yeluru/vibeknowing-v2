"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

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
        <div className="flex h-screen bg-slate-100">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
                md:relative md:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden w-full">
                {/* <Header onMenuClick={() => setSidebarOpen(true)} title={getPageTitle()} /> */}
                <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
                    {children}
                </main>
            </div>
        </div>
    );
}
