import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, clearSessionCookie, jsonError } from "@/app/api/_helpers";

const hashPassword = (password: string) =>
  crypto.createHash("sha256").update(password).digest("hex");

export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autenticado", 401);

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload inválido");
  }

  if (!body.password) return jsonError("La contraseña es obligatoria");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) return jsonError("Usuario no encontrado", 404);

  if (user.passwordHash !== hashPassword(body.password)) {
    return jsonError("Contraseña incorrecta", 401);
  }

  await prisma.user.delete({ where: { id: userId } });

  const res = NextResponse.json({ data: { deleted: true } });
  clearSessionCookie(res);
  return res;
}
