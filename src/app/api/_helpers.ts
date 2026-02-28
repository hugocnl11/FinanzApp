import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "finanzapp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const value = match?.[1]?.trim();
  return value || null;
}

export async function getUserId(request: Request): Promise<string | null> {
  const headerId = request.headers.get("x-user-id");
  if (headerId) return headerId;
  const token = getSessionTokenFromCookie(request.headers.get("cookie") ?? null);
  if (!token) {
    const { searchParams } = new URL(request.url);
    return searchParams.get("userId");
  }
  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true },
  });
  return session?.userId ?? null;
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const TOTP_TEMP_SECRET = process.env.TOTP_TEMP_SECRET || process.env.SESSION_SECRET || "finanzapp-dev-secret";

export function signTempToken(userId: string): string {
  const exp = Date.now() + 1000 * 60 * 5; // 5 min
  const payload = JSON.stringify({ userId, exp });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", TOTP_TEMP_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

export function verifyTempToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac("sha256", TOTP_TEMP_SECRET).update(payloadB64).digest("hex");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload.userId ?? null;
  } catch {
    return null;
  }
}
