import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionTokenFromCookie } from "@/app/api/_helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const token = getSessionTokenFromCookie(request.headers.get("cookie") ?? null);
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  const response = NextResponse.json({ data: { ok: true } });
  clearSessionCookie(response);
  return response;
}
