import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

const hashPassword = (password: string) =>
  crypto.createHash("sha256").update(password).digest("hex");

export async function PUT(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return jsonError("No autorizado", 401);
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload inválido");
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return jsonError("La contraseña actual y la nueva son obligatorias");
  }

  if (newPassword.length < 8) {
    return jsonError("La nueva contraseña debe tener al menos 8 caracteres");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return jsonError("Usuario no encontrado", 404);
  }

  if (user.passwordHash !== hashPassword(currentPassword)) {
    return jsonError("La contraseña actual es incorrecta", 401);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ data: { success: true } });
}
