import { z } from "zod";

export const courseSchema = z.object({
    name: z.string().min(2, "Course name is required"),
    code: z.string().min(2, "Course code is required").max(20),
    description: z.string().optional(),
    duration: z.coerce.number().int().min(1, "Duration must be at least 1 year"),
    totalSemesters: z.coerce.number().int().min(1, "Must have at least 1 semester"),
});

export const sessionSchema = z.object({
    name: z.string().min(4, "Session name is required (e.g., 2024-2025)"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
});

export const feeStructureSchema = z.object({
    courseId: z.string().min(1, "Course is required"),
    sessionId: z.string().min(1, "Session is required"),
    semester: z.coerce.number().int().min(1, "Semester must be at least 1"),
    totalAmount: z.coerce.number().positive("Amount must be positive"),
    dueDate: z.coerce.date(),
    description: z.string().optional(),
});

export const bulkFeeStructureSchema = z.object({
    courseId: z.string().min(1, "Course is required"),
    sessionId: z.string().min(1, "Session is required"),
    semesters: z.array(z.object({
        semester: z.coerce.number().int().min(1),
        totalAmount: z.coerce.number().positive("Amount must be positive"),
        dueDate: z.coerce.date(),
        description: z.string().optional(),
    })).min(1, "At least one semester is required"),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
export type BulkFeeStructureInput = z.infer<typeof bulkFeeStructureSchema>;
