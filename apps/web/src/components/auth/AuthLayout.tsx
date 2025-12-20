"use client";

import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="w-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center relative overflow-hidden rounded-3xl">
            {/* Background Effects contained within the card area */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.8)_0%,_transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.5)_0%,_transparent_60%)]" />

            {/* Main Content Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[440px] relative z-10"
            >
                <div className="vk-card bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
                    {/* Decorative Top Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 opacity-80" />

                    {/* Content */}
                    <div className="relative z-10">
                        {children}
                    </div>
                </div>

                {/* Footer copy */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        The OS for Learning
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
