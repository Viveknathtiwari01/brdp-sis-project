"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
}

export function useApi() {
    const { accessToken, logout } = useAuth();

    const apiFetch = useCallback(
        async <T = unknown>(url: string, options: FetchOptions = {}): Promise<T> => {
            const { skipAuth, ...fetchOptions } = options;

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                ...(fetchOptions.headers as Record<string, string>),
            };

            if (!skipAuth && accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const res = await fetch(url, {
                ...fetchOptions,
                headers,
                credentials: "include",
            });

            if (res.status === 401) {
                // Try refresh
                const refreshRes = await fetch("/api/auth/refresh", {
                    method: "POST",
                    credentials: "include",
                });

                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    if (refreshData.success) {
                        headers.Authorization = `Bearer ${refreshData.data.accessToken}`;
                        const retryRes = await fetch(url, { ...fetchOptions, headers, credentials: "include" });
                        return retryRes.json();
                    }
                }

                await logout();
                throw new Error("Session expired. Please login again.");
            }

            return res.json();
        },
        [accessToken, logout]
    );

    return { apiFetch };
}
