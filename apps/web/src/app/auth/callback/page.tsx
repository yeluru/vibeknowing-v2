"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth(); // We might not have a direct login(token) method, so we'll do it manually if needed

    useEffect(() => {
        const token = searchParams.get("token");
        const error = searchParams.get("error");
        const isNew = searchParams.get("new") === "true";

        if (error) {
            console.error("Auth Error:", error);
            router.replace("/auth/login?error=" + error);
            return;
        }

        if (token) {
            // Save token
            localStorage.setItem("token", token);

            // Dispatch event for other tabs/components
            window.dispatchEvent(new Event("storage"));

            // Force Hard Reload to ensure AuthContext picks it up immediately along with any state
            // OR use router.push("/") if AuthContext listens to storage/token changes.
            // Given our previous context, a hard reload is safer for a clean slate.
            window.location.href = "/";
        } else {
            router.replace("/auth/login");
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Completing secure sign in...
                </p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CallbackContent />
        </Suspense>
    );
}
