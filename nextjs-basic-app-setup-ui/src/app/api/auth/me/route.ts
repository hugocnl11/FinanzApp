import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) return jsonError("Sesión inválida", 401);

  return NextResponse.json({
    data: {
      token: Buffer.from(user.id).toString("base64"),
      user: { id: user.id, name: user.name, email: user.email, image: user.image ?? undefined },
    },
  });
}
