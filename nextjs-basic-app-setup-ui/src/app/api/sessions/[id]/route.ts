import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getSessionTokenFromCookie, jsonError } from "@/app/api/_helpers";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const { id } = await context.params;
  const session = await prisma.session.findFirst({
    where: { id, userId },
  });
  if (!session) return jsonError("Sesión no encontrada", 404);

  const currentToken = getSessionTokenFromCookie(request.headers.get("cookie") ?? null);
  const isCurrentSession = session.token === currentToken;

  await prisma.session.delete({ where: { id } });

  const res = NextResponse.json({ data: { revoked: true, wasCurrent: isCurrentSession } });
  if (isCurrentSession) {
    const { clearSessionCookie } = await import("@/app/api/_helpers");
    clearSessionCookie(res);
  }
  return res;
}
