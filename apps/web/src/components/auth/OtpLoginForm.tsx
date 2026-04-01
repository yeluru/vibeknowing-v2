"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

interface OtpLoginFormProps {
    onSuccess?: () => void;
    defaultMode?: "login" | "signup";
}

export function OtpLoginForm({ onSuccess, defaultMode = "login" }: OtpLoginFormProps) {
    const { otpRequest, otpVerify } = useAuth();
    const [step, setStep] = useState<"email" | "code">("email");
    const [loading, setLoading] = useState(false);

    // Auth Data
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("");
    const [consent, setConsent] = useState(false);

    const [mode, setMode] = useState<"login" | "signup">(defaultMode);
    const [formError, setFormError] = useState<string | null>(null);

    // Auto-dismiss error
    useEffect(() => {
        if (formError) {
            const timer = setTimeout(() => setFormError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [formError]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        // Twilio Compliance: Enforce checkbox on signup
        if (mode === "signup" && !consent) {
            toast.error("Please agree to the messaging terms to continue.");
            return;
        }

        setLoading(true);
        try {
            await otpRequest(email, mode);
            setStep("code");
            toast.success("Code sent! Check your email.");
        } catch (error: any) {
            console.error(error);
            // Handle "Account not found" specifically
            if (error.response?.status === 404 && mode === "login") {
                setFormError("Account not found. Please sign up.");
                toast.error("Account not found. Please sign up.");
                setMode("signup");
                // Optional: clear loading so they can fill extra fields
            } else {
                toast.error("Failed to request code. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;

        setLoading(true);
        try {
            // Pass all new fields to verify
            await otpVerify(
                email,
                code,
                mode === "signup" ? fullName : undefined,
                mode === "signup" ? phone : undefined,
                mode === "signup" ? role : undefined,
                mode === "signup" ? consent : undefined
            );
            toast.success("Successfully logged in!");
            if (onSuccess) onSuccess();
        } catch (error) {
            setFormError("Invalid code. Please try again.");
            toast.error("Invalid code. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        if (mode === "login") return email.length > 0;
        return email.length > 0 && fullName.length > 0 && consent;
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-left space-y-3 mb-8">
                {formError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium mb-4"
                    >
                        {formError}
                    </motion.div>
                )}
                <h1 className="text-4xl md:text-[2.75rem] font-bold tracking-[-0.04em] text-slate-900 dark:text-white leading-[1.1]">
                    {mode === "login" ? "Welcome back" : "Create account"}
                </h1>
                <p className="text-base text-slate-500 dark:text-slate-400">
                    {step === "email"
                        ? mode === "login" ? "Enter your email to sign in to your workspace" : "Enter your details to get started"
                        : `We sent a secure code to ${email}`}
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
                        className="space-y-4"
                    >
                        {mode === "signup" && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Jane Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-indigo-200/40 text-slate-900 dark:text-white shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                            Phone <span className="font-normal opacity-70">(Optional)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="+1 (555) 000-0000"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-indigo-200/40 text-slate-900 dark:text-white shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                            Role <span className="font-normal opacity-70">(Optional)</span>
                                        </label>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 dark:text-slate-300 shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                                        >
                                            <option value="">Select Role...</option>
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="professional">Professional</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-indigo-200/40 text-slate-900 dark:text-white shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                                    required
                                />
                            </div>
                        </div>

                        {mode === "signup" && (
                            <div className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-[#1a1e30]/30 rounded-lg border border-slate-100 dark:border-[#383e59]">
                                <input
                                    id="sms-consent"
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                    required
                                />
                                <label htmlFor="sms-consent" className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    I agree to receive messaging from VibeLearn at the phone number provided above.
                                    I understand I will receive messages about my account security or updates.
                                    Reply STOP to opt out.
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !isFormValid()}
                            className={cn(
                                "w-full py-4 rounded-2xl text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                                (loading || !isFormValid()) && "opacity-50 cursor-not-allowed hover:bg-indigo-600 hover:-translate-y-0 active:scale-100"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending Code...
                                </span>
                            ) : (
                                "Continue"
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
                            <label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                Secure Code
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    id="code"
                                    type="text"
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-indigo-200/40 font-mono tracking-widest text-xl text-slate-900 dark:text-white shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-xs font-medium text-red-500/90 dark:text-red-400/90 bg-red-50 dark:bg-red-950/30 py-2 px-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                ⚠️ Note: For new users, the email may land in your <b>Spam/Junk</b> folder.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full py-4 rounded-2xl text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                                loading && "opacity-50 cursor-not-allowed hover:bg-indigo-600 hover:-translate-y-0 active:scale-100"
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

            {step === "email" && (
                <>
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-[#383e59]" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-50 dark:bg-[#1a1e30] px-2 text-slate-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a
                            href={`${API_BASE}/auth/login/google`}
                            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-white dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] hover:bg-slate-50 dark:hover:bg-[#20253b] transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:-translate-y-0.5"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </a>

                        <a
                            href={`${API_BASE}/auth/login/github`}
                            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-white dark:bg-[#1a1e30] border border-slate-200/60 dark:border-[#3b415a] hover:bg-slate-50 dark:hover:bg-[#20253b] transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:-translate-y-0.5"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-2.91-.12-.3-.54-1.525.12-3.165 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.865.12 3.165.765.525 1.23 1.605 1.23 2.91 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Continue with GitHub
                        </a>
                    </div>
                </>
            )}

            {/* Toggle Login/Signup */}
            {
                step === "email" && (
                    <div className="pt-4 border-t border-slate-200/60 dark:border-[#383e59]/60 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setMode(mode === "login" ? "signup" : "login");
                                    setFormError(null);
                                    setConsent(false);
                                }}
                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                            >
                                {mode === "login" ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    </div>
                )
            }
        </div >
    );
}
