import { NextResponse } from "next/server";
import { verify } from "otplib";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

type Payload = { secret: string; code: string };

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonError("Payload inválido");
  }
  const { secret, code } = payload;
  if (!secret?.trim() || !code?.trim()) {
    return jsonError("secret y code son obligatorios");
  }

  const isValid = await verify({ secret: secret.trim(), token: code.trim() });
  if (!isValid) return jsonError("Código incorrecto", 400);

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret.trim() },
  });

  return NextResponse.json({ data: { enabled: true } });
}
