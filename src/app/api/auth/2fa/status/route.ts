import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true },
  });
  if (!user) return jsonError("Usuario no encontrado", 404);

  return NextResponse.json({
    data: { enabled: Boolean(user.totpSecret) },
  });
}
