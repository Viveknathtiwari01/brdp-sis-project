"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
    GraduationCap,
    BookOpen,
    IndianRupee,
    Users,
    TrendingUp,
    Calendar,
    BarChart3,
    ArrowUpRight,
} from "lucide-react";

interface DashboardStats {
    totalStudents: number;
    totalCourses: number;
    totalFeeCollected: number;
    totalPendingFees: number;
    recentPayments: Array<{
        id: string;
        amount: number;
        student: { firstName: string; lastName: string };
        feeLedger: { semester: number };
        paidAt: string;
    }>;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const { apiFetch } = useApi();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch basic counts in parallel
            const [studentsRes, coursesRes, paymentsRes] = await Promise.all([
                apiFetch<{ success: boolean; data: { pagination: { total: number } } }>("/api/students?limit=1"),
                apiFetch<{ success: boolean; data: Array<unknown> }>("/api/courses"),
                apiFetch<{ success: boolean; data: { payments: Array<unknown>; pagination: { total: number } } }>("/api/payments?limit=5"),
            ]);

            setStats({
                totalStudents: studentsRes?.data?.pagination?.total || 0,
                totalCourses: Array.isArray(coursesRes?.data) ? coursesRes.data.length : 0,
                totalFeeCollected: 0,
                totalPendingFees: 0,
                recentPayments: (paymentsRes?.data?.payments || []) as DashboardStats["recentPayments"],
            });
        } catch {
            setStats({
                totalStudents: 0,
                totalCourses: 0,
                totalFeeCollected: 0,
                totalPendingFees: 0,
                recentPayments: [],
            });
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const statCards = [
        {
            title: "Total Students",
            value: stats?.totalStudents || 0,
            icon: GraduationCap,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
            title: "Active Courses",
            value: stats?.totalCourses || 0,
            icon: BookOpen,
            color: "text-indigo-600",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
        },
        {
            title: "Fee Collected",
            value: formatCurrency(stats?.totalFeeCollected || 0),
            icon: IndianRupee,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            title: "Pending Fees",
            value: formatCurrency(stats?.totalPendingFees || 0),
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
        },
    ];

    return (
        <DashboardShell>
            <div className="space-y-8 animate-fade-in">
                <PageHeader
                    title="Dashboard Overview"
                    // description={`Welcome back, ${user?.name || ""}. Here is what's happening today.`}
                    // icon={<BarChart3 className="h-6 w-6 text-blue-800" />}
                    actions={
                        <div className="flex items-center gap-2 text-sm font-medium text-white dark:text-slate-400 bg-blue-800 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm ">
                            <Calendar className="h-4 w-4 text-white" />
                            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                    }
                />

                {/* Stats Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((card) => (
                        <Card
                            key={card.title}
                            className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                                        <card.icon className={`h-6 w-6 ${card.color}`} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {card.title}
                                        </p>
                                        {loading ? (
                                            <Skeleton className="mt-2 h-7 w-20 ml-auto" />
                                        ) : (
                                            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                                                {card.value}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                        <span>System Active</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Updated just now</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bottom Section */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Payments */}
                    <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Recent Transactions</CardTitle>
                                <p className="text-xs text-slate-500 mt-1">Latest fee payments recorded in system</p>
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none px-2.5 py-1">
                                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                Live Feed
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : stats?.recentPayments && stats.recentPayments.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.recentPayments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="group flex items-center justify-between rounded-xl border border-transparent bg-slate-50 p-4 transition-all hover:border-slate-200 hover:bg-white dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
                                                    <IndianRupee className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                        {payment.student.firstName} {payment.student.lastName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">
                                                        Semester {payment.feeLedger.semester} • {new Date(payment.paidAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    +{formatCurrency(payment.amount)}
                                                </p>
                                                <Badge variant="outline" className="text-[10px] h-4 mt-1 border-emerald-200 text-emerald-600 dark:border-emerald-900/50">Success</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                        <IndianRupee className="h-8 w-8 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No recent transactions found</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Info & Actions */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold">System Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Academic Session</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">2024 - 2025</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Your Access Level</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{user?.role?.replace("_", " ")}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">All services online</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-600 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <GraduationCap className="h-24 w-24" />
                            </div>
                            <CardContent className="p-6 relative z-10">
                                <h3 className="font-bold text-lg">Need Support?</h3>
                                <p className="text-indigo-100 text-sm mt-2 leading-relaxed">Contact the IT helpdesk for system assistance or permission requests.</p>
                                <button className="mt-4 w-full py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors">
                                    Get Assistance
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
