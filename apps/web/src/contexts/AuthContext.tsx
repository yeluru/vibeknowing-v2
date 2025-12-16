"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface User {
    id: string;
    email: string;
    full_name?: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => void;
    signup: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    signup: () => { },
    logout: () => { },
    isAuthenticated: false,
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>({
        id: 'admin_user',
        email: 'admin@localhost',
        full_name: 'Admin User'
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        // AUTH BYPASS: Ensure local storage has a dummy token to prevent other logic from failing
        localStorage.setItem('token', 'dummy_token');
        setIsLoading(false);
    }, []);

    const login = async (token: string) => {
        // No-op in single player mode
        console.log("Login called (Single Player Mode)");
    };

    const signup = async (token: string) => {
        // No-op
        console.log("Signup called (Single Player Mode)");
    };

    const logout = () => {
        // Prevent logout in single player mode
        alert("Logout disabled in Single Player Mode");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                signup,
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
