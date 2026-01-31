import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/app/api/_helpers";

type Payload = { token: string; newPassword: string };

const hashPassword = (password: string) =>
  crypto.createHash("sha256").update(password).digest("hex");

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonError("Payload inválido");
  }
  const { token, newPassword } = payload;
  if (!token?.trim() || !newPassword || newPassword.length < 6) {
    return jsonError("Token y nueva contraseña (mín. 6 caracteres) son obligatorios");
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token.trim(),
      passwordResetExpires: { gt: new Date() },
    },
  });
  if (!user) {
    return jsonError("Enlace inválido o expirado", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return NextResponse.json({ data: { success: true } });
}
