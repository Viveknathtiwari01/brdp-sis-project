import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { SystemRole } from "@prisma/client";

export interface TokenPayload extends JWTPayload {
    userId: string;
    email: string;
    role: SystemRole;
    permissions?: string[];
}

const accessSecretValue = process.env.JWT_ACCESS_SECRET;
const refreshSecretValue = process.env.JWT_REFRESH_SECRET;

if (!accessSecretValue || accessSecretValue.length < 32) {
    throw new Error("JWT_ACCESS_SECRET is missing or too short. Set a strong secret (>= 32 chars). ");
}

if (!refreshSecretValue || refreshSecretValue.length < 32) {
    throw new Error("JWT_REFRESH_SECRET is missing or too short. Set a strong secret (>= 32 chars). ");
}

const ACCESS_SECRET = new TextEncoder().encode(accessSecretValue);
const REFRESH_SECRET = new TextEncoder().encode(refreshSecretValue);

export async function generateAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(process.env.JWT_ACCESS_EXPIRY || "15m")
        .sign(ACCESS_SECRET);
}

export async function generateRefreshToken(payload: Pick<TokenPayload, "userId">): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(process.env.JWT_REFRESH_EXPIRY || "7d")
        .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, ACCESS_SECRET);
        return payload as TokenPayload;
    } catch {
        return null;
    }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, REFRESH_SECRET);
        return payload as TokenPayload;
    } catch {
        return null;
    }
}
