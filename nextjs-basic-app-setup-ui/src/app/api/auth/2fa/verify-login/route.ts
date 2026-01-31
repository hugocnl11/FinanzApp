import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { verify } from "otplib";
import { prisma } from "@/lib/prisma";
import { verifyTempToken, setSessionCookie, jsonError } from "@/app/api/_helpers";

type Payload = { tempToken: string; code: string };

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonError("Payload inválido");
  }
  const { tempToken, code } = payload;
  if (!tempToken?.trim() || !code?.trim()) {
    return jsonError("tempToken y code son obligatorios");
  }

  const userId = verifyTempToken(tempToken.trim());
  if (!userId) return jsonError("Enlace de verificación expirado o inválido", 400);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, preferences: true, totpSecret: true },
  });
  if (!user || !user.totpSecret) return jsonError("Usuario o 2FA no configurado", 400);

  const isValid = await verify({ secret: user.totpSecret, token: code.trim() });
  if (!isValid) return jsonError("Código incorrecto", 400);

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { userId: user.id, token: sessionToken },
  });
  const res = NextResponse.json({
    data: {
      token: Buffer.from(user.id).toString("base64"),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? undefined,
        preferences: user.preferences ?? undefined,
      },
    },
  });
  setSessionCookie(res, sessionToken);
  return res;
}
