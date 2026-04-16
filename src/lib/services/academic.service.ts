import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma/client";
import { cacheService } from "./cache.service";
import type { CourseInput, SessionInput, FeeStructureInput } from "@/lib/validators/academic";

export class AcademicService {
    // ── Course CRUD ──────────────────────────────────────────
    static async createCourse(data: CourseInput, createdBy: string) {
        const existing = await cacheService.get(`course:${data.code}`);
        if (existing) throw new Error("Course code already exists");

        const course = await prisma.course.create({ data });

        await prisma.auditLog.create({
            data: {
                userId: createdBy,
                action: "CREATE",
                module: "Course",
                details: `Created course: ${course.name} (${course.code})`,
            },
        });

        return course;
    }

    static async updateCourse(id: string, data: Partial<CourseInput>, updatedBy: string) {
        const course = await prisma.course.update({ where: { id }, data });

        await prisma.auditLog.create({
            data: {
                userId: updatedBy,
                action: "UPDATE",
                module: "Course",
                details: `Updated course: ${course.name}`,
            },
        });

        return course;
    }

    static async deleteCourse(id: string, deletedBy: string) {
        await prisma.course.update({ where: { id }, data: { isDeleted: true } });

        await prisma.auditLog.create({
            data: {
                userId: deletedBy,
                action: "DELETE",
                module: "Course",
                details: `Soft-deleted course ID: ${id}`,
            },
        });
    }

    static async getAllCourses() {
        return cacheService.getCourses();
    }

    static async getCourseById(id: string) {
        const course = await prisma.course.findUnique({
            where: { id, isDeleted: false },
            include: { feeStructures: true, students: { select: { id: true } } },
        });
        if (!course) throw new Error("Course not found");
        return course;
    }

    // ── Session CRUD ─────────────────────────────────────────
    static async createSession(data: SessionInput, createdBy: string) {
        const session = await prisma.session.create({
            data: {
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: createdBy,
                action: "CREATE",
                module: "Session",
                details: `Created session: ${session.name}`,
            },
        });

        return session;
    }

    static async updateSession(id: string, data: Partial<SessionInput>, updatedBy: string) {
        const updateData: Record<string, unknown> = {};
        if (data.name) updateData.name = data.name;
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);

        const session = await prisma.session.update({ where: { id }, data: updateData });

        await prisma.auditLog.create({
            data: {
                userId: updatedBy,
                action: "UPDATE",
                module: "Session",
                details: `Updated session: ${session.name}`,
            },
        });

        return session;
    }

    static async deleteSession(id: string, deletedBy: string) {
        await prisma.session.update({ where: { id }, data: { isDeleted: true } });

        await prisma.auditLog.create({
            data: {
                userId: deletedBy,
                action: "DELETE",
                module: "Session",
                details: `Soft-deleted session ID: ${id}`,
            },
        });
    }

    static async getAllSessions() {
        return cacheService.getSessions();
    }

    static async getSessionById(id: string) {
        const session = await prisma.session.findUnique({
            where: { id, isDeleted: false },
            include: { feeStructures: true, students: { select: { id: true } } },
        });
        if (!session) throw new Error("Session not found");
        return session;
    }

    // ── Fee Structure CRUD ───────────────────────────────────
    static async createFeeStructure(data: FeeStructureInput, createdBy: string) {
        const existing = await prisma.courseFeeStructure.findUnique({
            where: {
                courseId_sessionId_semester: {
                    courseId: data.courseId,
                    sessionId: data.sessionId,
                    semester: data.semester,
                },
            },
        });

        if (existing) throw new Error("Fee structure already exists for this course/session/semester");

        const structure = await prisma.courseFeeStructure.create({
            data: {
                courseId: data.courseId,
                sessionId: data.sessionId,
                semester: data.semester,
                totalAmount: data.totalAmount,
                dueDate: new Date(data.dueDate),
                description: data.description || null,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: createdBy,
                action: "CREATE",
                module: "FeeStructure",
                details: `Created fee structure: Course ${data.courseId}, Sem ${data.semester}, Amount ₹${data.totalAmount}`,
            },
        });

        return structure;
    }

    static async getFeeStructures(courseId?: string, sessionId?: string) {
        const where: Record<string, string> = {};
        if (courseId) where.courseId = courseId;
        if (sessionId) where.sessionId = sessionId;

        return prisma.courseFeeStructure.findMany({
            where,
            include: {
                course: { select: { name: true, code: true } },
                session: { select: { name: true } },
            },
            orderBy: [{ courseId: "asc" }, { semester: "asc" }],
        });
    }

    static async updateFeeStructure(id: string, data: Partial<FeeStructureInput>, updatedBy: string) {
        const updateData: Record<string, unknown> = {};
        if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.description !== undefined) updateData.description = data.description;

        const structure = await prisma.courseFeeStructure.update({
            where: { id },
            data: updateData,
        });

        await prisma.auditLog.create({
            data: {
                userId: updatedBy,
                action: "UPDATE",
                module: "FeeStructure",
                details: `Updated fee structure ID: ${id}`,
            },
        });

        return structure;
    }

    static async deleteFeeStructure(id: string, deletedBy: string) {
        await prisma.courseFeeStructure.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: deletedBy,
                action: "DELETE",
                module: "FeeStructure",
                details: `Deleted fee structure ID: ${id}`,
            },
        });
    }
}
