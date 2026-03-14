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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionSchema, type SessionInput } from "@/lib/validators/academic";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Plus, Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SearchBox } from "@/components/shared/search-box";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

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
    const [search, setSearch] = useState("");

    const [editOpen, setEditOpen] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const canEdit = hasPermission("session:edit");
    const canDelete = hasPermission("session:delete");
    const canUseActions = canEdit || canDelete;

    const filteredSessions = sessions.filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return s.name.toLowerCase().includes(q);
    });

    const openEdit = (session: SessionData) => {
        setSelectedSession({ ...session });
        setEditOpen(true);
    };

    const saveEdit = async () => {
        if (!selectedSession) return;
        setEditSaving(true);
        try {
            const payload = {
                name: selectedSession.name,
                startDate: selectedSession.startDate,
                endDate: selectedSession.endDate,
            };
            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/sessions/${selectedSession.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload),
                }
            );
            if (res.success) {
                toast.success("Session updated successfully");
                setEditOpen(false);
                setSelectedSession(null);
                fetchSessions();
            } else {
                toast.error(res.message || "Failed to update");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update");
        } finally {
            setEditSaving(false);
        }
    };

    const confirmDelete = (session: SessionData) => {
        setSelectedSession(session);
        setDeleteOpen(true);
    };

    const doDelete = async () => {
        if (!selectedSession) return;
        setDeleting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/sessions/${selectedSession.id}`,
                { method: "DELETE" }
            );
            if (res.success) {
                toast.success("Session deleted successfully");
                setDeleteOpen(false);
                setSelectedSession(null);
                fetchSessions();
            } else {
                toast.error(res.message || "Failed to delete");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

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
                <PageHeader
                    title="Sessions"
                    // description="Manage academic sessions"
                    // icon={<Calendar className="h-6 w-6 text-blue-800" />}
                    actions={
                        hasPermission("session:create") ? (
                            <Button onClick={() => setShowCreate(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Session
                            </Button>
                        ) : null
                    }
                />

                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <SearchBox
                            value={search}
                            onChange={setSearch}
                            placeholder="Search by session name..."
                        />
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                        ))}
                    </div>
                ) : filteredSessions.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredSessions.map((session) => (
                            <Card key={session.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={session.isActive ? "success" : "danger"}>
                                                {session.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                            {canUseActions && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-lg"
                                                            aria-label="Session actions"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {canEdit && (
                                                            <DropdownMenuItem onClick={() => openEdit(session)}>
                                                                <Pencil className="h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDelete && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                                                                    onClick={() => confirmDelete(session)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
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
                        <form onSubmit={handleSubmit(onCreate)} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label required>Session Name</Label>
                                <Input {...register("name")} placeholder="2024-2025" error={errors.name?.message as string} />
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label required>Start Date</Label>
                                    <Input {...register("startDate")} type="date" error={errors.startDate?.message as string} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required>End Date</Label>
                                    <Input {...register("endDate")} type="date" error={errors.endDate?.message as string} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting}>Create Session</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Session */}
                <Dialog
                    open={editOpen}
                    onOpenChange={(open) => {
                        setEditOpen(open);
                        if (!open) setSelectedSession(null);
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Session</DialogTitle>
                            <DialogDescription>Update session details.</DialogDescription>
                        </DialogHeader>
                        {selectedSession && (
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label required>Session Name</Label>
                                    <Input
                                        value={selectedSession.name}
                                        onChange={(e) => setSelectedSession({ ...selectedSession, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label required>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={selectedSession.startDate ? selectedSession.startDate.slice(0, 10) : ""}
                                            onChange={(e) => setSelectedSession({ ...selectedSession, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>End Date</Label>
                                        <Input
                                            type="date"
                                            value={selectedSession.endDate ? selectedSession.endDate.slice(0, 10) : ""}
                                            onChange={(e) => setSelectedSession({ ...selectedSession, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                    <Button variant="outline" onClick={() => setEditOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={saveEdit} isLoading={editSaving}>
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <ConfirmDeleteDialog
                    open={deleteOpen}
                    onOpenChange={(open) => {
                        setDeleteOpen(open);
                        if (!open) setSelectedSession(null);
                    }}
                    title="Delete Session"
                    description="This will soft-delete the session (kept in DB)."
                    confirming={deleting}
                    onConfirm={doDelete}
                />
            </div>
        </DashboardShell>
    );
}
