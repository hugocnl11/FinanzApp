import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/app/api/_helpers";
import { sendMail } from "@/lib/mailer";

function getAppUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.APP_URL) return process.env.APP_URL;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return jsonError("Payload inválido");
  }
  const email = body.email?.trim().toLowerCase();
  if (!email) return jsonError("Email es obligatorio");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) {
    return NextResponse.json({ data: { sent: true } });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
  });

  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: "Verifica tu email en FinanzApp",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Verifica tu email en FinanzApp</h2>
          <p>Haz clic en el siguiente enlace para activar tu cuenta:</p>
          <p><a href="${verifyUrl}">Verificar email</a></p>
          <p>Este enlace expira en 24 horas.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error reenviando email de verificación", error);
    return jsonError("No se pudo enviar el correo. Intenta más tarde.", 500);
  }

  return NextResponse.json({ data: { sent: true } });
}
