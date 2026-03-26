import prisma from "@/lib/prisma/client";
import type { PaymentInput } from "@/lib/validators/payment";

export class PaymentService {
    private static async nextReceiptNumber(tx: typeof prisma, paidAt: Date) {
        const year = paidAt.getFullYear();
        const counter = await (tx as any).receiptCounter.upsert({
            where: { year },
            create: { year, sequence: 1 },
            update: { sequence: { increment: 1 } },
            select: { sequence: true },
        });

        const seq = String(counter.sequence).padStart(4, "0");
        return `BRDP_${year}_${seq}`;
    }

    /**
     * Process a fee payment with full validation and ledger update.
     * Uses database transaction for consistency.
     */
    static async processPayment(data: PaymentInput, createdBy: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Fetch & lock the fee ledger entry
            const ledger = await tx.feeLedger.findUnique({
                where: { id: data.feeLedgerId },
                include: { student: true },
            });

            if (!ledger) throw new Error("Fee ledger entry not found");
            if (ledger.studentId !== data.studentId) {
                throw new Error("Student ID mismatch with fee ledger");
            }

            // 2. Validate payment amount
            const remainingAmount = ledger.totalAmount - ledger.paidAmount;

            if (remainingAmount <= 0) {
                throw new Error("This semester's fee is already fully paid");
            }

            if (data.amount <= 0) {
                throw new Error("Payment amount must be positive");
            }

            if (data.amount > remainingAmount) {
                throw new Error(
                    `Payment amount (₹${data.amount}) exceeds remaining balance (₹${remainingAmount}). Maximum allowed: ₹${remainingAmount}`
                );
            }

            // 3. Create payment record
            const receiptNumber = await PaymentService.nextReceiptNumber(tx as any, new Date());
            const payment = await tx.payment.create({
                data: {
                    studentId: data.studentId,
                    feeLedgerId: data.feeLedgerId,
                    amount: data.amount,
                    paymentMode: data.paymentMode,
                    transactionId: data.transactionId || null,
                    receiptNumber,
                    remarks: data.remarks || null,
                    createdBy,
                },
            });

            // 4. Update fee ledger
            const newPaidAmount = ledger.paidAmount + data.amount;
            const newStatus =
                newPaidAmount >= ledger.totalAmount
                    ? "PAID"
                    : newPaidAmount > 0
                        ? "PARTIAL"
                        : "PENDING";

            await tx.feeLedger.update({
                where: { id: data.feeLedgerId },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus,
                },
            });

            // 5. Audit log
            await tx.auditLog.create({
                data: {
                    userId: createdBy,
                    action: "PAYMENT",
                    module: "Payment",
                    details: `Payment of ₹${data.amount} received for ${ledger.student.firstName} ${ledger.student.lastName} (Sem ${ledger.semester}). Receipt: ${receiptNumber}`,
                },
            });

            return {
                payment,
                updatedLedger: {
                    id: ledger.id,
                    semester: ledger.semester,
                    totalAmount: ledger.totalAmount,
                    paidAmount: newPaidAmount,
                    remaining: ledger.totalAmount - newPaidAmount,
                    status: newStatus,
                },
            };
        });
    }

    /**
     * Get all payments with optional filters
     */
    static async getAll(params: {
        page?: number;
        limit?: number;
        studentId?: string;
        feeLedgerId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (params.studentId) where.studentId = params.studentId;
        if (params.feeLedgerId) where.feeLedgerId = params.feeLedgerId;

        if (params.startDate || params.endDate) {
            where.paidAt = {};
            if (params.startDate) (where.paidAt as Record<string, unknown>).gte = new Date(params.startDate);
            if (params.endDate) (where.paidAt as Record<string, unknown>).lte = new Date(params.endDate);
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                include: {
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            registrationNo: true,
                        },
                    },
                    feeLedger: {
                        select: {
                            semester: true,
                            totalAmount: true,
                            paidAmount: true,
                            status: true,
                        },
                    },
                },
                orderBy: { paidAt: "desc" },
            }),
            prisma.payment.count({ where }),
        ]);

        return {
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single payment by ID
     */
    static async getById(id: string) {
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                student: {
                    include: {
                        course: true,
                        session: true,
                    },
                },
                feeLedger: true,
            },
        });

        if (!payment) throw new Error("Payment not found");
        return payment;
    }

    /**
     * Get payment history for a student
     */
    static async getStudentPayments(studentId: string) {
        return prisma.payment.findMany({
            where: { studentId },
            include: {
                feeLedger: {
                    select: { semester: true, totalAmount: true, paidAmount: true, status: true },
                },
            },
            orderBy: { paidAt: "desc" },
        });
    }
}
