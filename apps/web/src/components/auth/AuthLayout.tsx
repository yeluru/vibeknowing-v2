"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[var(--background-light)] dark:bg-[var(--background)] overflow-hidden selection:bg-[var(--secondary)]/30">
            {/* Left Col - Form */}
            <div className="w-full lg:w-[45%] flex flex-col relative z-20 shadow-2xl shadow-black/5">
                {/* Minimal Header */}
                <div className="p-8 lg:p-12 flex justify-between items-center absolute top-0 w-full">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
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
                    <p className="text-xs font-medium text-[var(--muted-foreground)] flex items-center justify-center sm:justify-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--secondary)]" />
                        The OS for Learning
                    </p>
                </div>
            </div>

            {/* Right Col - Art/Brand + Demo Video */}
            <div className="hidden lg:flex flex-1 relative text-white flex-col overflow-hidden lg:border-l"
                style={{ background: "var(--panel-dark-bg)", borderColor: "var(--panel-dark-border)" }}>
                {/* Subtle ambient gradients */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[var(--panel-dark-bg)] to-purple-950/30" />
                    <motion.div
                        animate={{ transform: ["rotate(0deg) scale(1.2)", "rotate(360deg) scale(1.2)"] }}
                        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[40%] -right-[40%] w-[130%] h-[130%] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.08)_0%,_transparent_55%)]"
                    />
                    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                </div>

                {/* Top bar — logo */}
                <div className="relative z-10 p-10 pb-0">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-[var(--radius-md)] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10">
                            <span className="text-white text-sm font-black">V</span>
                        </div>
                        <span className="text-sm font-semibold tracking-tight">
                            <span className="text-indigo-400">Vibe</span><span className="text-sky-400">Learn</span>
                        </span>
                    </div>
                </div>

                {/* Headline */}
                <div className="relative z-10 px-10 pt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h2 className="text-3xl font-bold tracking-tight leading-[1.15] mb-3">
                            Turn anything you read<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
                                into something you know.
                            </span>
                        </h2>
                        <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                            Paste a YouTube video, PDF, or article. Get a summary, flashcards, and a quiz — instantly.
                        </p>
                    </motion.div>
                </div>

                {/* Demo video — main content */}
                <div className="relative z-10 flex-1 flex items-center justify-center px-10 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-lg"
                    >
                        <div className="absolute inset-0 blur-[60px] bg-[var(--secondary)]/10 rounded-[var(--radius-2xl)] pointer-events-none" />
                        <div className="relative rounded-[var(--radius-xl)] overflow-hidden border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/5">
                            {/* Browser chrome bar */}
                            <div className="bg-white/[0.06] px-4 py-2.5 flex items-center gap-1.5 border-b border-white/5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                <div className="flex-1 mx-3 bg-white/[0.08] rounded-[var(--radius-md)] px-3 py-1">
                                    <span className="text-[10px] text-white/30 font-mono">vibelern.com</span>
                                </div>
                            </div>
                            <video
                                src="/vibelearn-demo.mp4"
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full block aspect-video object-cover object-top"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Bottom — proof chips */}
                <div className="relative z-10 px-10 pb-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex items-center gap-3 flex-wrap"
                    >
                        {[
                            { emoji: "⚡", text: "60-second setup" },
                            { emoji: "🧠", text: "Spaced repetition" },
                            { emoji: "🎯", text: "Active recall quizzes" },
                        ].map(({ emoji, text }) => (
                            <div key={text} className="flex items-center gap-1.5 bg-white/5 border border-white/[0.08] rounded-full px-3 py-1.5">
                                <span className="text-xs">{emoji}</span>
                                <span className="text-xs text-white/60 font-medium">{text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
