import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function withSecurityHeaders(res: NextResponse) {
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    );
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");

    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
        res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    const csp = isProd
        ? "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; upgrade-insecure-requests"
        : "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: http: https:";
    res.headers.set("Content-Security-Policy", csp);

    return res;
}

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
        return withSecurityHeaders(NextResponse.next());
    }

    // API routes - check Authorization header
    if (pathname.startsWith("/api/")) {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return withSecurityHeaders(
                NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
            );
        }
        return withSecurityHeaders(NextResponse.next());
    }

    // Page routes - allow (auth check happens client-side)
    return withSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
