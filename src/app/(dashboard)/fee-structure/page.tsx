"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { IndianRupee, Save, Trash2, Calendar, FileText, Settings2, AlertCircle } from "lucide-react";

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
                    totalAmount: fs.totalAmount,
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
        updated[index] = { ...updated[index], [field]: value };
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
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-[#1e3a5f] dark:text-white items-center flex gap-2">
                            <Settings2 className="h-6 w-6" /> Academic Fee Structure
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Configure mandatory fee items for each semester by course and session.
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Control Panel */}
                    <Card className="lg:col-span-1 h-fit border-slate-200 dark:border-slate-800 shadow-sm border-t-4 border-t-[#1e3a5f]">
                        <CardHeader>
                            <CardTitle className="text-base font-bold">Configuration Context</CardTitle>
                            <CardDescription>Select Course/Cycle to establish fees</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Course / Program</Label>
                                <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all">
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
                                <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Academic Session</Label>
                                <Select onValueChange={setSelectedSession} value={selectedSession}>
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all">
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

                            {!selectedCourse || !selectedSession ? (
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                                        Select both context parameters above to view or modify the semester-wise fee ledger requirements.
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    onClick={onSave}
                                    className="w-full h-11 bg-[#1e3a5f] hover:bg-[#152d4a] rounded-xl font-bold shadow-lg shadow-[#1e3a5f]/20 gap-2"
                                    isLoading={saving}
                                >
                                    <Save className="h-4 w-4" />
                                    Publish Ledger Policy
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Structure Builder */}
                    <div className="lg:col-span-2 space-y-6">
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
                            <div className="space-y-4">
                                {semesters.map((sem, idx) => (
                                    <Card key={sem.semester} className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-[#1e3a5f]/30 transition-colors">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col sm:flex-row items-stretch">
                                                <div className="w-full sm:w-28 bg-[#1e3a5f] flex flex-col items-center justify-center p-4 text-white text-center">
                                                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Semester</span>
                                                    <span className="text-3xl font-black">{sem.semester}</span>
                                                </div>
                                                <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Mandatory Total Amount (₹)</Label>
                                                        <div className="relative group">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1e3a5f]">
                                                                <IndianRupee className="h-4 w-4" />
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                value={sem.totalAmount}
                                                                onChange={(e) => handleUpdateSemester(idx, "totalAmount", e.target.value)}
                                                                className="pl-9 h-11 rounded-xl bg-slate-50/50 font-bold dark:bg-slate-800/50"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Payment Deadline (Due Date)</Label>
                                                        <div className="relative group">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1e3a5f]">
                                                                <Calendar className="h-4 w-4" />
                                                            </div>
                                                            <Input
                                                                type="date"
                                                                value={sem.dueDate}
                                                                onChange={(e) => handleUpdateSemester(idx, "dueDate", e.target.value)}
                                                                className="pl-9 h-11 rounded-xl bg-slate-50/50 font-bold dark:bg-slate-800/50"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Description / Breakdown (Optional)</Label>
                                                        <Input
                                                            value={sem.description}
                                                            onChange={(e) => handleUpdateSemester(idx, "description", e.target.value)}
                                                            className="h-10 rounded-xl bg-slate-50/50 font-medium dark:bg-slate-800/50 border-none px-0 focus:ring-0 focus:bg-transparent"
                                                            placeholder="Add fee component breakdown here..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
