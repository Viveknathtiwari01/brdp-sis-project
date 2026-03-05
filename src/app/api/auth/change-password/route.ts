import { NextRequest } from "next/server";
import prisma from "@/lib/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { withAuth, apiResponse, apiError } from "@/lib/auth/middleware";

// POST /api/auth/change-password
export const POST = withAuth(async (req: NextRequest, user) => {
    try {
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return apiError("Current password and new password are required", 400);
        }

        if (newPassword.length < 8) {
            return apiError("New password must be at least 8 characters", 400);
        }

        // Fetch user with current password hash
        const dbUser = await prisma.user.findUnique({
            where: { id: user.userId, isDeleted: false },
            select: { id: true, password: true, email: true },
        });

        if (!dbUser) {
            return apiError("User not found", 404);
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, dbUser.password);
        if (!isValid) {
            return apiError("Current password is incorrect", 400);
        }

        // Hash and save new password
        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: dbUser.id },
            data: { password: hashedPassword },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: dbUser.id,
                action: "UPDATE",
                module: "Auth",
                details: `Password changed for: ${dbUser.email}`,
            },
        });

        return apiResponse({ message: "Password changed successfully" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to change password";
        return apiError(message, 500);
    }
});
