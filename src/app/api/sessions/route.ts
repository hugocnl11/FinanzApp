import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getSessionTokenFromCookie, jsonError } from "@/app/api/_helpers";

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const currentToken = getSessionTokenFromCookie(request.headers.get("cookie") ?? null);
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, userAgent: true, createdAt: true },
  });

  const data = sessions.map((s) => ({
    id: s.id,
    current: s.token === currentToken,
    userAgent: s.userAgent ?? undefined,
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}
