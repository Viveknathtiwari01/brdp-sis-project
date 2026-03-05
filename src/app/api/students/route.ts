import { NextRequest, NextResponse } from "next/server";
import { withRole, withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { StudentService } from "@/lib/services/student.service";
import { studentRegistrationSchema } from "@/lib/validators/student";

// GET /api/students - List students
export const GET = withPermission("student:view")(async (req, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || undefined;
        const courseId = searchParams.get("courseId") || undefined;
        const sessionId = searchParams.get("sessionId") || undefined;

        // If student, only return their own data
        if (user.role === "STUDENT") {
            const student = await StudentService.getByUserId(user.userId);
            return apiResponse({ students: [student], pagination: { page: 1, limit: 1, total: 1, totalPages: 1 } });
        }

        const result = await StudentService.getAll({ page, limit, search, courseId, sessionId });
        return apiResponse(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch students";
        return apiError(message, 500);
    }
});

// POST /api/students - Register student
export const POST = withPermission("student:create")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = studentRegistrationSchema.parse(body);
        const result = await StudentService.register(validated, user.userId);
        return apiResponse(result, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        return apiError(message, 400);
    }
});
