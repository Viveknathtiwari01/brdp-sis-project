import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import prisma from "@/lib/prisma/client";

// GET /api/fee-ledger?studentId=xxx
export const GET = withPermission("fee_ledger:view")(async (req, user) => {
    try {
        const { searchParams } = new URL(req.url);
        let studentId = searchParams.get("studentId") || undefined;

        // If student role, show only their own ledger
        if (user.role === "STUDENT") {
            const student = await prisma.student.findUnique({
                where: { userId: user.userId },
            });
            if (!student) return apiError("Student record not found", 404);
            studentId = student.id;
        }

        if (!studentId) {
            return apiError("studentId is required", 400);
        }

        const ledger = await prisma.feeLedger.findMany({
            where: { studentId },
            include: {
                payments: {
                    orderBy: { paidAt: "desc" },
                },
                student: {
                    select: {
                        firstName: true,
                        lastName: true,
                        registrationNo: true,
                        course: { select: { name: true, code: true } },
                        session: { select: { name: true } },
                    },
                },
            },
            orderBy: { semester: "asc" },
        });

        return apiResponse(ledger);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch fee ledger";
        return apiError(message, 500);
    }
});
