"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionSchema, type SessionInput } from "@/lib/validators/academic";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Plus, Calendar } from "lucide-react";

interface SessionData {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export default function SessionsPage() {
    const { hasPermission } = useAuth();
    const { apiFetch } = useApi();
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
        resolver: zodResolver(sessionSchema) as any,
    });

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{ success: boolean; data: SessionData[] }>("/api/sessions");
            if (res.success) setSessions(res.data);
        } catch {
            toast.error("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const onCreate = async (data: SessionInput) => {
        setSubmitting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>("/api/sessions", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (res.success) {
                toast.success("Session created!");
                setShowCreate(false);
                reset();
                fetchSessions();
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sessions</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage academic sessions</p>
                    </div>
                    {hasPermission("session:create") && (
                        <Button onClick={() => setShowCreate(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Session
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                        ))}
                    </div>
                ) : sessions.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((session) => (
                            <Card key={session.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <Badge variant={session.isActive ? "success" : "danger"}>
                                            {session.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-3">{session.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500">Start</p>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(session.startDate)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500">End</p>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(session.endDate)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center py-12">
                            <Calendar className="h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500">No sessions yet</p>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Session</DialogTitle>
                            <DialogDescription>Create a new academic session.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
                            <div className="space-y-1">
                                <Label required>Session Name</Label>
                                <Input {...register("name")} placeholder="2024-2025" error={errors.name?.message as string} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label required>Start Date</Label>
                                    <Input {...register("startDate")} type="date" error={errors.startDate?.message as string} />
                                </div>
                                <div className="space-y-1">
                                    <Label required>End Date</Label>
                                    <Input {...register("endDate")} type="date" error={errors.endDate?.message as string} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting}>Create Session</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
