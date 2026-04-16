import { NextRequest } from "next/server";
import prisma from "@/lib/prisma/client";
import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";

function toNumber(v: unknown): number {
    return typeof v === "number" ? v : 0;
}

function sumRemainingForLedgers(ledgers: Array<{ totalAmount: number; paidAmount: number }>): number {
    return ledgers.reduce((sum, l) => sum + Math.max(0, toNumber(l.totalAmount) - toNumber(l.paidAmount)), 0);
}

function addToBucket(
    bucket: { collected: number; pending: number; overdue: number; recordCount: number },
    params: { paidAmount: number; totalAmount: number; dueDate: Date; status: string; now: Date }
) {
    const paid = toNumber(params.paidAmount);
    const total = toNumber(params.totalAmount);
    const pending = Math.max(0, total - paid);

    bucket.collected += paid;
    bucket.pending += pending;
    if (params.status !== "PAID" && params.dueDate < params.now) bucket.overdue += pending;
    bucket.recordCount += 1;
}

function computeStudentSummary(params: {
    now: Date;
    ledgers: Array<{ totalAmount: number; paidAmount: number; dueDate: Date }>;
}) {
    const { now, ledgers } = params;

    const totalAmount = ledgers.reduce((sum, l) => sum + toNumber(l.totalAmount), 0);
    const paidAmount = ledgers.reduce((sum, l) => sum + toNumber(l.paidAmount), 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);

    const dueLedgers = ledgers
        .map((l) => ({
            ...l,
            remaining: Math.max(0, toNumber(l.totalAmount) - toNumber(l.paidAmount)),
        }))
        .filter((l) => l.remaining > 0 && l.dueDate <= now);

    const dueAmount = dueLedgers.reduce((sum, l) => sum + l.remaining, 0);
    const dueDate =
        dueLedgers.length > 0
            ? new Date(Math.max(...dueLedgers.map((l) => l.dueDate.getTime())))
            : null;

    const status: "PENDING" | "PAID" | "OVERDUE" =
        pendingAmount <= 0 ? "PAID" : dueAmount > 0 ? "OVERDUE" : "PENDING";

    return {
        totalAmount,
        paidAmount,
        pendingAmount,
        dueAmount,
        dueDate,
        status,
    };
}

export const GET = withPermission("dashboard:view")(async (_req: NextRequest, user) => {
    try {
        const now = new Date();

        if (user.role === "STUDENT") {
            const student = await prisma.student.findUnique({
                where: { userId: user.userId, isDeleted: false },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    registrationNo: true,
                    course: { select: { name: true, code: true } },
                    session: { select: { name: true } },
                },
            });

            if (!student) return apiError("Student record not found", 404);

            const [myLedgers, myPayments] = await Promise.all([
                prisma.feeLedger.findMany({
                    where: { studentId: student.id },
                    select: {
                        id: true,
                        semester: true,
                        totalAmount: true,
                        paidAmount: true,
                        dueDate: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { semester: "asc" },
                }),
                prisma.payment.findMany({
                    where: { studentId: student.id },
                    select: {
                        id: true,
                        amount: true,
                        paidAt: true,
                        receiptNumber: true,
                        paymentMode: true,
                        feeLedger: { select: { semester: true } },
                    },
                    orderBy: { paidAt: "desc" },
                    take: 5,
                }),
            ]);

            const paymentModeTotals = myPayments.reduce(
                (acc, p) => {
                    if (p.paymentMode === "UPI") acc.UPI += toNumber(p.amount);
                    else acc.CASH += toNumber(p.amount);
                    return acc;
                },
                { CASH: 0, UPI: 0 }
            );

            const myCollected = myPayments.reduce((sum, p) => sum + toNumber(p.amount), 0);
            const myPending = sumRemainingForLedgers(myLedgers);
            const myOverdue = myLedgers
                .filter((l) => l.status !== "PAID" && new Date(l.dueDate) < now)
                .reduce((sum, l) => sum + Math.max(0, toNumber(l.totalAmount) - toNumber(l.paidAmount)), 0);

            const mySummary = computeStudentSummary({
                now,
                ledgers: myLedgers.map((l) => ({
                    totalAmount: l.totalAmount,
                    paidAmount: l.paidAmount,
                    dueDate: new Date(l.dueDate),
                })),
            });

            return apiResponse({
                scope: "STUDENT",
                kpis: {
                    totalStudents: 1,
                    totalCourses: 1,
                    feesCollected: myCollected,
                    pendingFees: myPending,
                    overdueFees: myOverdue,
                },
                paymentModeTotals,
                activeSession: student.session?.name || null,
                latestPayments: myPayments.map((p) => ({
                    id: p.id,
                    amount: p.amount,
                    paidAt: p.paidAt,
                    receiptNumber: p.receiptNumber,
                    paymentMode: p.paymentMode,
                    student: {
                        name: `${student.firstName} ${student.lastName}`,
                        registrationNo: student.registrationNo,
                    },
                    semester: p.feeLedger.semester,
                })),
                feeRecords: [
                    {
                        id: student.id,
                        student: {
                            name: `${student.firstName} ${student.lastName}`,
                            registrationNo: student.registrationNo,
                            course: student.course,
                        },
                        totalAmount: mySummary.totalAmount,
                        paidAmount: mySummary.paidAmount,
                        pendingAmount: mySummary.pendingAmount,
                        dueDate: mySummary.dueDate,
                        dueAmount: mySummary.dueAmount,
                        status: mySummary.status,
                    },
                ],
                courseFeeOverview: [],
            });
        }

        const [
            totalStudents,
            totalCourses,
            paymentsAgg,
            paymentsByMode,
            courses,
            sessions,
            ledgers,
            latestPayments,
            activeSession,
            paymentsForOverview,
        ] = await Promise.all([
            prisma.student.count({ where: { isDeleted: false } }),
            prisma.course.count({ where: { isDeleted: false } }),
            prisma.payment.aggregate({ _sum: { amount: true } }),
            prisma.payment.groupBy({ by: ["paymentMode"], _sum: { amount: true } }),
            prisma.course.findMany({
                where: { isDeleted: false },
                select: { code: true, name: true },
                orderBy: { code: "asc" },
            }),
            prisma.session.findMany({
                where: { isDeleted: false },
                select: { name: true },
                orderBy: { name: "asc" },
            }),
            prisma.feeLedger.findMany({
                where: {
                    student: { is: {} },
                },
                select: {
                    id: true,
                    totalAmount: true,
                    paidAmount: true,
                    dueDate: true,
                    status: true,
                    semester: true,
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            registrationNo: true,
                            course: { select: { name: true, code: true } },
                            session: { select: { name: true } },
                        },
                    },
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            prisma.payment.findMany({
                where: {
                    student: { is: {} },
                    feeLedger: { is: {} },
                },
                select: {
                    id: true,
                    amount: true,
                    paidAt: true,
                    receiptNumber: true,
                    paymentMode: true,
                    student: {
                        select: {
                            firstName: true,
                            lastName: true,
                            registrationNo: true,
                            course: { select: { name: true, code: true } },
                        },
                    },
                    feeLedger: { select: { semester: true } },
                },
                orderBy: { paidAt: "desc" },
                take: 6,
            }),
            prisma.session.findFirst({ where: { isDeleted: false, isActive: true }, select: { name: true } }),
            prisma.payment.findMany({
                where: {
                    student: { is: {} },
                    feeLedger: { is: {} },
                },
                select: {
                    amount: true,
                    student: {
                        select: {
                            course: { select: { name: true, code: true } },
                        },
                    },
                },
                orderBy: { paidAt: "desc" },
                take: 500,
            }),
        ]);

        const paymentModeTotals = (paymentsByMode || []).reduce(
            (acc, row) => {
                const key = row.paymentMode === "UPI" ? "UPI" : "CASH";
                acc[key] += toNumber(row._sum.amount);
                return acc;
            },
            { CASH: 0, UPI: 0 }
        );

        const totalFeeCollected = toNumber(paymentsAgg._sum.amount);

        const pendingFees = sumRemainingForLedgers(ledgers);
        const overdueFees = ledgers
            .filter((l) => l.status !== "PAID" && new Date(l.dueDate) < now)
            .reduce((sum, l) => sum + Math.max(0, toNumber(l.totalAmount) - toNumber(l.paidAmount)), 0);

        const studentMap = new Map<
            string,
            {
                student: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    registrationNo: string;
                    course: { name: string; code: string };
                };
                ledgers: Array<{ totalAmount: number; paidAmount: number; dueDate: Date }>;
            }
        >();

        const totalsAll = { collected: 0, pending: 0, overdue: 0, recordCount: 0 };
        const courseIndex = new Map<string, { code: string; name: string }>();
        const sessionIndex = new Map<string, { name: string }>();
        const byCourse = new Map<
            string,
            {
                id: string;
                label: string;
                courseCode: string;
                courseName: string;
                collected: number;
                pending: number;
                overdue: number;
                recordCount: number;
            }
        >();
        const bySession = new Map<
            string,
            {
                id: string;
                label: string;
                sessionName: string;
                collected: number;
                pending: number;
                overdue: number;
                recordCount: number;
            }
        >();
        const matrix = new Map<
            string,
            {
                courseCode: string;
                courseName: string;
                sessionName: string;
                collected: number;
                pending: number;
                overdue: number;
                recordCount: number;
            }
        >();

        for (const l of ledgers) {
            const course = l.student?.course;
            const sessionName = l.student?.session?.name;
            const dueDate = new Date(l.dueDate);

            addToBucket(totalsAll, {
                paidAmount: l.paidAmount,
                totalAmount: l.totalAmount,
                dueDate,
                status: l.status,
                now,
            });

            if (course?.code) {
                courseIndex.set(course.code, { code: course.code, name: course.name });
                const existing =
                    byCourse.get(course.code) ||
                    ({
                        id: course.code,
                        label: course.code,
                        courseCode: course.code,
                        courseName: course.name,
                        collected: 0,
                        pending: 0,
                        overdue: 0,
                        recordCount: 0,
                    } as {
                        id: string;
                        label: string;
                        courseCode: string;
                        courseName: string;
                        collected: number;
                        pending: number;
                        overdue: number;
                        recordCount: number;
                    });

                addToBucket(existing, {
                    paidAmount: l.paidAmount,
                    totalAmount: l.totalAmount,
                    dueDate,
                    status: l.status,
                    now,
                });

                byCourse.set(course.code, existing);
            }

            if (sessionName) {
                sessionIndex.set(sessionName, { name: sessionName });
                const existing =
                    bySession.get(sessionName) ||
                    ({
                        id: sessionName,
                        label: sessionName,
                        sessionName,
                        collected: 0,
                        pending: 0,
                        overdue: 0,
                        recordCount: 0,
                    } as {
                        id: string;
                        label: string;
                        sessionName: string;
                        collected: number;
                        pending: number;
                        overdue: number;
                        recordCount: number;
                    });

                addToBucket(existing, {
                    paidAmount: l.paidAmount,
                    totalAmount: l.totalAmount,
                    dueDate,
                    status: l.status,
                    now,
                });

                bySession.set(sessionName, existing);
            }

            if (course?.code && sessionName) {
                const key = `${course.code}__${sessionName}`;
                const existing =
                    matrix.get(key) ||
                    ({
                        courseCode: course.code,
                        courseName: course.name,
                        sessionName,
                        collected: 0,
                        pending: 0,
                        overdue: 0,
                        recordCount: 0,
                    } as {
                        courseCode: string;
                        courseName: string;
                        sessionName: string;
                        collected: number;
                        pending: number;
                        overdue: number;
                        recordCount: number;
                    });

                addToBucket(existing, {
                    paidAmount: l.paidAmount,
                    totalAmount: l.totalAmount,
                    dueDate,
                    status: l.status,
                    now,
                });

                matrix.set(key, existing);
            }

            const existing = studentMap.get(l.student.id) || {
                student: l.student,
                ledgers: [],
            };
            existing.ledgers.push({
                totalAmount: l.totalAmount,
                paidAmount: l.paidAmount,
                dueDate,
            });
            studentMap.set(l.student.id, existing);
        }

        const feeRecords = Array.from(studentMap.values())
            .map((s) => {
                const summary = computeStudentSummary({ now, ledgers: s.ledgers });
                return {
                    id: s.student.id,
                    student: {
                        name: `${s.student.firstName} ${s.student.lastName}`,
                        registrationNo: s.student.registrationNo,
                        course: s.student.course,
                    },
                    totalAmount: summary.totalAmount,
                    paidAmount: summary.paidAmount,
                    pendingAmount: summary.pendingAmount,
                    dueDate: summary.dueDate,
                    dueAmount: summary.dueAmount,
                    status: summary.status,
                };
            })
            .sort((a, b) => (b.dueAmount || 0) - (a.dueAmount || 0))
            .slice(0, 10);

        const overviewMap = new Map<
            string,
            { courseName: string; courseCode: string; collected: number; pending: number; overdue: number }
        >();

        for (const p of paymentsForOverview) {
            const course = p.student?.course;
            if (!course) continue;
            const key = course.code;
            const existing = overviewMap.get(key) || {
                courseName: course.name,
                courseCode: course.code,
                collected: 0,
                pending: 0,
                overdue: 0,
            };
            existing.collected += toNumber(p.amount);
            overviewMap.set(key, existing);
        }

        for (const l of ledgers) {
            const course = l.student?.course;
            if (!course) continue;
            const key = course.code;
            const existing = overviewMap.get(key) || {
                courseName: course.name,
                courseCode: course.code,
                collected: 0,
                pending: 0,
                overdue: 0,
            };
            const pending = Math.max(0, toNumber(l.totalAmount) - toNumber(l.paidAmount));
            existing.pending += pending;
            if (l.status !== "PAID" && new Date(l.dueDate) < now) existing.overdue += pending;
            overviewMap.set(key, existing);
        }

        const courseFeeOverview = Array.from(overviewMap.values())
            .sort((a, b) => b.collected - a.collected)
            .slice(0, 6);

        return apiResponse({
            scope: "ADMIN",
            kpis: {
                totalStudents,
                totalCourses,
                feesCollected: totalFeeCollected,
                pendingFees,
                overdueFees,
            },
            paymentModeTotals,
            activeSession: activeSession?.name || null,
            latestPayments: latestPayments.map((p) => ({
                id: p.id,
                amount: p.amount,
                paidAt: p.paidAt,
                receiptNumber: p.receiptNumber,
                paymentMode: p.paymentMode,
                student: {
                    name: `${p.student.firstName} ${p.student.lastName}`,
                    registrationNo: p.student.registrationNo,
                    course: p.student.course,
                },
                semester: p.feeLedger.semester,
            })),
            feeRecords,
            courseFeeOverview,
            feeBarChart: {
                all: { ...totalsAll, id: "ALL", label: "All" },
                byCourse: Array.from(byCourse.values()).sort((a, b) => b.collected - a.collected),
                bySession: Array.from(bySession.values()).sort((a, b) => b.collected - a.collected),
                matrix: Array.from(matrix.values()),
                filters: {
                    courses: (courses || []).map((c) => ({ code: c.code, name: c.name })),
                    sessions: (sessions || []).map((s) => ({ name: s.name })),
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
        return apiError(message, 500);
    }
});
