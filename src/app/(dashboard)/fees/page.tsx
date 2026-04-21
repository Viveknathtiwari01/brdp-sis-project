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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import {
    IndianRupee,
    Search,
    Plus,
    AlertCircle,
    CheckCircle2,
    Clock,
} from "lucide-react";

interface LedgerEntry {
    id: string;
    semester: number;
    totalAmount: number;
    paidAmount: number;
    dueDate: string;
    status: "PENDING" | "PARTIAL" | "PAID";
    student: {
        fullName: string;
        rollNo: string;
        course: { name: string; code: string };
        session: { name: string };
    };
    payments: Array<{
        id: string;
        amount: number;
        paymentMode: string;
        receiptNumber: string;
        paidAt: string;
    }>;
}

interface StudentOption {
    id: string;
    fullName: string;
    rollNo: string;
}

export default function FeesPage() {
    const { hasPermission, user, accessToken } = useAuth();
    const { apiFetch } = useApi();
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [students, setStudents] = useState<StudentOption[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Payment dialog
    const [showPayment, setShowPayment] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<LedgerEntry | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI">("CASH");
    const [transactionId, setTransactionId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (user?.role === "STUDENT") return;
        try {
            const res = await apiFetch<{
                success: boolean;
                data: { students: StudentOption[] };
            }>("/api/students?limit=100");
            if (res.success) setStudents(res.data.students);
        } catch {
            // silent
        }
    }, [apiFetch, user]);

    const fetchLedger = useCallback(async (studentId: string) => {
        if (!studentId) return;
        try {
            setLoading(true);
            const res = await apiFetch<{ success: boolean; data: LedgerEntry[] }>(
                `/api/fee-ledger?studentId=${studentId}`
            );
            if (res.success) setLedger(res.data);
        } catch {
            toast.error("Failed to fetch fee ledger");
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    useEffect(() => {
        if (selectedStudentId) {
            fetchLedger(selectedStudentId);
        }
    }, [selectedStudentId, fetchLedger]);

    // For student role, auto-load their ledger
    useEffect(() => {
        if (user?.role === "STUDENT") {
            // The API endpoint auto-scopes to current student
            const fetchMyLedger = async () => {
                try {
                    setLoading(true);
                    const res = await apiFetch<{ success: boolean; data: LedgerEntry[] }>(
                        "/api/fee-ledger"
                    );
                    if (res.success) setLedger(res.data);
                } catch {
                    toast.error("Failed to fetch your fee details");
                } finally {
                    setLoading(false);
                }
            };
            fetchMyLedger();
        }
    }, [user, apiFetch]);

    const downloadReceipt = async (paymentId: string) => {
        try {
            const res = await fetch(`/api/payments/${paymentId}/receipt`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!res.ok) throw new Error("Failed to fetch receipt");
            
            const contentDisposition = res.headers.get("content-disposition") || "";
            const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
            const fileName = fileNameMatch?.[1] || `receipt_${paymentId}.pdf`;

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Auto-save (Download)
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // Open print dialog reliably using an iframe
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = url;
            document.body.appendChild(iframe);
            
            // Give the PDF a moment to load in the iframe before printing
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    // Optional: remove iframe after printing
                    // setTimeout(() => iframe.remove(), 1000);
                }, 500);
            };
        } catch {
            toast.error("Failed to auto-download receipt. You can download it manually from the history.");
        }
    };

    const openPaymentDialog = (entry: LedgerEntry) => {
        setSelectedLedger(entry);
        setPaymentAmount("");
        setPaymentMode("CASH");
        setTransactionId("");
        setShowPayment(true);
    };

    const processPayment = async () => {
        if (!selectedLedger) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch<{ success: boolean; message?: string }>("/api/payments", {
                method: "POST",
                body: JSON.stringify({
                    studentId: selectedLedger.student ? (ledger[0] as unknown as { studentId: string }).studentId || selectedStudentId : selectedStudentId,
                    feeLedgerId: selectedLedger.id,
                    amount,
                    paymentMode,
                    transactionId: paymentMode === "UPI" ? transactionId : undefined,
                }),
            });

            if (res.success) {
                toast.success("Payment processed successfully!");
                setShowPayment(false);
                
                // Trigger auto-download and print if we have the payment ID
                const paymentRes = await apiFetch<{ success: boolean; data: any }>(`/api/fee-ledger?studentId=${selectedStudentId}`);
                if (paymentRes.success) {
                    const latestPayment = paymentRes.data
                        .flatMap((l: any) => l.payments)
                        .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
                    
                    if (latestPayment) {
                        downloadReceipt(latestPayment.id);
                    }
                }

                if (selectedStudentId) fetchLedger(selectedStudentId);
            } else {
                toast.error(res.message || "Payment failed");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment failed");
        } finally {
            setSubmitting(false);
        }
    };

    const statusConfig = {
        PENDING: { icon: Clock, color: "warning", label: "Pending" },
        PARTIAL: { icon: AlertCircle, color: "default", label: "Partial" },
        PAID: { icon: CheckCircle2, color: "success", label: "Paid" },
    } as const;

    const filteredStudents = students.filter(
        (s) =>
            s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                <PageHeader
                    title="Fee Management"
                    // description="View & manage semester-wise fee ledger and payments"
                    // icon={<IndianRupee className="h-6 w-6 text-blue-800" />}
                />

                {/* Student Selector (Admin/System Admin) */}
                {user?.role !== "STUDENT" && (
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Label className="mb-1 block text-xs">Select Student</Label>
                                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a student to view fees" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2">
                                                <Input
                                                    placeholder="Search..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            {filteredStudents.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.fullName} ({s.rollNo})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Fee Ledger */}
                {loading && selectedStudentId ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full" />
                        ))}
                    </div>
                ) : ledger.length > 0 ? (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                                <CardContent className="p-5">
                                    <p className="text-xs font-medium opacity-80">Total Fee</p>
                                    <p className="mt-1 text-2xl font-bold">
                                        {formatCurrency(ledger.reduce((sum, l) => sum + l.totalAmount, 0))}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                                <CardContent className="p-5">
                                    <p className="text-xs font-medium opacity-80">Total Paid</p>
                                    <p className="mt-1 text-2xl font-bold">
                                        {formatCurrency(ledger.reduce((sum, l) => sum + l.paidAmount, 0))}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                                <CardContent className="p-5">
                                    <p className="text-xs font-medium opacity-80">Total Due</p>
                                    <p className="mt-1 text-2xl font-bold">
                                        {formatCurrency(
                                            ledger.reduce((sum, l) => sum + (l.totalAmount - l.paidAmount), 0)
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Semester Ledger Cards */}
                        {ledger.map((entry) => {
                            const remaining = entry.totalAmount - entry.paidAmount;
                            const progress = (entry.paidAmount / entry.totalAmount) * 100;
                            const statusInfo = statusConfig[entry.status];
                            const StatusIcon = statusInfo.icon;

                            return (
                                <Card key={entry.id} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                                                        Semester {entry.semester}
                                                    </h3>
                                                    <Badge variant={statusInfo.color}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                        <span>Paid: {formatCurrency(entry.paidAmount)}</span>
                                                        <span>Total: {formatCurrency(entry.totalAmount)}</span>
                                                    </div>
                                                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-500 ${entry.status === "PAID"
                                                                    ? "bg-emerald-500"
                                                                    : entry.status === "PARTIAL"
                                                                        ? "bg-amber-500"
                                                                        : "bg-slate-300"
                                                                }`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <span>Due: {formatDate(entry.dueDate)}</span>
                                                    {remaining > 0 && (
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                                            Remaining: {formatCurrency(remaining)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Payment History */}
                                                {entry.payments.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        <p className="text-xs font-medium text-slate-500">Payment History:</p>
                                                        {entry.payments.map((p) => (
                                                            <div
                                                                key={p.id}
                                                                className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800/50"
                                                            >
                                                                <span className="text-slate-600 dark:text-slate-400">
                                                                    {p.receiptNumber} • {p.paymentMode}
                                                                </span>
                                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(p.amount)}
                                                                </span>
                                                                <span className="text-slate-400">{formatDate(p.paidAt)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Pay Button */}
                                            {remaining > 0 && hasPermission("payment:create") && (
                                                <Button
                                                    size="sm"
                                                    className="ml-4 shrink-0"
                                                    onClick={() => openPaymentDialog(entry)}
                                                >
                                                    <IndianRupee className="mr-1 h-3 w-3" />
                                                    Pay
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : !selectedStudentId && user?.role !== "STUDENT" ? (
                    <Card>
                        <CardContent className="flex flex-col items-center py-16">
                            <Search className="h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500">Select a student to view their fee ledger</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center py-16">
                            <IndianRupee className="h-10 w-10 text-slate-300 mb-3" />
                            <p className="text-sm text-slate-500">No fee records found</p>
                        </CardContent>
                    </Card>
                )}

                {/* Payment Dialog */}
                <Dialog open={showPayment} onOpenChange={setShowPayment}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Payment</DialogTitle>
                            <DialogDescription>
                                Semester {selectedLedger?.semester} — Remaining:{" "}
                                {selectedLedger
                                    ? formatCurrency(selectedLedger.totalAmount - selectedLedger.paidAmount)
                                    : ""}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label required>Amount (₹)</Label>
                                    <Input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="Enter payment amount"
                                        max={selectedLedger ? selectedLedger.totalAmount - selectedLedger.paidAmount : undefined}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required>Payment Mode</Label>
                                    <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "CASH" | "UPI")}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASH">Cash</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {paymentMode === "UPI" && (
                                <div className="space-y-1.5">
                                    <Label>Transaction ID</Label>
                                    <Input
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="UPI Transaction Reference"
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                                <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
                                <Button onClick={processPayment} isLoading={submitting}>
                                    Process Payment
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}
