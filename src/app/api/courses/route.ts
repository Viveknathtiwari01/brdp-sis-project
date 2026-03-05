import { withPermission, apiResponse, apiError } from "@/lib/auth/middleware";
import { AcademicService } from "@/lib/services/academic.service";
import { courseSchema } from "@/lib/validators/academic";

// GET /api/courses
export const GET = withPermission("course:view")(async (_req, _user) => {
    try {
        const courses = await AcademicService.getAllCourses();
        return apiResponse(courses);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch courses";
        return apiError(message, 500);
    }
});

// POST /api/courses
export const POST = withPermission("course:create")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = courseSchema.parse(body);
        const course = await AcademicService.createCourse(validated, user.userId);
        return apiResponse(course, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create course";
        return apiError(message, 400);
    }
});
