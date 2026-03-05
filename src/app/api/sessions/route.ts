import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { AcademicService } from "@/lib/services/academic.service";
import { sessionSchema } from "@/lib/validators/academic";

// GET /api/sessions
export const GET = withPermission("session:view")(async (_req, _user) => {
    try {
        const sessions = await AcademicService.getAllSessions();
        return apiResponse(sessions);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch sessions";
        return apiError(message, 500);
    }
});

// POST /api/sessions
export const POST = withPermission("session:create")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = sessionSchema.parse(body);
        const session = await AcademicService.createSession(validated, user.userId);
        return apiResponse(session, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create session";
        return apiError(message, 400);
    }
});
