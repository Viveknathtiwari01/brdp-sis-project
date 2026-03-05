import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
    try {
        const refreshToken = req.cookies.get("refreshToken")?.value;
        if (!refreshToken) {
            return NextResponse.json(
                { success: false, message: "No refresh token" },
                { status: 401 }
            );
        }

        const result = await AuthService.refresh(refreshToken);

        const response = NextResponse.json(
            { success: true, data: { accessToken: result.accessToken } },
            { status: 200 }
        );

        response.cookies.set("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Token refresh failed";
        return NextResponse.json(
            { success: false, message },
            { status: 401 }
        );
    }
}
