"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
    GraduationCap,
    BookOpen,
    IndianRupee,
    Users,
    TrendingUp,
    Calendar,
    BarChart3,
    ArrowUpRight,
    AlertTriangle,
    Receipt,
    Clock,
} from "lucide-react";

type DashboardPayload = {
  scope: "ADMIN" | "STUDENT";
  kpis: {
    totalStudents: number;
    totalCourses: number;
    feesCollected: number;
    pendingFees: number;
    overdueFees: number;
  };
  paymentModeTotals?: {
    CASH: number;
    UPI: number;
  };
  activeSession: string | null;
  latestPayments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    receiptNumber: string;
    paymentMode: string;
    student: {
      name: string;
      rollNo: string;
      course?: { name: string; code: string };
    };
    semester: number;
  }>;
  feeRecords: Array<{
    id: string;
    student: {
      name: string;
      rollNo: string;
      course?: { name: string; code: string };
    };
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    dueDate: string | null;
    dueAmount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
  }>;
  courseFeeOverview: Array<{
    courseName: string;
    courseCode: string;
    collected: number;
    pending: number;
    overdue: number;
  }>;
  feeBarChart?: {
    all: {
      id: string;
      label: string;
      collected: number;
      pending: number;
      overdue: number;
      recordCount: number;
    };
    byCourse: Array<{
      id: string;
      label: string;
      courseCode: string;
      courseName: string;
      collected: number;
      pending: number;
      overdue: number;
      recordCount: number;
    }>;
    bySession: Array<{
      id: string;
      label: string;
      sessionName: string;
      collected: number;
      pending: number;
      overdue: number;
      recordCount: number;
    }>;
    matrix: Array<{
      courseCode: string;
      courseName: string;
      sessionName: string;
      collected: number;
      pending: number;
      overdue: number;
      recordCount: number;
    }>;
    filters: {
      courses: Array<{ code: string; name: string }>;
      sessions: Array<{ name: string }>;
    };
  };
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return clamp01(part / total);
}

export default function DashboardPage() {
  useAuth();
  const { apiFetch } = useApi();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [hovered, setHovered] = useState<any>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const res = await apiFetch<{ success: boolean; data: DashboardPayload }>("/api/dashboard");
      if (res.success) setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const sessions = data?.feeBarChart?.filters?.sessions || [];
    if (sessionFilter === "ALL") return;
    if (sessions.length === 0) return;
    const exists = sessions.some((s) => s.name === sessionFilter);
    if (!exists) setSessionFilter("ALL");
  }, [data?.feeBarChart?.filters?.sessions, sessionFilter]);

  const chartMax = Math.max(
    1,
    ...(data?.courseFeeOverview || []).map((c) => Math.max(c.collected, c.pending, c.overdue))
  );

  const barSource = data?.feeBarChart;

  const barRows = (() => {
    if (!barSource) return [] as any[];

    const matrix = barSource.matrix || [];
    const sessionSelected = sessionFilter !== "ALL" ? sessionFilter : null;

    const courses = barSource.filters?.courses || [];
    const pickFrom = sessionSelected ? matrix.filter((m) => m.sessionName === sessionSelected) : [];

    return courses.map((c) => {
      const m = sessionSelected
        ? pickFrom.find((x) => x.courseCode === c.code)
        : (barSource.byCourse || []).find((x) => x.courseCode === c.code);

      return {
        id: c.code,
        mode: "COURSE" as const,
        label: c.code,
        courseName: c.name,
        courseCode: c.code,
        collected: m?.collected || 0,
        pending: m?.pending || 0,
        overdue: m?.overdue || 0,
        recordCount: m?.recordCount || 0,
        sessionName: sessionSelected || undefined,
      };
    });
  })();

  const stackedRows = barRows.map((r) => {
    const overdue = Math.max(0, r.overdue || 0);
    const pendingNonOverdue = Math.max(0, (r.pending || 0) - overdue);
    const collected = Math.max(0, r.collected || 0);
    const total = collected + pendingNonOverdue + overdue;
    return {
      ...r,
      collected,
      pendingNonOverdue,
      overdue,
      total,
    };
  });

  const barMax = Math.max(1, ...stackedRows.map((r) => r.total));

  const totalDue = (data?.kpis.feesCollected || 0) + (data?.kpis.pendingFees || 0);
  const collectedPct = percent(data?.kpis.feesCollected || 0, totalDue);
  const pendingPct = percent(data?.kpis.pendingFees || 0, totalDue);
  const overduePct = percent(data?.kpis.overdueFees || 0, totalDue);

  function formatCompactCurrency(v: number) {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${Math.round(v / 1000)}K`;
    return `₹${Math.round(v)}`;
  }

  return (
    <DashboardShell>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Dashboard"
          // description={`Welcome back, ${user?.name || ""}. Here is what's happening today.`}
          // icon={<BarChart3 className="h-6 w-6 text-blue-800" />}
          actions={
            <div className="flex items-center gap-2 text-sm font-medium text-white bg-blue-800 px-3 py-2 rounded-lg border border-slate-200 shadow-sm dark:text-slate-200 dark:bg-slate-950 dark:border-slate-800">
              <Calendar className="h-4 w-4 text-white" />
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-purple-300 bg-gradient-to-b from-purple-50 to-white dark:border-purple-900/60 dark:from-purple-500/10 dark:to-slate-950">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl b" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Students</p>
                    <p className="mt-1 text-3xl font-black text-purple-900 dark:text-purple-100">{data?.kpis.totalStudents || 0}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-800" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-b from-blue-50 to-white dark:border-blue-900/60 dark:from-blue-500/10 dark:to-slate-950">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Courses</p>
                    <p className="mt-1 text-3xl font-black text-blue-900 dark:text-blue-100">{data?.kpis.totalCourses || 0}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-900/60 dark:from-emerald-500/10 dark:to-slate-950">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Collected Fees</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(data?.kpis.feesCollected || 0)}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-b from-amber-50 to-white dark:border-amber-900/60 dark:from-amber-500/10 dark:to-slate-950">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Fees</p>
                    <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{formatCurrency(data?.kpis.pendingFees || 0)}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-gradient-to-b from-rose-50 to-white dark:border-rose-900/60 dark:from-rose-500/10 dark:to-slate-950">
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue Fees</p>
                    <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(data?.kpis.overdueFees || 0)}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 h-auto lg:h-[540px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Fee Collection Overview</CardTitle>
                  {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Collected vs pending vs overdue (filter by all / course / session)</p> */}
                </div>
                {/* <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 bg-white dark:border-slate-800 dark:text-slate-300 dark:bg-slate-950">
                    {data?.activeSession || "Active Session"}
                  </Badge>
                </div> */}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {loading ? (
                  <Skeleton className="h-[240px] w-full rounded-xl" />
                ) : data?.scope === "ADMIN" && stackedRows.length > 0 ? (
                  <div
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    onMouseLeave={() => {
                      setHovered(null);
                      setHoverPos(null);
                    }}
                    onMouseMove={(e) => {
                      if (!hovered) return;
                      setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                  >
                    {hovered && hoverPos ? (
                      <div
                        className="pointer-events-none fixed z-50 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                        style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}
                      >
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {hovered.mode === "COURSE"
                            ? `${hovered.courseName}${hovered.courseCode ? ` • ${hovered.courseCode}` : ""}`
                            : hovered.mode === "SESSION"
                              ? hovered.sessionName
                              : hovered.label}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                              Collected
                            </span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(hovered.collected || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
                              Pending
                            </span>
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                              {formatCurrency(hovered.pendingNonOverdue || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
                              Overdue
                            </span>
                            <span className="font-semibold text-rose-700 dark:text-rose-300">
                              {formatCurrency(hovered.overdue || 0)}
                            </span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Total records</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {hovered.recordCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-medium text-slate-600 dark:text-slate-300">Session:</span>
                          <div className="w-full sm:w-[210px]">
                            <Select value={sessionFilter} onValueChange={setSessionFilter}>
                              <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                                <SelectValue placeholder="All Sessions" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Sessions</SelectItem>
                                {(barSource?.filters?.sessions || []).map((s) => (
                                  <SelectItem key={s.name} value={s.name}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 p-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded-sm bg-emerald-500" />
                          Collected
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded-sm bg-amber-500" />
                          Pending
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded-sm bg-rose-500" />
                          Overdue
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 overflow-x-auto">
                        <div className="grid gap-4 min-w-0 w-full" style={{ gridTemplateColumns: "64px minmax(0, 1fr)" }}>
                          <div className="flex h-[220px] sm:h-[240px] flex-col">
                            <div className="relative flex-1">
                              {Array.from({ length: 6 }).map((_, i) => {
                                const pct = i / 5;
                                const value = Math.round((barMax * (1 - pct)) / 100) * 100;
                                return (
                                  <div key={i} className="absolute left-0 right-0" style={{ top: `${pct * 100}%` }}>
                                    <div className="-translate-y-1/2 text-[11px] text-slate-500 dark:text-slate-400">
                                      {value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${value}`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="h-8" />
                          </div>

                          <div className="flex h-[220px] sm:h-[240px] flex-col">
                            <div className="relative flex-1">
                              <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800" />

                              <div
                                className="grid h-full items-end gap-3"
                                style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(stackedRows.length, 10))}, minmax(0, 1fr))` }}
                              >
                                {stackedRows.map((r) => {
                                  const hCollected = Math.round(percent(r.collected, barMax) * 100);
                                  const hPending = Math.round(percent(r.pendingNonOverdue, barMax) * 100);
                                  const hOverdue = Math.round(percent(r.overdue, barMax) * 100);

                                  return (
                                    <div key={r.id} className="flex flex-col items-center">
                                      <div
                                        className="w-10 bg-slate-200 overflow-hidden shadow-inner dark:bg-slate-800/60"
                                        style={{ height: "180px" }}
                                        onMouseEnter={() => setHovered(r)}
                                      >
                                        <div className="flex h-full flex-col justify-end">
                                          <div className="w-full bg-emerald-500" style={{ height: `${hCollected}%` }} />
                                          <div className="w-full bg-amber-500" style={{ height: `${hPending}%` }} />
                                          <div className="w-full bg-rose-500" style={{ height: `${hOverdue}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div
                              className="grid items-start gap-5 pt-2"
                              style={{ gridTemplateColumns: `repeat(${stackedRows.length || 1}, minmax(0, 1fr))` }}
                            >
                              {stackedRows.map((r) => {
                                const xLabel = r.courseName || r.label;
                                return (
                                  <div key={`${r.id}-label`} className="flex justify-center">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{xLabel}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <BarChart3 className="h-10 w-10 opacity-20" />
                    <p className="mt-3 text-sm font-medium">No overview data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Payment Modes</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
                    <div className="border-amber-200 bg-gradient-to-b from-amber-50 to-white dark:border-amber-900/60 dark:from-amber-500/10 dark:to-slate-950 border rounded-lg p-4">
                      <p className="text-amber-600 text-sm font-semibold uppercase tracking-wider">Total Cash Payment</p>
                      <p className="mt-2 text-xl font-black text-amber-900 dark:text-amber-100">
                        {formatCurrency(data?.paymentModeTotals?.CASH || 0)}
                      </p>
                    </div>
                    <div className="border-rose-200 bg-gradient-to-b from-rose-50 to-white dark:border-rose-900/60 dark:from-rose-500/10 dark:to-slate-950 border rounded-lg p-4">
                      <p className="text-rose-600 text-sm font-semibold uppercase tracking-wider">Total UPI Payment</p>
                      <p className="mt-2 text-xl font-black text-rose-900 dark:text-rose-100">
                        {formatCurrency(data?.paymentModeTotals?.UPI || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 h-auto lg:h-[540px] flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Latest Payments</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                        ))}
                                    </div>
                                ) : (data?.latestPayments?.length || 0) > 0 ? (
                                    <div className="space-y-2">
                                        {(data?.latestPayments || []).map((p) => (
                                            <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                                                        <Receipt className="h-5 w-5 text-cyan-300" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{p.student.name}</p>
                                                        <p className="text-[11px] text-slate-500">
                                                            Sem {p.semester} • {formatDateTime(p.paidAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-300">{formatCurrency(p.amount)}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{p.receiptNumber}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                                        <IndianRupee className="h-10 w-10 opacity-20" />
                                        <p className="mt-2 text-sm font-medium">No payments found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Fee Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {loading ? (
                                    <Skeleton className="h-40 w-full rounded-xl" />
                                ) : (
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="relative h-28 w-28 shrink-0 mx-auto md:mx-0">
                                            <div
                                                className="h-28 w-28 rounded-full"
                                                style={{
                                                    background: `conic-gradient(#22c55e ${Math.round(collectedPct * 360)}deg, #f59e0b ${Math.round((collectedPct + pendingPct) * 360)}deg, #f43f5e ${Math.round((collectedPct + pendingPct + overduePct) * 360)}deg, #1f2937 0deg)`,
                                                }}
                                            />
                                            <div className="absolute inset-3 rounded-full bg-white border border-slate-200 flex items-center justify-center dark:bg-slate-950 dark:border-slate-800">
                                                <div className="text-center">
                                                    <p className="text-xl font-black text-slate-900 dark:text-slate-100">{Math.round(collectedPct * 100)}%</p>
                                                    <p className="text-[10px] text-slate-500">Collected</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                                                    Collected
                                                </div>
                                                <p className="font-bold text-emerald-300">{formatCurrency(data?.kpis.feesCollected || 0)}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                                                    Pending
                                                </div>
                                                <p className="font-bold text-amber-300">{formatCurrency(data?.kpis.pendingFees || 0)}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                                                    Overdue
                                                </div>
                                                <p className="font-bold text-rose-300">{formatCurrency(data?.kpis.overdueFees || 0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-amber-300" />
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">{formatCurrency(data?.kpis.pendingFees || 0)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-rose-300" />
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">{formatCurrency(data?.kpis.overdueFees || 0)}</p>
                                    </div>
                                </div> */}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Student Fee Records</CardTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Per-student fee summary (total program fee, paid till today, pending, and current dues)</p>
                        </div>
                        <Badge variant="outline" className="border-slate-200 text-slate-600 bg-white dark:border-slate-700 dark:text-slate-300 dark:bg-slate-950">
                            {data?.scope === "STUDENT" ? "My Ledger" : "All Students"}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-48 w-full rounded-xl" />
                        ) : (data?.feeRecords?.length || 0) > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Roll No</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Student</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Course</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Total Amt</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Paid</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Pending</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Due Date</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Due Amt</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {(data?.feeRecords || []).map((r) => {
                                            const overdue = r.status === "OVERDUE";
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{r.student.rollNo}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.student.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                        {r.student.course ? `${r.student.course.name} (${r.student.course.code})` : "-"}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(r.totalAmount)}</td>
                                                    <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">{formatCurrency(r.paidAmount)}</td>
                                                    <td className="px-4 py-3 text-amber-700 dark:text-amber-300">{formatCurrency(r.pendingAmount)}</td>
                                                    <td className={`px-4 py-3 ${overdue ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>
                                                        {r.dueDate ? formatDate(r.dueDate) : "-"}
                                                    </td>
                                                    <td className={`px-4 py-3 ${overdue ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>
                                                        {r.dueAmount > 0 ? formatCurrency(r.dueAmount) : "-"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={
                                                                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold " +
                                                                (r.status === "PAID"
                                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300"
                                                                    : r.status === "OVERDUE"
                                                                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300"
                                                                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300")
                                                            }
                                                        >
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                                <Users className="h-10 w-10 opacity-20" />
                                <p className="mt-3 text-sm font-medium">No fee records found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}
