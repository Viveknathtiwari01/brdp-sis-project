"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { SIDEBAR_ITEMS } from "@/lib/constants/navigation";
import {
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

type SidebarProps = {
    collapsed: boolean;
    onToggleCollapsed: () => void;
    variant?: "desktop" | "mobile";
    onNavigate?: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed, variant = "desktop", onNavigate }: SidebarProps) {
    const pathname = usePathname();
    const { hasPermission, user } = useAuth();

    const filteredItems = SIDEBAR_ITEMS.filter((item) => {
        if (!item.permission) return true;
        if (user?.role === "STUDENT") {
            return ["dashboard:view", "fee_ledger:view", "payment:view"].includes(item.permission);
        }
        return hasPermission(item.permission);
    });

    return (
        <aside
            className={cn(
                variant === "desktop"
                    ? "fixed left-0 top-0 z-40 h-screen"
                    : "relative h-full",
                "bg-[#000080] transition-all duration-300 ease-in-out flex flex-col",
                collapsed ? "w-[70px]" : "w-[260px]"
            )}
        >
            {/* Logo */}
            <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white overflow-hidden shrink-0 shadow-inner">
                        <Image
                            src="/logo.png"
                            alt="College Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-extrabold text-white tracking-wide truncate">BRDP Mahavidyalaya</span>
                            <span className="text-[11px] font-semibold text-slate-200">Student Portal</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white/20 text-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.3)]"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-5 w-5 shrink-0 transition-colors",
                                    isActive
                                        ? "text-white"
                                        : "text-slate-400 group-hover:text-white"
                                )}
                            />
                            {!collapsed && <span>{item.title}</span>}
                            {isActive && !collapsed && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            {variant === "desktop" ? (
                <div className="p-3 border-t border-white/10">
                    <button
                        onClick={onToggleCollapsed}
                        className="flex h-8 w-full items-center justify-center rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                </div>
            ) : null}
        </aside>
    );
}
