import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth/login", "/api/auth/refresh"];

// Routes that are always accessible
const alwaysAccessible = ["/", "/favicon.ico"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (
        alwaysAccessible.includes(pathname) ||
        publicRoutes.some((route) => pathname.startsWith(route)) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth")
    ) {
        return NextResponse.next();
    }

    // API routes - check Authorization header
    if (pathname.startsWith("/api/")) {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }
        return NextResponse.next();
    }

    // Page routes - allow (auth check happens client-side)
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
