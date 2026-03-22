import { NextRequest } from "next/server";
import prisma from "@/lib/prisma/client";
import { withRole, apiResponse, apiError } from "@/lib/auth/middleware";

export const GET = withRole("SYSTEM_ADMIN")(async (_req: NextRequest, _authUser, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("User ID is required", 400);

        const user = await prisma.user.findUnique({
            where: { id, isDeleted: false },
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
                student: {
                    select: { id: true },
                },
            },
        });

        if (!user) return apiError("User not found", 404);
        return apiResponse(user);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch user";
        return apiError(message, 500);
    }
});

export const PUT = withRole("SYSTEM_ADMIN")(async (req: NextRequest, authUser, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("User ID is required", 400);

        const existing = await prisma.user.findUnique({
            where: { id, isDeleted: false },
            select: { id: true, role: true, email: true },
        });
        if (!existing) return apiError("User not found", 404);

        const body = await req.json();
        const { email: _email, password: _password, refreshToken: _refreshToken, ...allowed } = body || {};

        const updateData: Record<string, unknown> = {};
        if (typeof allowed.name === "string") updateData.name = allowed.name;

        if (typeof allowed.role === "string") {
            if (allowed.role === "SYSTEM_ADMIN") {
                return apiError("SYSTEM_ADMIN role cannot be assigned", 400);
            }
            updateData.role = allowed.role;
        }

        if (typeof allowed.isActive === "boolean") {
            if (existing.role === "SYSTEM_ADMIN" && allowed.isActive === false) {
                return apiError("System Admin cannot be deactivated", 400);
            }
            updateData.isActive = allowed.isActive;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: updateData,
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
        });

        await prisma.auditLog.create({
            data: {
                userId: authUser.userId,
                action: "UPDATE",
                module: "User",
                details: `Updated user ID: ${id}`,
            },
        });

        return apiResponse(updated);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update user";
        return apiError(message, 400);
    }
});

export const DELETE = withRole("SYSTEM_ADMIN")(async (_req: NextRequest, authUser, context) => {
    try {
        const params = await context?.params;
        const id = params?.id;
        if (!id) return apiError("User ID is required", 400);

        const existing = await prisma.user.findUnique({
            where: { id, isDeleted: false },
            select: { id: true, email: true, role: true },
        });
        if (!existing) return apiError("User not found", 404);

        if (existing.role === "SYSTEM_ADMIN") {
            return apiError("System Admin cannot be deleted", 400);
        }

        await prisma.$transaction(async (tx) => {
            await tx.adminPermission.deleteMany({ where: { userId: id } });
            await tx.user.update({
                where: { id },
                data: { isDeleted: true, isActive: false, refreshToken: null },
            });
            await tx.auditLog.create({
                data: {
                    userId: authUser.userId,
                    action: "DELETE",
                    module: "User",
                    details: `Soft-deleted user: ${existing.email}`,
                },
            });
        });

        return apiResponse({ message: "User deleted successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete user";
        return apiError(message, 400);
    }
});
