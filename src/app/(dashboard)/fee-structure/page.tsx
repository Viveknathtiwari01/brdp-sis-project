"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { IndianRupee, Save, Calendar, FileText, Settings2, AlertCircle, Pencil } from "lucide-react";

interface Course {
    id: string;
    name: string;
    code: string;
    totalSemesters: number;
}

interface Session {
    id: string;
    name: string;
}

interface FeeStructureItem {
    semester: number;
    totalAmount: number;
    dueDate: string;
    description: string;
}

export default function FeeStructurePage() {
    const { hasPermission } = useAuth();
    const { apiFetch } = useApi();

    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedSession, setSelectedSession] = useState<string>("");
    const [semesters, setSemesters] = useState<FeeStructureItem[]>([]);

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [coursesRes, sessionsRes] = await Promise.all([
                apiFetch<{ success: boolean; data: Course[] }>("/api/courses"),
                apiFetch<{ success: boolean; data: Session[] }>("/api/sessions"),
            ]);
            if (coursesRes.success) setCourses(coursesRes.data);
            if (sessionsRes.success) setSessions(sessionsRes.data);
        } catch {
            toast.error("Failed to fetch requirements");
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchFeeStructure = useCallback(async () => {
        if (!selectedCourse || !selectedSession) return;

        try {
            setLoading(true);
            const res = await apiFetch<{ success: boolean; data: any[] }>(
                `/api/fee-structures?courseId=${selectedCourse}&sessionId=${selectedSession}`
            );

            const course = courses.find((c) => c.id === selectedCourse);
            const totalSems = course?.totalSemesters || 0;

            if (res.success && res.data.length > 0) {
                // Map existing structures
                const mapped: FeeStructureItem[] = res.data.map((fs) => ({
                    semester: fs.semester,
                    totalAmount: Math.round(Number(fs.totalAmount) || 0),
                    dueDate: new Date(fs.dueDate).toISOString().split("T")[0],
                    description: fs.description || "",
                }));
                // Ensure all semesters are covered
                const completed: FeeStructureItem[] = [];
                for (let i = 1; i <= totalSems; i++) {
                    const existing = mapped.find((m) => m.semester === i);
                    completed.push(existing || {
                        semester: i,
                        totalAmount: 0,
                        dueDate: "",
                        description: "",
                    });
                }
                setSemesters(completed);
            } else {
                // Initialize empty for all semesters
                const empty: FeeStructureItem[] = Array.from({ length: totalSems }, (_, i) => ({
                    semester: i + 1,
                    totalAmount: 0,
                    dueDate: "",
                    description: "",
                }));
                setSemesters(empty);
            }
        } catch {
            toast.error("Could not fetch structure");
        } finally {
            setLoading(false);
        }
    }, [apiFetch, selectedCourse, selectedSession, courses]);

    useEffect(() => {
        fetchFeeStructure();
    }, [fetchFeeStructure]);

    const handleUpdateSemester = (index: number, field: keyof FeeStructureItem, value: any) => {
        const updated = [...semesters];
        if (field === "totalAmount") {
            const next = value === "" ? 0 : Number(value);
            updated[index] = {
                ...updated[index],
                [field]: Number.isFinite(next) ? Math.round(next) : 0,
            };
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setSemesters(updated);
    };

    const onSave = async () => {
        if (!selectedCourse || !selectedSession) {
            toast.error("Select course and session first");
            return;
        }

        // Basic validation
        const isValid = semesters.every((s) => s.totalAmount > 0 && s.dueDate);
        if (!isValid) {
            toast.error("Please fill all amounts and due dates");
            return;
        }

        setSaving(true);
        try {
            const res = await apiFetch<{ success: boolean }>("/api/fee-structures", {
                method: "POST",
                body: JSON.stringify({
                    courseId: selectedCourse,
                    sessionId: selectedSession,
                    semesters: semesters,
                }),
            });
            if (res.success) {
                toast.success("Fee structure established for this academic cycle");
                await fetchFeeStructure();
            } else {
                toast.error("Failed to update structure");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardShell>
            <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
                <PageHeader
                    title="Academic Fee Structure"
                    // icon={<Settings2 className="h-6 w-6 text-blue-800" />}
                />

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold">Configuration Context</CardTitle>
                        {/* <CardDescription>Select course and academic session to establish semester-wise fees</CardDescription> */}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Course / Program</Label>
                                <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 transition-all">
                                        <SelectValue placeholder="Select Course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id} className="font-medium">
                                                {course.name} ({course.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Academic Session</Label>
                                <Select onValueChange={setSelectedSession} value={selectedSession}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 transition-all">
                                        <SelectValue placeholder="Select Session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((session) => (
                                            <SelectItem key={session.id} value={session.id} className="font-medium">
                                                {session.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {!selectedCourse || !selectedSession ? (
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                                    Select both context parameters above to view or modify the semester-wise fee ledger requirements.
                                </p>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                {/* Structure Builder */}
                <div className="space-y-6">
                    {!selectedCourse || !selectedSession ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-60">
                            <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <FileText className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-400">Establish Context to Configure</h3>
                        </div>
                    ) : loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Array.from({ length: Math.ceil(semesters.length / 2) }, (_, yearIndex) => {
                                const semStart = yearIndex * 2;
                                const group = semesters.slice(semStart, semStart + 2);

                                return (
                                    <Card key={yearIndex} className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <CardHeader className="pb-4 bg-blue-100 dark:bg-slate-900/40 border-b border-slate-200/70 dark:border-slate-800">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        Year {yearIndex + 1}
                                                    </CardTitle>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {group.map((sem, localIdx) => {
                                                    const idx = semStart + localIdx;
                                                    return (
                                                        <Card
                                                            key={sem.semester}
                                                            className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl"
                                                        >
                                                            <CardHeader className="py-4 bg-white dark:bg-slate-900">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-xl bg-blue-800 text-white flex items-center justify-center font-black shadow-sm">
                                                                            {sem.semester}
                                                                        </div>
                                                                        <div className="leading-tight">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Semester</p>
                                                                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Semester {sem.semester}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="pt-0 pb-5">
                                                                <div className="grid gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mandatory Total Amount (₹)</Label>
                                                                        <div className="relative group">
                                                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 group-focus-within:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-200">
                                                                                <IndianRupee className="h-4 w-4" />
                                                                            </div>
                                                                            <Input
                                                                                type="number"
                                                                                step={1}
                                                                                value={sem.totalAmount}
                                                                                onChange={(e) => handleUpdateSemester(idx, "totalAmount", e.target.value)}
                                                                                className="pl-12 h-11 rounded-xl bg-white dark:bg-slate-900 font-bold"
                                                                                placeholder="0.00"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Deadline (Due Date)</Label>
                                                                        <div className="relative group">
                                                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 group-focus-within:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-200">
                                                                                <Calendar className="h-4 w-4" />
                                                                            </div>
                                                                            <Input
                                                                                type="date"
                                                                                value={sem.dueDate}
                                                                                onChange={(e) => handleUpdateSemester(idx, "dueDate", e.target.value)}
                                                                                className="pl-12 h-11 rounded-xl bg-white dark:bg-slate-900 font-bold"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description / Breakdown (Optional)</Label>
                                                                        <div className="relative group">
                                                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 group-focus-within:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                                                                <Pencil className="h-4 w-4" />
                                                                            </div>
                                                                            <Input
                                                                                value={sem.description}
                                                                                onChange={(e) => handleUpdateSemester(idx, "description", e.target.value)}
                                                                                className="pl-12 h-10 rounded-xl bg-white dark:bg-slate-900 font-medium"
                                                                                placeholder="Add fee component breakdown here..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {selectedCourse && selectedSession ? (
                        <div className="flex justify-end">
                            <Card className="w-fit border-slate-200 dark:border-slate-800 shadow-sm">
                                <CardContent className="p-3">
                                    <Button
                                        onClick={onSave}
                                        className="h-11 px-6 bg-blue-800 hover:bg-blue-900 rounded-xl font-bold shadow-md gap-2"
                                        isLoading={saving}
                                    >
                                        <Save className="h-4 w-4" />
                                        Publish Ledger Policy
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </div>
            </div>
        </DashboardShell>
    );
}
