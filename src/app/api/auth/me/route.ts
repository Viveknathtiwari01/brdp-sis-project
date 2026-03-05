import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const profile = await AuthService.getProfile(user.userId);
        return NextResponse.json({ success: true, data: profile }, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get profile";
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
