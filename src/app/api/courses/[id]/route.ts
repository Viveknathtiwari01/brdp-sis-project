import { NextRequest } from "next/server";
import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { AcademicService } from "@/lib/services/academic.service";
import { courseSchema } from "@/lib/validators/academic";

export const GET = withPermission("course:view")(async (_req: NextRequest, _user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Course ID is required", 400);

        const course = await AcademicService.getCourseById(id);
        return apiResponse(course);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch course";
        return apiError(message, 500);
    }
});

export const PUT = withPermission("course:edit")(async (req: NextRequest, user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Course ID is required", 400);

        const body = await req.json();
        const validated = courseSchema.partial().parse(body);

        const updated = await AcademicService.updateCourse(id, validated, user.userId);
        return apiResponse(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update course";
        return apiError(message, 400);
    }
});

export const DELETE = withPermission("course:delete")(async (_req: NextRequest, user, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("Course ID is required", 400);

        await AcademicService.deleteCourse(id, user.userId);
        return apiResponse({ message: "Course deleted successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete course";
        return apiError(message, 400);
    }
});
