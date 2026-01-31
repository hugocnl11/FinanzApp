import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/app/api/_helpers";
import { sendMail } from "@/lib/mailer";

type Payload = { email: string };

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return jsonError("Payload inválido");
  }
  const email = payload.email?.trim().toLowerCase();
  if (!email) return jsonError("Email es obligatorio");

  const user = await prisma.user.findFirst({
    where: { email, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ data: { sent: true } });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  let appUrl: string;
  if (process.env.VERCEL_URL) {
    appUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.APP_URL) {
    appUrl = process.env.APP_URL;
  } else {
    appUrl = "http://localhost:3000";
  }
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await sendMail({
      to: user.email,
      subject: "Restablecer contraseña - FinanzApp",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Restablecer contraseña</h2>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace (válido 1 hora):</p>
          <p><a href="${resetUrl}">Restablecer contraseña</a></p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Error enviando email de restablecimiento", e);
    return jsonError("No se pudo enviar el email. Inténtalo más tarde.");
  }

  return NextResponse.json({ data: { sent: true } });
}
