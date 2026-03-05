import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (user) {
            await AuthService.logout(user.userId);
        }

        const response = NextResponse.json(
            { success: true, message: "Logged out successfully" },
            { status: 200 }
        );

        response.cookies.delete("refreshToken");
        return response;
    } catch {
        return NextResponse.json(
            { success: true, message: "Logged out" },
            { status: 200 }
        );
    }
}
