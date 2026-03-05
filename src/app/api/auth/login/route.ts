import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = loginSchema.parse(body);
        const result = await AuthService.login(validated.email, validated.password);

        const response = NextResponse.json(
            { success: true, data: result },
            { status: 200 }
        );

        // Set refresh token as httpOnly cookie
        response.cookies.set("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        return NextResponse.json(
            { success: false, message },
            { status: 401 }
        );
    }
}
