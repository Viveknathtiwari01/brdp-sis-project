"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentRegistrationSchema, type StudentRegistrationInput } from "@/lib/validators/student";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import {
    Plus,
    Search,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface StudentData {
    id: string;
    firstName: string;
    lastName: string;
    registrationNo: string;
    phone: string;
    currentSemester: number;
    isActive: boolean;
    createdAt: string;
    user: { email: string; isActive: boolean };
    course: { name: string; code: string };
    session: { name: string };
}

interface CourseData {
    id: string;
    name: string;
    code: string;
}

interface SessionData {
    id: string;
    name: string;
}

export default function StudentsPage() {
    const { hasPermission } = useAuth();
    const { apiFetch } = useApi();
    const [students, setStudents] = useState<StudentData[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showRegister, setShowRegister] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<any>({
        resolver: zodResolver(studentRegistrationSchema) as any,
    });

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{
                success: boolean;
                data: { students: StudentData[]; pagination: { totalPages: number } };
            }>(`/api/students?page=${page}&limit=10&search=${search}`);
            if (res.success) {
                setStudents(res.data.students);
                setTotalPages(res.data.pagination.totalPages);
            }
        } catch {
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    }, [apiFetch, page, search]);

    const fetchFormData = useCallback(async () => {
        try {
            const [coursesRes, sessionsRes] = await Promise.all([
                apiFetch<{ success: boolean; data: CourseData[] }>("/api/courses"),
                apiFetch<{ success: boolean; data: SessionData[] }>("/api/sessions"),
            ]);
            if (coursesRes.success) setCourses(coursesRes.data);
            if (sessionsRes.success) setSessions(sessionsRes.data);
        } catch {
            // Form data fetch failed silently
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    useEffect(() => {
        fetchFormData();
    }, [fetchFormData]);

    const onRegister = async (data: StudentRegistrationInput) => {
        setSubmitting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>("/api/students", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (res.success) {
                toast.success("Student registered successfully!");
                setShowRegister(false);
                reset();
                // Reset page to 1 to show the most recent student (sorted by createdAt desc)
                setPage(1);
                // Re-fetch immediately
                setTimeout(() => {
                    fetchStudents();
                }, 500);
            } else {
                toast.error(res.message || "Registration failed");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                <PageHeader
                    title="Students"
                    // description="Manage student registrations and profiles"
                    // icon={<GraduationCap className="h-6 w-6 text-blue-800" />}
                    actions={
                        hasPermission("student:create") ? (
                            <Button onClick={() => setShowRegister(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Register Student
                            </Button>
                        ) : null
                    }
                />

                {/* Search */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, registration number, or phone..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Student</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Reg. No</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Course</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Session</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Semester</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Enrolled</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={7} className="px-4 py-3">
                                                <Skeleton className="h-8 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : students.length > 0 ? (
                                    students.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {student.firstName[0]}{student.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {student.firstName} {student.lastName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{student.user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {student.registrationNo}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {student.course.name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {student.session.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="default">Sem {student.currentSemester}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={student.isActive ? "success" : "danger"}>
                                                    {student.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                {formatDate(student.createdAt)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <GraduationCap className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                            <p className="text-sm text-slate-500">No students found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Register Dialog */}
                <Dialog open={showRegister} onOpenChange={setShowRegister}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Register New Student</DialogTitle>
                            <DialogDescription>Fill in all details to register a new student.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onRegister)} className="space-y-6">
                            {/* Personal Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Personal Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label required>First Name</Label>
                                        <Input {...register("firstName")} error={errors.firstName?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Last Name</Label>
                                        <Input {...register("lastName")} error={errors.lastName?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Email</Label>
                                        <Input {...register("email")} type="email" error={errors.email?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Password</Label>
                                        <Input {...register("password")} type="password" error={errors.password?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Father&apos;s Name</Label>
                                        <Input {...register("fatherName")} error={errors.fatherName?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Mother&apos;s Name</Label>
                                        <Input {...register("motherName")} error={errors.motherName?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Date of Birth</Label>
                                        <Input {...register("dateOfBirth")} type="date" error={errors.dateOfBirth?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Gender</Label>
                                        <Select onValueChange={(v) => setValue("gender", v as "Male" | "Female" | "Other")}>
                                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.gender && <p className="text-xs text-red-500">{errors.gender.message as string}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Phone</Label>
                                        <Input {...register("phone")} error={errors.phone?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Pincode</Label>
                                        <Input {...register("pincode")} error={errors.pincode?.message} />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <Label required>Address</Label>
                                        <Input {...register("address")} error={errors.address?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>City</Label>
                                        <Input {...register("city")} error={errors.city?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>State</Label>
                                        <Input {...register("state")} error={errors.state?.message} />
                                    </div>
                                </div>
                            </div>

                            {/* Educational Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Educational Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label required>10th Board</Label>
                                        <Input {...register("tenthBoard")} error={errors.tenthBoard?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>10th Year</Label>
                                        <Input {...register("tenthYear")} type="number" error={errors.tenthYear?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>10th Percentage</Label>
                                        <Input {...register("tenthPercentage")} type="number" step="0.01" error={errors.tenthPercentage?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>12th Board</Label>
                                        <Input {...register("twelfthBoard")} error={errors.twelfthBoard?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>12th Year</Label>
                                        <Input {...register("twelfthYear")} type="number" error={errors.twelfthYear?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>12th Percentage</Label>
                                        <Input {...register("twelfthPercentage")} type="number" step="0.01" error={errors.twelfthPercentage?.message} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>12th Stream</Label>
                                        <Input {...register("twelfthStream")} error={errors.twelfthStream?.message} />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Details */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Academic Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label required>Course</Label>
                                        <Select onValueChange={(v) => setValue("courseId", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                                            <SelectContent>
                                                {courses.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.courseId && <p className="text-xs text-red-500">{errors.courseId.message as string}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label required>Session</Label>
                                        <Select onValueChange={(v) => setValue("sessionId", v)}>
                                            <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                                            <SelectContent>
                                                {sessions.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.sessionId && <p className="text-xs text-red-500">{errors.sessionId.message as string}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Roll No (Optional)</Label>
                                        <Input {...register("rollNo")} />
                                    </div>
                                </div>
                            </div>

                            {/* Initial Payment */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Initial Payment (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Amount (₹)</Label>
                                        <Input {...register("initialPayment")} type="number" placeholder="0" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Payment Mode</Label>
                                        <Select onValueChange={(v) => setValue("paymentMode", v as "CASH" | "UPI")}>
                                            <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Transaction ID</Label>
                                        <Input {...register("transactionId")} placeholder="For UPI payments" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setShowRegister(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting}>
                                    Register Student
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
