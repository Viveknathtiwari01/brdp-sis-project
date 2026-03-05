import { NextRequest } from "next/server";
import prisma from "@/lib/prisma/client";
import { withRole, apiResponse, apiError } from "@/lib/auth/middleware";

// PUT /api/users/[id]/permissions - Update user permissions (System Admin only)
export const PUT = withRole("SYSTEM_ADMIN")(async (req: NextRequest, authUser, context) => {
    try {
        const params = context ? await context.params : {};
        const userId = params.id;

        if (!userId) {
            return apiError("User ID is required", 400);
        }

        const { permissions } = await req.json();

        if (!Array.isArray(permissions)) {
            return apiError("Permissions must be an array of permission codes", 400);
        }

        // Verify the target user exists and is an ADMIN
        const targetUser = await prisma.user.findUnique({
            where: { id: userId, isDeleted: false },
            select: { id: true, role: true, email: true },
        });

        if (!targetUser) {
            return apiError("User not found", 404);
        }

        if (targetUser.role !== "ADMIN") {
            return apiError("Permissions can only be assigned to Admin users", 400);
        }

        // Fetch permission IDs for the given codes
        const permissionRecords = await prisma.permission.findMany({
            where: { code: { in: permissions } },
            select: { id: true, code: true },
        });

        const validPermissionIds = permissionRecords.map((p) => p.id);

        // Delete existing permissions for this user
        await prisma.adminPermission.deleteMany({
            where: { userId },
        });

        // Create new permissions
        if (validPermissionIds.length > 0) {
            await prisma.adminPermission.createMany({
                data: validPermissionIds.map((permissionId) => ({
                    userId,
                    permissionId,
                    grantedBy: authUser.userId,
                })),
            });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: authUser.userId,
                action: "UPDATE",
                module: "User",
                details: `Updated permissions for ${targetUser.email}: ${permissions.join(", ")}`,
            },
        });

        // Fetch updated user with permissions
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                permissions: {
                    include: { permission: true },
                },
            },
        });

        return apiResponse(updatedUser);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update permissions";
        return apiError(message, 500);
    }
});
