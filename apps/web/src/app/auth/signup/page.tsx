"use client";

import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function SignupPage() {
    return (
        <AuthLayout>
            <OtpLoginForm defaultMode="signup" />
        </AuthLayout>
    );
}
