import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "./jwt";
import { SystemRole } from "@prisma/client";

export interface AuthenticatedRequest extends NextRequest {
    user?: TokenPayload;
}

export type ApiHandler = (
    req: NextRequest,
    context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export type AuthenticatedApiHandler = (
    req: NextRequest,
    user: TokenPayload,
    context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

// Extracts and verifies JWT from Authorization header
export async function getAuthUser(req: NextRequest): Promise<TokenPayload | null> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    return verifyAccessToken(token);
}

// Middleware wrapper that enforces authentication
export function withAuth(handler: AuthenticatedApiHandler): ApiHandler {
    return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized. Please login." },
                { status: 401 }
            );
        }
        return handler(req, user, context);
    };
}

// Middleware wrapper that enforces specific roles
export function withRole(...roles: SystemRole[]): (handler: AuthenticatedApiHandler) => ApiHandler {
    return (handler: AuthenticatedApiHandler): ApiHandler => {
        return withAuth(async (req, user, context) => {
            if (!roles.includes(user.role)) {
                return NextResponse.json(
                    { success: false, message: "Forbidden. Insufficient role." },
                    { status: 403 }
                );
            }
            return handler(req, user, context);
        });
    };
}

// Middleware wrapper that enforces specific permissions
export function withPermission(...permissions: string[]): (handler: AuthenticatedApiHandler) => ApiHandler {
    return (handler: AuthenticatedApiHandler): ApiHandler => {
        return withAuth(async (req, user, context) => {
            // System admins bypass permission checks
            if (user.role === SystemRole.SYSTEM_ADMIN) {
                return handler(req, user, context);
            }

            const userPermissions = user.permissions || [];
            const hasPermission = permissions.some((p) => userPermissions.includes(p));

            if (!hasPermission) {
                return NextResponse.json(
                    { success: false, message: "Forbidden. Missing required permission." },
                    { status: 403 }
                );
            }

            return handler(req, user, context);
        });
    };
}

// Standard API response helper
export function apiResponse<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
    return NextResponse.json({ success: false, message }, { status });
}
