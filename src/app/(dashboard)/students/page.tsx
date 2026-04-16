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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { ImageUpload } from "@/components/ui/image-upload";
import { COLLEGE_CONFIG } from "@/lib/college-config";
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
    Eye,
    EyeOff,
    MoreHorizontal,
    Pencil,
    Trash2,
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

type StudentDetails = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    registrationNo: string;
    rollNo: string;
    fatherName: string;
    motherName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    tenthBoard: string;
    tenthYear: number;
    tenthPercentage: number;
    twelfthBoard: string;
    twelfthYear: number;
    twelfthPercentage: number;
    twelfthStream: string;
    currentSemester: number;
    isActive: boolean;
    createdAt: string;
    user: { id: string; email: string; name: string; isActive: boolean };
    course: { id: string; name: string; code: string };
    session: { id: string; name: string };
};

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
    const { user, hasPermission } = useAuth();
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
    const [showPassword, setShowPassword] = useState(false);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsMode, setDetailsMode] = useState<"view" | "edit">("view");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsSaving, setDetailsSaving] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const loadStudents = useCallback(
        async (params?: { page?: number; search?: string }) => {
            const nextPage = params?.page ?? page;
            const nextSearch = params?.search ?? search;

            try {
                setLoading(true);
                const query = new URLSearchParams({
                    page: String(nextPage),
                    limit: "10",
                });
                if (nextSearch.trim()) query.set("search", nextSearch.trim());

                const res = await apiFetch<{
                    success: boolean;
                    data: { students: StudentData[]; pagination: { totalPages: number } };
                }>(`/api/students?${query.toString()}`);
                if (res.success) {
                    setStudents(res.data.students);
                    setTotalPages(res.data.pagination.totalPages);
                }
            } catch {
                toast.error("Failed to fetch students");
            } finally {
                setLoading(false);
            }
        },
        [apiFetch, page, search]
    );

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{
                success: boolean;
                data: { students: StudentData[]; pagination: { totalPages: number } };
            }>(`/api/students?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
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

    const isAdminUser = user?.role === "SYSTEM_ADMIN" || user?.role === "ADMIN";
    const canEdit = isAdminUser && hasPermission("student:edit");
    const canDelete = isAdminUser && hasPermission("student:delete");
    const canUseActions = canEdit || canDelete;

    const openDetails = async (id: string, mode: "view" | "edit") => {
        setSelectedId(id);
        setDetailsMode(mode);
        setDetailsOpen(true);
        setDetailsLoading(true);
        try {
            const res = await apiFetch<{ success: boolean; data: StudentDetails }>(`/api/students/${id}`);
            if (res.success) {
                setSelectedStudent(res.data);
            } else {
                toast.error("Failed to load student");
                setDetailsOpen(false);
            }
        } catch {
            toast.error("Failed to load student");
            setDetailsOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const submitEdit = async () => {
        if (!selectedId || !selectedStudent) return;
        setDetailsSaving(true);
        try {
            const payload = {
                registrationNo: selectedStudent.registrationNo,
                rollNo: selectedStudent.rollNo,
                firstName: selectedStudent.firstName,
                lastName: selectedStudent.lastName,
                fatherName: selectedStudent.fatherName,
                motherName: selectedStudent.motherName,
                dateOfBirth: selectedStudent.dateOfBirth,
                gender: selectedStudent.gender,
                phone: selectedStudent.phone,
                address: selectedStudent.address,
                city: selectedStudent.city,
                state: selectedStudent.state,
                pincode: selectedStudent.pincode,
                tenthBoard: selectedStudent.tenthBoard,
                tenthYear: selectedStudent.tenthYear,
                tenthPercentage: selectedStudent.tenthPercentage,
                twelfthBoard: selectedStudent.twelfthBoard,
                twelfthYear: selectedStudent.twelfthYear,
                twelfthPercentage: selectedStudent.twelfthPercentage,
                twelfthStream: selectedStudent.twelfthStream,
                currentSemester: selectedStudent.currentSemester,
                courseId: selectedStudent.course?.id,
                sessionId: selectedStudent.session?.id,
            };

            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/students/${selectedId}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (res.success) {
                toast.success("Student updated successfully");
                setDetailsOpen(false);
                await loadStudents({ page, search });
            } else {
                toast.error(res.message || "Failed to update");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update");
        } finally {
            setDetailsSaving(false);
        }
    };

    const confirmDelete = (id: string) => {
        setSelectedId(id);
        setDeleteOpen(true);
    };

    const doDelete = async () => {
        if (!selectedId) return;
        setDeleting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/students/${selectedId}`, {
                method: "DELETE",
            });
            if (res.success) {
                toast.success("Student deleted successfully");
                setDeleteOpen(false);
                setSelectedId(null);
                await loadStudents({ page, search });
            } else {
                toast.error(res.message || "Failed to delete");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

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
                setSearch("");
                const nextPage = 1;
                setPage(nextPage);
                await loadStudents({ page: nextPage, search: "" });
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
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 shadow-sm focus-visible:ring-2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full text-sm">
                            <thead>
                                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Student</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Reg. No</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Course</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Session</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Semester</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Enrolled</th>
                                    {canUseActions && (
                                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">Action</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={canUseActions ? 8 : 7} className="px-4 py-3">
                                                <Skeleton className="h-8 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : students.length > 0 ? (
                                    students.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {student.firstName[0]}{student.lastName[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                                            {student.firstName} {student.lastName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate max-w-[260px]">{student.user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {student.registrationNo}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {student.course.name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
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

                                            {canUseActions && (
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-lg"
                                                                aria-label="Student actions"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openDetails(student.id, "view")}>
                                                                <Eye className="h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>

                                                            {canEdit && (
                                                                <DropdownMenuItem onClick={() => openDetails(student.id, "edit")}>
                                                                    <Pencil className="h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            )}

                                                            {canDelete && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                                                                        onClick={() => confirmDelete(student.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canUseActions ? 8 : 7} className="px-4 py-12 text-center">
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
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Personal Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label required>College</Label>
                                        <Select onValueChange={(v) => setValue("collegeCode", v as "BRDP" | "RAK")}>
                                            <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(COLLEGE_CONFIG).map(([code, config]) => (
                                                    <SelectItem key={code} value={code}>{config.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.collegeCode && <p className="text-xs text-red-500">{errors.collegeCode.message as string}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>Registration Number</Label>
                                        <Input {...register("registrationNo")} error={errors.registrationNo?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Roll No</Label>
                                        <Input {...register("rollNo")} error={errors.rollNo?.message} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>First Name</Label>
                                        <Input {...register("firstName")} error={errors.firstName?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Last Name</Label>
                                        <Input {...register("lastName")} error={errors.lastName?.message} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>Father&apos;s Name</Label>
                                        <Input {...register("fatherName")} error={errors.fatherName?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Mother&apos;s Name</Label>
                                        <Input {...register("motherName")} error={errors.motherName?.message} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>Email</Label>
                                        <Input {...register("email")} type="email" error={errors.email?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Password</Label>
                                        <div className="relative">
                                            <Input
                                                {...register("password")}
                                                type={showPassword ? "text" : "password"}
                                                error={errors.password?.message}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((s) => !s)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>Date of Birth</Label>
                                        <Input {...register("dateOfBirth")} type="date" error={errors.dateOfBirth?.message} />
                                    </div>
                                    <div className="space-y-1.5">
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

                                    <div className="space-y-1.5">
                                        <Label required>Phone</Label>
                                        <Input {...register("phone")} error={errors.phone?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>City</Label>
                                        <Input {...register("city")} error={errors.city?.message} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label required>State</Label>
                                        <Input {...register("state")} error={errors.state?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Pincode</Label>
                                        <Input {...register("pincode")} error={errors.pincode?.message} />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label required>Address</Label>
                                        <textarea
                                            {...register("address")}
                                            rows={2}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100 dark:placeholder:text-slate-500"
                                        />
                                        {errors.address && <p className="text-xs text-red-500">{errors.address.message as string}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Educational Details */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Educational Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label required>10th Board</Label>
                                        <Input {...register("tenthBoard")} error={errors.tenthBoard?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>10th Year</Label>
                                        <Input {...register("tenthYear")} type="number" error={errors.tenthYear?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>10th Percentage</Label>
                                        <Input {...register("tenthPercentage")} type="number" step="0.01" error={errors.tenthPercentage?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>12th Board</Label>
                                        <Input {...register("twelfthBoard")} error={errors.twelfthBoard?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>12th Year</Label>
                                        <Input {...register("twelfthYear")} type="number" error={errors.twelfthYear?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>12th Percentage</Label>
                                        <Input {...register("twelfthPercentage")} type="number" step="0.01" error={errors.twelfthPercentage?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>12th Stream</Label>
                                        <Input {...register("twelfthStream")} error={errors.twelfthStream?.message} />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Details */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Academic Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
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

                                    <div className="space-y-1.5">
                                        <Label required>Semester</Label>
                                        <Input
                                            {...register("currentSemester")}
                                            type="number"
                                            min={1}
                                            placeholder="1"
                                            error={errors.currentSemester?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
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
                                </div>
                            </div>

                            {/* Initial Payment */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Initial Payment (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Amount (₹)</Label>
                                        <Input {...register("initialPayment")} type="number" placeholder="0" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Payment Mode</Label>
                                        <Select onValueChange={(v) => setValue("paymentMode", v as "CASH" | "UPI")}>
                                            <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Transaction ID</Label>
                                        <Input {...register("transactionId")} placeholder="For UPI payments" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
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

                {/* View / Edit Dialog */}
                <Dialog
                    open={detailsOpen}
                    onOpenChange={(open) => {
                        setDetailsOpen(open);
                        if (!open) {
                            setSelectedStudent(null);
                            setSelectedId(null);
                            setDetailsMode("view");
                        }
                    }}
                >
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {detailsMode === "view" ? "View Student" : "Edit Student"}
                            </DialogTitle>
                            <DialogDescription>
                                {detailsMode === "view"
                                    ? "Student details (read-only)."
                                    : "Update student details. Email cannot be changed."}
                            </DialogDescription>
                        </DialogHeader>

                        {detailsLoading || !selectedStudent ? (
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Personal Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>Registration Number</Label>
                                            <Input
                                                value={selectedStudent.registrationNo || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, registrationNo: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Roll No</Label>
                                            <Input
                                                value={selectedStudent.rollNo || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, rollNo: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>First Name</Label>
                                            <Input
                                                value={selectedStudent.firstName || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, firstName: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Last Name</Label>
                                            <Input
                                                value={selectedStudent.lastName || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, lastName: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Email</Label>
                                            <Input value={selectedStudent.user?.email || ""} disabled />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Father&apos;s Name</Label>
                                            <Input
                                                value={selectedStudent.fatherName || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, fatherName: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Mother&apos;s Name</Label>
                                            <Input
                                                value={selectedStudent.motherName || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, motherName: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Date of Birth</Label>
                                            <Input
                                                type="date"
                                                value={selectedStudent.dateOfBirth ? selectedStudent.dateOfBirth.slice(0, 10) : ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, dateOfBirth: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Gender</Label>
                                            <Select
                                                value={selectedStudent.gender || ""}
                                                onValueChange={(v) => setSelectedStudent({ ...selectedStudent, gender: v })}
                                                disabled={detailsMode === "view"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Phone</Label>
                                            <Input
                                                value={selectedStudent.phone || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, phone: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>City</Label>
                                            <Input
                                                value={selectedStudent.city || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, city: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>State</Label>
                                            <Input
                                                value={selectedStudent.state || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, state: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Pincode</Label>
                                            <Input
                                                value={selectedStudent.pincode || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, pincode: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label required>Address</Label>
                                            <textarea
                                                value={selectedStudent.address || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, address: e.target.value })}
                                                disabled={detailsMode === "view"}
                                                rows={2}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100 dark:placeholder:text-slate-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Educational Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>10th Board</Label>
                                            <Input
                                                value={selectedStudent.tenthBoard || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, tenthBoard: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>10th Year</Label>
                                            <Input
                                                type="number"
                                                value={selectedStudent.tenthYear ?? ""}
                                                onChange={(e) =>
                                                    setSelectedStudent({
                                                        ...selectedStudent,
                                                        tenthYear: e.target.value ? Number(e.target.value) : ("" as unknown as number),
                                                    })
                                                }
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>10th Percentage</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={selectedStudent.tenthPercentage ?? ""}
                                                onChange={(e) =>
                                                    setSelectedStudent({
                                                        ...selectedStudent,
                                                        tenthPercentage: e.target.value ? Number(e.target.value) : ("" as unknown as number),
                                                    })
                                                }
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label required>12th Board</Label>
                                            <Input
                                                value={selectedStudent.twelfthBoard || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, twelfthBoard: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>12th Year</Label>
                                            <Input
                                                type="number"
                                                value={selectedStudent.twelfthYear ?? ""}
                                                onChange={(e) =>
                                                    setSelectedStudent({
                                                        ...selectedStudent,
                                                        twelfthYear: e.target.value ? Number(e.target.value) : ("" as unknown as number),
                                                    })
                                                }
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>12th Percentage</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={selectedStudent.twelfthPercentage ?? ""}
                                                onChange={(e) =>
                                                    setSelectedStudent({
                                                        ...selectedStudent,
                                                        twelfthPercentage: e.target.value ? Number(e.target.value) : ("" as unknown as number),
                                                    })
                                                }
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-3">
                                            <Label required>12th Stream</Label>
                                            <Input
                                                value={selectedStudent.twelfthStream || ""}
                                                onChange={(e) => setSelectedStudent({ ...selectedStudent, twelfthStream: e.target.value })}
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Academic Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>Course</Label>
                                            <Select
                                                value={selectedStudent.course?.id || ""}
                                                onValueChange={(v) => {
                                                    const c = courses.find((x) => x.id === v);
                                                    if (c) setSelectedStudent({ ...selectedStudent, course: { id: c.id, name: c.name, code: c.code } });
                                                }}
                                                disabled={detailsMode === "view"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select course" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {courses.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.name} ({c.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Session</Label>
                                            <Select
                                                value={selectedStudent.session?.id || ""}
                                                onValueChange={(v) => {
                                                    const s = sessions.find((x) => x.id === v);
                                                    if (s) setSelectedStudent({ ...selectedStudent, session: { id: s.id, name: s.name } });
                                                }}
                                                disabled={detailsMode === "view"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select session" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sessions.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>Current Semester</Label>
                                            <Input
                                                type="number"
                                                value={selectedStudent.currentSemester ?? ""}
                                                onChange={(e) =>
                                                    setSelectedStudent({
                                                        ...selectedStudent,
                                                        currentSemester: e.target.value ? Number(e.target.value) : ("" as unknown as number),
                                                    })
                                                }
                                                disabled={detailsMode === "view"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                    <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                                        Close
                                    </Button>
                                    {detailsMode === "edit" && (
                                        <Button onClick={submitEdit} isLoading={detailsSaving}>
                                            Save Changes
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete Student</DialogTitle>
                            <DialogDescription>
                                This will soft-delete the student record (kept in DB). You can reuse the email for a new registration later.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={doDelete} isLoading={deleting}>
                                Delete
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
