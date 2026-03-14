import { NextRequest } from "next/server";
import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { StudentService } from "@/lib/services/student.service";

export const GET = withPermission("student:view")(async (_req: NextRequest, user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Student ID is required", 400);

        const student = await StudentService.getById(id);

        if (user.role === "STUDENT" && student.userId !== user.userId) {
            return apiError("Forbidden. Insufficient role.", 403);
        }

        return apiResponse(student);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch student";
        return apiError(message, 500);
    }
});

export const PUT = withPermission("student:edit")(async (req: NextRequest, user, context) => {
    try {
        if (user.role === "STUDENT") {
            return apiError("Forbidden. Insufficient role.", 403);
        }

        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Student ID is required", 400);

        const body = await req.json();
        const {
            email: _email,
            password: _password,
            initialPayment: _initialPayment,
            paymentMode: _paymentMode,
            transactionId: _transactionId,
            ...allowed
        } = body || {};

        const updated = await StudentService.update(id, allowed, user.userId);
        return apiResponse(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update student";
        return apiError(message, 400);
    }
});

export const DELETE = withPermission("student:delete")(async (_req: NextRequest, user, context) => {
    try {
        if (user.role === "STUDENT") {
            return apiError("Forbidden. Insufficient role.", 403);
        }

        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Student ID is required", 400);

        await StudentService.softDelete(id, user.userId);
        return apiResponse({ message: "Student deleted successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete student";
        return apiError(message, 400);
    }
});
