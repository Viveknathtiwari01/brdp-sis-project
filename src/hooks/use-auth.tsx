"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";

interface AuthContextType {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user && !!accessToken;

    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        try {
            const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.success && data.data.accessToken) {
                setAccessToken(data.data.accessToken);
                return data.data.accessToken;
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    const fetchProfile = useCallback(async (token: string) => {
        try {
            const res = await fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Profile fetch failed");
            const data = await res.json();
            if (data.success) {
                setUser({
                    id: data.data.id,
                    email: data.data.email,
                    name: data.data.name,
                    role: data.data.role,
                    permissions: data.data.permissions || [],
                });
            }
        } catch {
            setUser(null);
            setAccessToken(null);
        }
    }, []);

    // On mount — try to refresh token
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const token = await refreshAccessToken();
            if (token) {
                await fetchProfile(token);
            }
            setIsLoading(false);
        };
        init();
    }, [refreshAccessToken, fetchProfile]);

    const login = async (email: string, password: string) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Login failed");

        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        router.push("/dashboard");
    };

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                credentials: "include",
            });
        } finally {
            setUser(null);
            setAccessToken(null);
            router.push("/login");
        }
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === "SYSTEM_ADMIN") return true;
        return user.permissions.includes(permission);
    };

    const hasAnyPermission = (...permissions: string[]) => {
        if (!user) return false;
        if (user.role === "SYSTEM_ADMIN") return true;
        return permissions.some((p) => user.permissions.includes(p));
    };

    return (
        <AuthContext.Provider
            value={{ user, accessToken, isAuthenticated, isLoading, login, logout, hasPermission, hasAnyPermission }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
