import prisma from "@/lib/prisma/client";
import { SystemRole } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "@/lib/auth/jwt";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
    static async login(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { email, isDeleted: false },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });

        if (!user) {
            throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
            throw new Error("Account is deactivated. Contact administrator.");
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000
            );
            throw new Error(
                `Account is locked. Try again in ${remainingMinutes} minutes.`
            );
        }

        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            const attempts = user.loginAttempts + 1;
            const updateData: Record<string, unknown> = { loginAttempts: attempts };

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
            }

            await prisma.user.update({ where: { id: user.id }, data: updateData });
            throw new Error("Invalid email or password");
        }

        // Reset login attempts on successful login
        const permissionCodes = user.permissions.map((p) => p.permission.code);

        const accessToken = await generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: permissionCodes,
        });

        const refreshToken = await generateRefreshToken({ userId: user.id });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                refreshToken,
                lastLoginAt: new Date(),
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "LOGIN",
                module: "Auth",
                details: `User logged in: ${user.email}`,
            },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: permissionCodes,
            },
        };
    }

    static async refresh(refreshToken: string) {
        const payload = await verifyRefreshToken(refreshToken);
        if (!payload) throw new Error("Invalid refresh token");

        const user = await prisma.user.findUnique({
            where: { id: payload.userId, isDeleted: false },
            include: {
                permissions: { include: { permission: true } },
            },
        });

        if (!user || user.refreshToken !== refreshToken) {
            throw new Error("Invalid refresh token");
        }

        const permissionCodes = user.permissions.map((p) => p.permission.code);

        const newAccessToken = await generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: permissionCodes,
        });

        const newRefreshToken = await generateRefreshToken({ userId: user.id });

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: newRefreshToken },
        });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    static async logout(userId: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });

        await prisma.auditLog.create({
            data: {
                userId,
                action: "LOGOUT",
                module: "Auth",
                details: "User logged out",
            },
        });
    }

    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId, isDeleted: false },
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
                    include: {
                        course: true,
                        session: true,
                    },
                },
            },
        });

        if (!user) throw new Error("User not found");

        return {
            ...user,
            permissions: user.permissions.map((p) => p.permission.code),
        };
    }

    static async createUser(
        data: { email: string; password: string; name: string; role: SystemRole },
        createdBy: string
    ) {
        const existing = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existing) throw new Error("Email already exists");

        const hashedPassword = await hashPassword(data.password);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: data.role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: createdBy,
                action: "CREATE",
                module: "User",
                details: `Created user: ${user.email} with role: ${user.role}`,
            },
        });

        return user;
    }
}
