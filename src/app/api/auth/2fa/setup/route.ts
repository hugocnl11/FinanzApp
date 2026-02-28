import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, totpSecret: true },
  });
  if (!user) return jsonError("Usuario no encontrado", 404);
  if (user.totpSecret) return jsonError("2FA ya está activado", 400);

  const secret = generateSecret();
  const otpauthUrl = generateURI({
    secret,
    issuer: "FinanzApp",
    label: user.email,
  });

  let qrDataUrl: string | undefined;
  try {
    qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 });
  } catch {
    // omit QR if generation fails
  }

  return NextResponse.json({
    data: { secret, otpauthUrl, qrDataUrl },
  });
}
