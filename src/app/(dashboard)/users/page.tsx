"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "@/lib/validators/auth";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Plus, Users, Shield, UserCheck, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { PERMISSION_MODULES } from "@/lib/constants/permissions";
import { SearchBox } from "@/components/shared/search-box";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

interface UserData {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    permissions: Array<{
        permission: { code: string; name: string; module: string };
    }>;
}

type UserDetails = UserData & {
    student?: { id: string } | null;
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const { apiFetch } = useApi();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");

    // Permission management
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [showPermissions, setShowPermissions] = useState(false);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsMode, setDetailsMode] = useState<"view" | "edit">("view");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsSaving, setDetailsSaving] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState<UserDetails | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{ success: boolean; data: UserData[] }>("/api/users");
            if (res.success) setUsers(res.data);
        } catch {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q);
    });

    const openDetails = async (id: string, mode: "view" | "edit") => {
        setSelectedId(id);
        setDetailsMode(mode);
        setDetailsOpen(true);
        setDetailsLoading(true);
        try {
            const res = await apiFetch<{ success: boolean; data: UserDetails; message?: string }>(`/api/users/${id}`);
            if (res.success) {
                setSelectedDetails(res.data);
            } else {
                toast.error(res.message || "Failed to load user");
                setDetailsOpen(false);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load user");
            setDetailsOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const submitEdit = async () => {
        if (!selectedId || !selectedDetails) return;
        setDetailsSaving(true);
        try {
            const payload = {
                name: selectedDetails.name,
                role: selectedDetails.role,
                isActive: selectedDetails.isActive,
            };
            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/users/${selectedId}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload),
                }
            );
            if (res.success) {
                toast.success("User updated successfully");
                setDetailsOpen(false);
                setSelectedDetails(null);
                setSelectedId(null);
                fetchUsers();
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
            const res = await apiFetch<{ success: boolean; message?: string }>(`/api/users/${selectedId}`,
                { method: "DELETE" }
            );
            if (res.success) {
                toast.success("User deleted successfully");
                setDeleteOpen(false);
                setSelectedId(null);
                fetchUsers();
            } else {
                toast.error(res.message || "Failed to delete");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const onCreate = async (data: CreateUserInput) => {
        setSubmitting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>("/api/users", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (res.success) {
                toast.success("User created!");
                setShowCreate(false);
                reset();
                fetchUsers();
            } else {
                toast.error(res.message || "Failed");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed");
        } finally {
            setSubmitting(false);
        }
    };

    const roleLabel: Record<string, string> = {
        SYSTEM_ADMIN: "System Admin",
        ADMIN: "Admin",
        STUDENT: "Student",
    };

    const roleColor: Record<string, "default" | "success" | "warning" | "danger" | "outline"> = {
        SYSTEM_ADMIN: "danger",
        ADMIN: "warning",
        STUDENT: "default",
    };

    const isSuperAdmin = currentUser?.email === "ashutoshvermabrdp@gmail.com";

    if (!isSuperAdmin) {
        return (
            <DashboardShell>
                <Card>
                    <CardContent className="flex flex-col items-center py-16">
                        <Shield className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500 text-center">
                            Access restricted to the primary System Administrator<br />
                            <span className="text-xs opacity-75">(ashutoshvermabrdp@gmail.com)</span>
                        </p>
                    </CardContent>
                </Card>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                <PageHeader
                    title="User Management"
                    // description="Create admins and manage permissions"
                    // icon={<Users className="h-6 w-6 text-blue-800" />}
                    actions={
                        <Button onClick={() => setShowCreate(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create User
                        </Button>
                    }
                />

                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email, or role..." />
                    </CardContent>
                </Card>

                <Card className="shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full text-sm">
                            <thead>
                                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">User</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Role</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Permissions</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Last Login</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={6} className="px-4 py-3">
                                                <Skeleton className="h-8 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[260px]">{u.name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[260px]">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={roleColor[u.role]}>{roleLabel[u.role]}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {u.role === "SYSTEM_ADMIN"
                                                ? "All"
                                                : u.permissions.length > 0
                                                    ? `${u.permissions.length} granted`
                                                    : "None"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={u.isActive ? "success" : "danger"}>
                                                {u.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {u.role === "ADMIN" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setSelectedPerms(u.permissions.map((p) => p.permission.code));
                                                            setShowPermissions(true);
                                                        }}
                                                    >
                                                        <Shield className="h-4 w-4 mr-1" />
                                                        Permissions
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-lg"
                                                            aria-label="User actions"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openDetails(u.id, "view")}>
                                                            <Eye className="h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                        {u.role !== "SYSTEM_ADMIN" && (
                                                            <DropdownMenuItem onClick={() => openDetails(u.id, "edit")}>
                                                                <Pencil className="h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {u.role !== "SYSTEM_ADMIN" && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                                                                    onClick={() => confirmDelete(u.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* View / Edit User */}
                <Dialog
                    open={detailsOpen}
                    onOpenChange={(open) => {
                        setDetailsOpen(open);
                        if (!open) {
                            setSelectedDetails(null);
                            setSelectedId(null);
                            setDetailsMode("view");
                        }
                    }}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{detailsMode === "view" ? "View User" : "Edit User"}</DialogTitle>
                            <DialogDescription>
                                {detailsMode === "view" ? "User details (read-only)." : "Update user details. Email cannot be changed."}
                            </DialogDescription>
                        </DialogHeader>

                        {detailsLoading || !selectedDetails ? (
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label required>Full Name</Label>
                                        <Input
                                            value={selectedDetails.name || ""}
                                            onChange={(e) => setSelectedDetails({ ...selectedDetails, name: e.target.value })}
                                            disabled={detailsMode === "view"}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Email</Label>
                                        <Input value={selectedDetails.email || ""} disabled />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Role</Label>
                                        <Select
                                            value={selectedDetails.role}
                                            onValueChange={(v) => setSelectedDetails({ ...selectedDetails, role: v })}
                                            disabled={detailsMode === "view" || selectedDetails.role === "SYSTEM_ADMIN"}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                <SelectItem value="STUDENT">Student</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required>Status</Label>
                                        <Select
                                            value={selectedDetails.isActive ? "ACTIVE" : "INACTIVE"}
                                            onValueChange={(v) => setSelectedDetails({ ...selectedDetails, isActive: v === "ACTIVE" })}
                                            disabled={detailsMode === "view" || selectedDetails.role === "SYSTEM_ADMIN"}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Last Login</Label>
                                        <Input value={selectedDetails.lastLoginAt ? formatDate(selectedDetails.lastLoginAt) : "Never"} disabled />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Created</Label>
                                        <Input value={formatDate(selectedDetails.createdAt)} disabled />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                    <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                                        Close
                                    </Button>
                                    {detailsMode === "edit" && selectedDetails.role !== "SYSTEM_ADMIN" && (
                                        <Button onClick={submitEdit} isLoading={detailsSaving}>
                                            Save Changes
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <ConfirmDeleteDialog
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                    title="Delete User"
                    description="This will soft-delete the user (kept in DB)."
                    confirming={deleting}
                    onConfirm={doDelete}
                />

                {/* Create User Dialog */}
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create User</DialogTitle>
                            {/* <DialogDescription>Create a new Admin or Student account.</DialogDescription> */}
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onCreate)} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label required>Full Name</Label>
                                <Input {...register("name")} error={errors.name?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Label required>Email</Label>
                                <Input {...register("email")} type="email" error={errors.email?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Label required>Password</Label>
                                <Input {...register("password")} type="password" error={errors.password?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Label required>Role</Label>
                                <Select onValueChange={(v) => setValue("role", v as "ADMIN" | "STUDENT")}>
                                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Sub-Admin</SelectItem>
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting}>Create User</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Permissions Dialog */}
                <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Manage Permissions — {selectedUser?.name}</DialogTitle>
                            <DialogDescription>
                                Select the permissions to grant to this administrator.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {PERMISSION_MODULES.map((module) => (
                                <div key={module.module} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                                    <h4 className="text-sm font-semibold mb-2">{module.module}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {module.permissions.map((perm) => (
                                            <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPerms.includes(perm)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPerms([...selectedPerms, perm]);
                                                        } else {
                                                            setSelectedPerms(selectedPerms.filter((p) => p !== perm));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {perm.split(":")[1]}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
                                <Button onClick={async () => {
                                    if (!selectedUser) return;
                                    try {
                                        const res = await apiFetch<{ success: boolean; message?: string }>(`/api/users/${selectedUser.id}/permissions`, {
                                            method: "PUT",
                                            body: JSON.stringify({ permissions: selectedPerms }),
                                        });
                                        if (res.success) {
                                            toast.success("Permissions updated successfully");
                                            setShowPermissions(false);
                                            fetchUsers();
                                        } else {
                                            toast.error(res.message || "Failed to update permissions");
                                        }
                                    } catch (error) {
                                        toast.error(error instanceof Error ? error.message : "Failed to update permissions");
                                    }
                                }}>
                                    <UserCheck className="mr-1 h-4 w-4" />
                                    Save Permissions
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
