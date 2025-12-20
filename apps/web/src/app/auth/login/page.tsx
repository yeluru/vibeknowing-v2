"use client";

import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function LoginPage() {
    return (
        <AuthLayout>
            <OtpLoginForm defaultMode="login" />
        </AuthLayout>
    );
}
