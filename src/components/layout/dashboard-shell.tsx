"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const desktopOffsetClass = useMemo(() => {
        return sidebarCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]";
    }, [sidebarCollapsed]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing SIS Secure Access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
            <div className="hidden lg:block">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapsedAction={() => setSidebarCollapsed((v) => !v)}
                    variant="desktop"
                />
            </div>

            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <DialogContent className="w-[min(92vw,320px)] p-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none h-screen max-w-none gap-0 border-0 bg-transparent shadow-none">
                    <DialogTitle className="sr-only">Navigation</DialogTitle>
                    <Sidebar
                        collapsed={false}
                        onToggleCollapsedAction={() => undefined}
                        variant="mobile"
                        onNavigate={() => setMobileNavOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <div className={"min-w-0 overflow-x-hidden transition-all duration-300 " + desktopOffsetClass}>
                <Topbar onMobileMenuClick={() => setMobileNavOpen(true)} />
                <main className="max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
