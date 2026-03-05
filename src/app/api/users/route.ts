import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { withRole, apiResponse, apiError } from "@/lib/auth/middleware";
import { createUserSchema } from "@/lib/validators/auth";
import prisma from "@/lib/prisma/client";

// GET /api/users - List all users (System Admin only)
export const GET = withRole("SYSTEM_ADMIN")(async (_req, user) => {
    try {
        const users = await prisma.user.findMany({
            where: { isDeleted: false },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                permissions: {
                    include: { permission: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return apiResponse(users);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch users";
        return apiError(message, 500);
    }
});

// POST /api/users - Create admin user (System Admin only)
export const POST = withRole("SYSTEM_ADMIN")(async (req, user) => {
    try {
        const body = await req.json();
        const validated = createUserSchema.parse(body);
        const newUser = await AuthService.createUser(
            { ...validated, role: validated.role as "ADMIN" | "STUDENT" },
            user.userId
        );
        return apiResponse(newUser, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create user";
        return apiError(message, 400);
    }
});
