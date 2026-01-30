import { NextResponse } from "next/server";
import crypto from "node:crypto";

const SESSION_COOKIE = "finanzapp_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "finanzapp-dev-secret-change-in-production";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function signSessionCookie(userId: string): string {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function getUserIdFromSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (!value) return null;
  const [userId, sig] = value.split(".");
  if (!userId || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (crypto.timingSafeEqual(sigBuf, expectedBuf)) return userId;
  } catch {
    return null;
  }
  return null;
}

export function getUserId(request: Request) {
  const headerId = request.headers.get("x-user-id");
  if (headerId) return headerId;
  const cookieUserId = getUserIdFromSessionCookie(request.headers.get("cookie") ?? null);
  if (cookieUserId) return cookieUserId;
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId");
}

export function setSessionCookie(response: NextResponse, userId: string): void {
  response.cookies.set(SESSION_COOKIE, signSessionCookie(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
