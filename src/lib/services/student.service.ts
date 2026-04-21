import { hashPassword } from "@/lib/auth/password";
import type { StudentRegistrationInput } from "@/lib/validators/student";
import prisma from "@/lib/prisma/client";

export class StudentService {
    private static async nextReceiptNumber(tx: any, paidAt: Date) {
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

    static async register(data: StudentRegistrationInput, createdBy: string) {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) throw new Error("Email already registered");

        // Get course & session info
        const course = await prisma.course.findUnique({
            where: { id: data.courseId },
        });
        if (!course) throw new Error("Course not found");

        const session = await prisma.session.findUnique({
            where: { id: data.sessionId },
        });
        if (!session) throw new Error("Session not found");

        // Get fee structures for this course+session
        const feeStructures = await prisma.courseFeeStructure.findMany({
            where: { courseId: data.courseId, sessionId: data.sessionId },
            orderBy: { semester: "asc" },
        });

        if (feeStructures.length === 0) {
            throw new Error("No fee structure defined for this course and session. Please configure it in 'Fee Structure' settings first.");
        }

        const hashedPassword = await hashPassword(data.password);

        // Use transaction for critical operations only
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create user
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    name: data.fullName,
                    role: "STUDENT",
                },
            });

            // 2. Create student record
            const student = await tx.student.create({
                data: {
                    userId: user.id,
                    courseId: data.courseId,
                    sessionId: data.sessionId,
                    currentSemester: data.currentSemester,
                    fullName: data.fullName,
                    fatherName: data.fatherName,
                    address: data.address,
                    rollNo: data.rollNo,
                    collegeCode: data.collegeCode,
                },
            });

            // 5. Audit log
            await tx.auditLog.create({
                data: {
                    userId: createdBy,
                    action: "CREATE",
                    module: "Student",
                    details: `Registered student: ${data.fullName} (${data.rollNo})`,
                },
            });

            return {
                student: {
                    ...student,
                    user: { id: user.id, email: user.email, name: user.name },
                },
            };
        });

        // 3. Create fee ledger entries outside transaction (faster)
        const feeLedgerEntries = await Promise.all(
            feeStructures.map(fs =>
                prisma.feeLedger.create({
                    data: {
                        studentId: result.student.id,
                        semester: fs.semester,
                        totalAmount: fs.totalAmount,
                        paidAmount: 0,
                        dueDate: fs.dueDate,
                        status: "PENDING",
                    },
                })
            )
        );

        // 4. Apply initial payment to Semester 1 if provided
        let initialPaymentRecord = null;
        if (data.initialPayment && data.initialPayment > 0) {
            const sem1Ledger = feeLedgerEntries[0];
            if (!sem1Ledger) throw new Error("Semester 1 fee ledger not found");

            if (data.initialPayment > sem1Ledger.totalAmount) {
                throw new Error("Initial payment exceeds Semester 1 total fee");
            }

            const receiptNumber = await StudentService.nextReceiptNumber(prisma, new Date());

            initialPaymentRecord = await prisma.$transaction(async (tx) => {
                // Create payment
                const payment = await tx.payment.create({
                    data: {
                        studentId: result.student.id,
                        feeLedgerId: sem1Ledger.id,
                        amount: data.initialPayment,
                        paymentMode: data.paymentMode || "CASH",
                        transactionId: data.transactionId || null,
                        receiptNumber,
                        createdBy,
                    },
                });

                // Update ledger
                const newPaidAmount = data.initialPayment;
                const newStatus =
                    newPaidAmount >= sem1Ledger.totalAmount ? "PAID" : "PARTIAL";

                await tx.feeLedger.update({
                    where: { id: sem1Ledger.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                    },
                });

                return payment;
            });
        }

        return {
            student: result.student,
            feeLedger: feeLedgerEntries,
            initialPayment: initialPaymentRecord,
        };

        return result;
    }

    static async getAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        courseId?: string;
        sessionId?: string;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {
            isDeleted: false,
        };

        if (params.courseId) where.courseId = params.courseId;
        if (params.sessionId) where.sessionId = params.sessionId;

        if (params.search) {
            where.OR = [
                { fullName: { contains: params.search, mode: "insensitive" } },
                { rollNo: { contains: params.search, mode: "insensitive" } },
            ];
        }

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, email: true, name: true, isActive: true } },
                    course: { select: { id: true, name: true, code: true } },
                    session: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.student.count({ where }),
        ]);

        return {
            students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    static async getById(id: string) {
        const student = await prisma.student.findUnique({
            where: { id, isDeleted: false },
            include: {
                user: { select: { id: true, email: true, name: true, isActive: true } },
                course: true,
                session: true,
                feeLedger: {
                    orderBy: { semester: "asc" },
                    include: {
                        payments: { orderBy: { paidAt: "desc" } },
                    },
                },
            },
        });

        if (!student) throw new Error("Student not found");
        return student;
    }

    static async getByUserId(userId: string) {
        const student = await prisma.student.findUnique({
            where: { userId, isDeleted: false },
            include: {
                user: { select: { id: true, email: true, name: true, isActive: true } },
                course: true,
                session: true,
                feeLedger: {
                    orderBy: { semester: "asc" },
                    include: {
                        payments: { orderBy: { paidAt: "desc" } },
                    },
                },
            },
        });

        if (!student) throw new Error("Student not found");
        return student;
    }

    static async update(
        id: string,
        data: Partial<Omit<StudentRegistrationInput, "email" | "password">>,
        updatedBy: string
    ) {
        const existing = await prisma.student.findUnique({
            where: { id, isDeleted: false },
            include: { user: { select: { id: true, email: true } } },
        });

        if (!existing) throw new Error("Student not found");

        const updateData: Record<string, unknown> = { ...data };

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.update({
                where: { id },
                data: updateData,
                include: {
                    user: { select: { id: true, email: true, name: true, isActive: true } },
                    course: { select: { id: true, name: true, code: true } },
                    session: { select: { id: true, name: true } },
                },
            });

            if (data.fullName) {
                await tx.user.update({
                    where: { id: student.userId },
                    data: { name: data.fullName },
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: updatedBy,
                    action: "UPDATE",
                    module: "Student",
                    details: `Updated student: ${student.fullName} (${student.rollNo})`,
                },
            });

            return student;
        });

        return result;
    }

    static async softDelete(id: string, deletedBy: string) {
        const existing = await prisma.student.findUnique({
            where: { id, isDeleted: false },
            select: { id: true, userId: true, rollNo: true },
        });
        if (!existing) throw new Error("Student not found");

        await prisma.$transaction(async (tx) => {
            await tx.student.update({ where: { id }, data: { isDeleted: true } });
            await tx.user.update({ where: { id: existing.userId }, data: { isDeleted: true, isActive: false } });

            await tx.auditLog.create({
                data: {
                    userId: deletedBy,
                    action: "DELETE",
                    module: "Student",
                    details: `Soft-deleted student ID: ${id} (${existing.rollNo})`,
                },
            });
        });
    }
}
