import { NextRequest, NextResponse } from "next/server";
import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import prisma from "@/lib/prisma/client";
import { bulkFeeStructureSchema } from "@/lib/validators/academic";

// GET /api/fee-structures - List fee structures for a course+session
export const GET = withPermission("course:view")(async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const sessionId = searchParams.get("sessionId");

        if (!courseId || !sessionId) {
            return apiError("Course and Session are required", 400);
        }

        const feeStructures = await prisma.courseFeeStructure.findMany({
            where: { courseId, sessionId },
            orderBy: { semester: "asc" },
        });

        return apiResponse(feeStructures);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch fee structures";
        return apiError(message, 500);
    }
});

// POST /api/fee-structures - Create/Update bulk fee structures
export const POST = withPermission("course:create")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = bulkFeeStructureSchema.parse(body);

        // Delete existing for this course+session to replace
        await prisma.$transaction([
            prisma.courseFeeStructure.deleteMany({
                where: { courseId: validated.courseId, sessionId: validated.sessionId },
            }),
            prisma.courseFeeStructure.createMany({
                data: validated.semesters.map((s) => ({
                    courseId: validated.courseId,
                    sessionId: validated.sessionId,
                    semester: s.semester,
                    totalAmount: s.totalAmount,
                    dueDate: new Date(s.dueDate),
                    description: s.description || null,
                })),
            }),
            prisma.auditLog.create({
                data: {
                    userId: user.userId,
                    action: "UPDATE",
                    module: "FeeStructure",
                    details: `Updated fee structure for course ${validated.courseId} session ${validated.sessionId}`,
                },
            }),
        ]);

        return apiResponse({ success: true, message: "Fee structures updated successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed";
        return apiError(message, 400);
    }
});
