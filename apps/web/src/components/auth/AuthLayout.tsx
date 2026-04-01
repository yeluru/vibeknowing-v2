"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen bg-white dark:bg-[#0b0e17] overflow-hidden selection:bg-indigo-500/30">
            {/* Left Col - Form */}
            <div className="w-full lg:w-[45%] flex flex-col relative z-20 shadow-2xl shadow-black/5">
                {/* Minimal Header */}
                <div className="p-8 lg:p-12 flex justify-between items-center absolute top-0 w-full">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to home
                    </Link>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-[420px]"
                    >
                        {children}
                    </motion.div>
                </div>

                <div className="p-8 text-center sm:text-left">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        The OS for Learning
                    </p>
                </div>
            </div>

            {/* Right Col - Art/Brand */}
            <div className="hidden lg:flex flex-1 relative bg-[#13172e] text-white flex-col justify-between overflow-hidden p-12 lg:border-l lg:border-[#222744]">
                {/* Abstract animated gradient background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#242b59]/60 via-[#13172e] to-[#1d234a]/50 opacity-80" />
                    <motion.div
                        animate={{ 
                            transform: ["rotate(0deg) scale(1.2)", "rotate(180deg) scale(1.5)", "rotate(360deg) scale(1.2)"],
                        }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[50%] -right-[50%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.15)_0%,_transparent_50%)]"
                    />
                    <motion.div
                        animate={{ 
                            transform: ["translate(0%, 0%) scale(1)", "translate(-10%, 10%) scale(1.1)", "translate(0%, 0%) scale(1)"],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-0 left-0 w-[100%] h-[100%] bg-[radial-gradient(ellipse_at_bottom_left,_rgba(168,85,247,0.1)_0%,_transparent_60%)]"
                    />
                    {/* Subtle Grid overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/20">
                        <span className="text-white text-base font-black">V</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
                            Master any subject<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                in record time.
                            </span>
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                            Upload lectures, PDFs, or articles. Generate adaptive flashcards, deep summaries, and active recall quizzes instantly.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
