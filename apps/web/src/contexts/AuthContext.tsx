"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { authApi } from "@/lib/api";

interface User {
    id: string;
    email: string;
    full_name?: string;
}

interface AuthContextType {
    user: User | null;
    otpRequest: (email: string, type: "login" | "signup") => Promise<void>;
    otpVerify: (email: string, code: string, fullName?: string, phone?: string, role?: string, consent?: boolean) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    otpRequest: async () => { },
    otpVerify: async () => { },
    logout: () => { },
    isAuthenticated: false,
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        // Check for existing token
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    setUser(null);
                    router.push("/auth/login");
                } else {
                    setUser({
                        id: decoded.user_id,
                        email: decoded.sub,
                        full_name: decoded.full_name
                    });
                }
            } catch (e) {
                console.error("Invalid token:", e);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    const otpRequest = async (email: string, type: "login" | "signup") => {
        await authApi.requestOtp(email, type);
    };

    const otpVerify = async (email: string, code: string, fullName?: string, phone?: string, role?: string, consent?: boolean) => {
        const { access_token } = await authApi.verifyOtp(email, code, fullName, phone, role, consent);
        localStorage.setItem('token', access_token);

        const decoded: any = jwtDecode(access_token);
        setUser({
            id: decoded.user_id,
            email: decoded.sub,
            full_name: decoded.full_name
        });

        // Check and claim guest projects
        try {
            const guestProjects = JSON.parse(localStorage.getItem('guest_projects') || '[]');
            if (guestProjects.length > 0) {
                const projectIds = guestProjects.map((p: any) => p.id);
                console.log("Claiming guest projects:", projectIds);
                // Dynamically import projectsApi to avoid circular dependency issues if any
                const { projectsApi } = await import("@/lib/api");
                await projectsApi.claim(projectIds);

                // Clear guest data
                localStorage.removeItem('guest_projects');
                localStorage.removeItem('guest_project_count');
                localStorage.removeItem('guest_mode_upload_count'); // Just in case

                // Notify UI to refresh
                window.dispatchEvent(new Event('refresh-sidebar'));
            }
        } catch (e) {
            console.error("Failed to claim guest projects:", e);
        }

        router.push("/");
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = "/";
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                otpRequest,
                otpVerify,
                logout,
                isAuthenticated: !!user,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
