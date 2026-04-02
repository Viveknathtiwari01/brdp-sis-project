"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Moon,
    Sun,
    LogOut,
    User,
    Bell,
    Search,
    ChevronDown,
    Menu
} from "lucide-react";

type TopbarProps = {
    onMobileMenuClick?: () => void;
};

export function Topbar({ onMobileMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const initials = user ? getInitials(user.name) : "?";

    const roleLabel: Record<string, string> = {
        SYSTEM_ADMIN: "System Admin",
        ADMIN: "Admin",
        STUDENT: "Student",
    };

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950/95">
            {/* Left side */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    type="button"
                    onClick={onMobileMenuClick}
                    className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    aria-label="Open navigation"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="relative hidden md:block w-full mr-8 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search students, records..."
                        className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                {/* <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                    aria-label="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                </button> */}

                {/* Notifications */}
                <button
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-blue-600 hover:bg-blue-400 hover:text-white transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                    aria-label="Notifications"
                >
                    <Bell className="h-6 w-6" />
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-slate-950">
                        3
                    </span>
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 ml-1" />

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 rounded-full pl-1 pr-2 py-1.5 hover:bg-slate-100 transition-colors dark:hover:bg-slate-900">
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-800 text-sm font-bold text-white shadow-sm">
                                <span className="absolute inset-0 flex items-center justify-center">
                                    {initials}
                                </span>
                            </div>
                            <div className="hidden md:flex flex-col items-start text-left">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {user?.name || "Loading..."}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    {user ? roleLabel[user.role] : "—" }
                                </span >
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2">
                        <DropdownMenuLabel>
                            <div className="flex flex-col py-0.5">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.name}</span>
                                <span className="text-xs font-normal text-slate-500 truncate">{user?.email}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push("/settings")}>
                            <User className="h-4 w-4" />
                            My Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
