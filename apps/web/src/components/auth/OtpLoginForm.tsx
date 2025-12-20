"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OtpLoginFormProps {
    onSuccess?: () => void;
    defaultMode?: "login" | "signup";
}

export function OtpLoginForm({ onSuccess, defaultMode = "login" }: OtpLoginFormProps) {
    const { otpRequest, otpVerify } = useAuth();
    const [step, setStep] = useState<"email" | "code">("email");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [code, setCode] = useState("");
    const [mode, setMode] = useState<"login" | "signup">(defaultMode);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await otpRequest(email, mode);
            setStep("code");
            toast.success("Code sent! Check your email.");
        } catch (error) {
            toast.error("Failed to request code. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;

        setLoading(true);
        try {
            await otpVerify(email, code, mode === "signup" ? fullName : undefined);
            toast.success("Successfully logged in!");
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Invalid code. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {mode === "login" ? "Welcome back" : "Create an account"}
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300">
                    {step === "email"
                        ? mode === "login" ? "Enter your email to sign in" : "Enter your details to get started"
                        : `We sent a code to ${email}`}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {step === "email" ? (
                    <motion.form
                        key="email-form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleSendCode}
                        className="space-y-5"
                    >
                        {mode === "signup" && (
                            <div className="space-y-1.5">
                                <label htmlFor="fullname" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <input
                                        id="fullname"
                                        type="text"
                                        placeholder="Jane Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="vk-input w-full pl-4 pr-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="vk-input w-full pl-11 pr-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "vk-btn vk-btn-primary w-full py-3.5 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending Code...
                                </span>
                            ) : (
                                "Continue with Email"
                            )}
                        </button>
                    </motion.form>
                ) : (
                    <motion.form
                        key="code-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleVerifyCode}
                        className="space-y-5"
                    >
                        <div className="space-y-1.5">
                            <label htmlFor="code" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Secure Code
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    id="code"
                                    type="text"
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="vk-input w-full pl-11 pr-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-mono tracking-widest text-lg"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "vk-btn vk-btn-primary w-full py-3.5 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Verify & Login <ArrowRight className="h-5 w-5" />
                                </span>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                ← Use a different email
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Toggle Login/Signup */}
            {step === "email" && (
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setMode(mode === "login" ? "signup" : "login")}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            {mode === "login" ? "Sign up" : "Log in"}
                        </button>
                    </p>
                </div>
            )}
        </div>
    );
}
