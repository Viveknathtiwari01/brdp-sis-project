"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";

interface PaymentData {
    id: string;
    amount: number;
    paymentMode: string;
    receiptNumber: string;
    transactionId: string | null;
    paidAt: string;
    student: {
        firstName: string;
        lastName: string;
        registrationNo: string;
    };
    feeLedger: {
        semester: number;
        totalAmount: number;
        paidAmount: number;
        status: string;
    };
}

export default function PaymentsPage() {
    const { apiFetch } = useApi();
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{
                success: boolean;
                data: { payments: PaymentData[]; pagination: { totalPages: number } };
            }>(`/api/payments?page=${page}&limit=15`);
            if (res.success) {
                setPayments(res.data.payments);
                setTotalPages(res.data.pagination.totalPages);
            }
        } catch {
            toast.error("Failed to fetch payments");
        } finally {
            setLoading(false);
        }
    }, [apiFetch, page]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    return (
        <DashboardShell>
            <div className="space-y-6 animate-fade-in">
                <PageHeader
                    title="Payment History"
                    // description="All payment transactions and receipts"
                    // icon={<Receipt className="h-6 w-6 text-blue-800" />}
                />

                <Card className="shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Receipt No</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Student</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Semester</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Amount</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Mode</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Fee Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Date</th>
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
                                ) : payments.length > 0 ? (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                {payment.receiptNumber}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                                    {payment.student.firstName} {payment.student.lastName}
                                                </p>
                                                <p className="text-xs text-slate-500">{payment.student.registrationNo}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="default">Sem {payment.feeLedger.semester}</Badge>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={payment.paymentMode === "UPI" ? "default" : "outline"}>
                                                    {payment.paymentMode}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        payment.feeLedger.status === "PAID"
                                                            ? "success"
                                                            : payment.feeLedger.status === "PARTIAL"
                                                                ? "warning"
                                                                : "danger"
                                                    }
                                                >
                                                    {payment.feeLedger.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {formatDateTime(payment.paidAt)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                            <p className="text-sm text-slate-500">No payments recorded yet</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardShell>
    );
}
