import prisma from "@/lib/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { generateReceiptNumber } from "@/lib/utils";
import type { StudentRegistrationInput } from "@/lib/validators/student";

export class StudentService {
    static async register(data: StudentRegistrationInput, createdBy: string) {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) throw new Error("Email already registered");

        const existingRegistrationNo = await prisma.student.findUnique({
            where: { registrationNo: data.registrationNo },
            select: { id: true },
        });
        if (existingRegistrationNo) throw new Error("Registration number already exists");

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

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create user
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    name: `${data.firstName} ${data.lastName}`,
                    role: "STUDENT",
                },
            });

            // 2. Create student record
            const student = await tx.student.create({
                data: {
                    userId: user.id,
                    courseId: data.courseId,
                    sessionId: data.sessionId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    fatherName: data.fatherName,
                    motherName: data.motherName,
                    dateOfBirth: new Date(data.dateOfBirth),
                    gender: data.gender,
                    phone: data.phone,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    tenthBoard: data.tenthBoard,
                    tenthYear: data.tenthYear,
                    tenthPercentage: data.tenthPercentage,
                    twelfthBoard: data.twelfthBoard,
                    twelfthYear: data.twelfthYear,
                    twelfthPercentage: data.twelfthPercentage,
                    twelfthStream: data.twelfthStream,
                    rollNo: data.rollNo,
                    registrationNo: data.registrationNo,
                },
            });

            // 3. Create fee ledger entries for all semesters
            const feeLedgerEntries = [];
            for (const fs of feeStructures) {
                const ledgerEntry = await tx.feeLedger.create({
                    data: {
                        studentId: student.id,
                        semester: fs.semester,
                        totalAmount: fs.totalAmount,
                        paidAmount: 0,
                        dueDate: fs.dueDate,
                        status: "PENDING",
                    },
                });
                feeLedgerEntries.push(ledgerEntry);
            }

            // 4. Apply initial payment to Semester 1 if provided
            let initialPaymentRecord = null;
            if (data.initialPayment && data.initialPayment > 0) {
                const sem1Ledger = feeLedgerEntries[0];
                if (!sem1Ledger) throw new Error("Semester 1 fee ledger not found");

                if (data.initialPayment > sem1Ledger.totalAmount) {
                    throw new Error("Initial payment exceeds Semester 1 total fee");
                }

                const receiptNumber = generateReceiptNumber();

                initialPaymentRecord = await tx.payment.create({
                    data: {
                        studentId: student.id,
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
            }

            // 5. Audit log
            await tx.auditLog.create({
                data: {
                    userId: createdBy,
                    action: "CREATE",
                    module: "Student",
                    details: `Registered student: ${data.firstName} ${data.lastName} (${data.registrationNo})`,
                },
            });

            return {
                student: {
                    ...student,
                    user: { id: user.id, email: user.email, name: user.name },
                },
                feeLedger: feeLedgerEntries,
                initialPayment: initialPaymentRecord,
            };
        });

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
                { firstName: { contains: params.search, mode: "insensitive" } },
                { lastName: { contains: params.search, mode: "insensitive" } },
                { registrationNo: { contains: params.search, mode: "insensitive" } },
                { phone: { contains: params.search } },
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
}
