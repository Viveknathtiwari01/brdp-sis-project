import { NextRequest } from "next/server";
import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { AcademicService } from "@/lib/services/academic.service";
import { sessionSchema } from "@/lib/validators/academic";

export const GET = withPermission("session:view")(async (_req: NextRequest, _user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Session ID is required", 400);

        const session = await AcademicService.getSessionById(id);
        return apiResponse(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch session";
        return apiError(message, 500);
    }
});

export const PUT = withPermission("session:edit")(async (req: NextRequest, user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Session ID is required", 400);

        const body = await req.json();
        const validated = sessionSchema.partial().parse(body);

        const updated = await AcademicService.updateSession(id, validated, user.userId);
        return apiResponse(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update session";
        return apiError(message, 400);
    }
});

export const DELETE = withPermission("session:delete")(async (_req: NextRequest, user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Session ID is required", 400);

        await AcademicService.deleteSession(id, user.userId);
        return apiResponse({ message: "Session deleted successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete session";
        return apiError(message, 400);
    }
});
