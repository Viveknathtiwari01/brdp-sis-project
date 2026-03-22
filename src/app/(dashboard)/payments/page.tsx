"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Receipt, ChevronLeft, ChevronRight, Download } from "lucide-react";

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
    const { user, accessToken } = useAuth();
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const pageSize = 15;

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiFetch<{
                success: boolean;
                data: { payments: PaymentData[]; pagination: { totalPages: number } };
            }>(`/api/payments?page=${page}&limit=${pageSize}`);
            if (res.success) {
                setPayments(res.data.payments);
                setTotalPages(res.data.pagination.totalPages);
            }
        } catch {
            toast.error("Failed to fetch payments");
        } finally {
            setLoading(false);
        }
    }, [apiFetch, page, pageSize]);

    const canDownload = user?.role === "SYSTEM_ADMIN" || user?.role === "ADMIN";

    const handleDownload = async (paymentId: string) => {
        try {
            if (!accessToken) {
                toast.error("Session expired. Please login again.");
                return;
            }

            setDownloadingId(paymentId);
            const res = await fetch(`/api/payments/${paymentId}/receipt`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                credentials: "include",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message || "Failed to download receipt");
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition") || "";
            const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
            const rawName = fileNameMatch?.[1] || "receipt.pdf";
            const fileName = rawName.toLowerCase().endsWith(".pdf") ? rawName : `${rawName}.pdf`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to download receipt");
        } finally {
            setDownloadingId(null);
        }
    };

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
                        <table className="min-w-[980px] w-full text-sm">
                            <thead>
                                <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/70">
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">S. No.</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Student</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Semester</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Amount</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Mode</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Fee Status</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Date</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Download</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={9} className="px-4 py-3">
                                                <Skeleton className="h-8 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : payments.length > 0 ? (
                                    payments.map((payment, idx) => (
                                        <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {(page - 1) * pageSize + idx + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                    {payment.student.firstName} {payment.student.lastName}
                                                </p>
                                                <p className="text-xs text-slate-500 whitespace-nowrap">{payment.student.registrationNo}</p>
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
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800/40">
                                                    {formatDateTime(payment.paidAt)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {canDownload ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/40 dark:hover:bg-blue-900/30 dark:text-blue-200"
                                                        onClick={() => handleDownload(payment.id)}
                                                        isLoading={downloadingId === payment.id}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center">
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
