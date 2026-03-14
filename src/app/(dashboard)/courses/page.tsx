"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema, type CourseInput } from "@/lib/validators/academic";
import toast from "react-hot-toast";
import { Plus, BookOpen } from "lucide-react";

interface CourseData {
    id: string;
    name: string;
    code: string;
    description: string | null;
    duration: number;
    totalSemesters: number;
    isActive: boolean;
}

export default function CoursesPage() {
    const { hasPermission } = useAuth();
    const { apiFetch } = useApi();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
        resolver: zodResolver(courseSchema) as any,
    });

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{ success: boolean; data: CourseData[] }>("/api/courses");
            if (res.success) setCourses(res.data);
        } catch {
            toast.error("Failed to fetch courses");
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const onCreate = async (data: CourseInput) => {
        setSubmitting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>("/api/courses", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (res.success) {
                toast.success("Course created!");
                setShowCreate(false);
                reset();
                fetchCourses();
            } else {
                toast.error(res.message || "Failed");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                <PageHeader
                    title="Courses"
                    // description="Manage academic courses"
                    // icon={<BookOpen className="h-6 w-6 text-blue-800" />}
                    actions={
                        hasPermission("course:create") ? (
                            <Button onClick={() => setShowCreate(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Course
                            </Button>
                        ) : null
                    }
                />

                {loading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                        ))}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <Card key={course.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <Badge variant={course.isActive ? "success" : "danger"}>
                                            {course.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-3">{course.name}</CardTitle>
                                    <CardDescription className="font-mono text-xs">{course.code}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500">Duration</p>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{course.duration} Years</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500">Semesters</p>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{course.totalSemesters}</p>
                                        </div>
                                    </div>
                                    {course.description && (
                                        <p className="mt-3 text-xs text-slate-500 line-clamp-2">{course.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center py-12">
                            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500">No courses yet</p>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Course</DialogTitle>
                            <DialogDescription>Create a new academic course.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onCreate)} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label required>Course Name</Label>
                                    <Input {...register("name")} placeholder="Bachelor of Computer Applications" error={errors.name?.message as string} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required>Course Code</Label>
                                    <Input {...register("code")} placeholder="BCA" error={errors.code?.message as string} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required>Duration (Years)</Label>
                                    <Input {...register("duration")} type="number" error={errors.duration?.message as string} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required>Total Semesters</Label>
                                    <Input {...register("totalSemesters")} type="number" error={errors.totalSemesters?.message as string} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Input {...register("description")} placeholder="Optional description" />
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting}>Create Course</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
