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

    // Auth Data
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("");
    const [consent, setConsent] = useState(false);

    const [mode, setMode] = useState<"login" | "signup">(defaultMode);
    const [loginError, setLoginError] = useState<string | null>(null);

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
                setLoginError("Account not found. Please sign up.");
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
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {mode === "login" ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300">
                    {step === "email"
                        ? mode === "login" ? "Enter your email to sign in" : "Enter your details to get started"
                        : `We sent a code to ${email}`}
                </p>
                {loginError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium"
                    >
                        {loginError}
                    </motion.div>
                )}
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
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Jane Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="vk-input w-full px-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                            Phone <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="+1 (555) 000-0000"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="vk-input w-full px-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                            Role <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                        </label>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="vk-input w-full px-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 dark:text-slate-300"
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
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="vk-input w-full pl-11 pr-4 py-3 text-base rounded-xl bg-white/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        {mode === "signup" && (
                            <div className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                                <input
                                    id="sms-consent"
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                    required
                                />
                                <label htmlFor="sms-consent" className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    I agree to receive messaging from VibeKnowing at the phone number provided above.
                                    I understand I will receive messages about my account security or updates.
                                    Reply STOP to opt out.
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !isFormValid()}
                            className={cn(
                                "vk-btn vk-btn-primary w-full py-3.5 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]",
                                (loading || !isFormValid()) && "opacity-70 cursor-not-allowed grayscale-[0.2]"
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

                        <div className="text-center">
                            <p className="text-xs font-medium text-red-500/90 dark:text-red-400/90 bg-red-50 dark:bg-red-950/30 py-2 px-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                ⚠️ Note: For new users, the email may land in your <b>Spam/Junk</b> folder.
                            </p>
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
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                // Reset fields when switching
                                setLoginError(null);
                                setConsent(false);
                            }}
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
