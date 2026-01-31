import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError, setSessionCookie, signTempToken } from "@/app/api/_helpers";
import { sendMail } from "@/lib/mailer";
import { seedCategoriesForUser } from "@/lib/seed-categories";

type AuthPayload = {
  email: string;
  password: string;
  name?: string;
  mode?: "register" | "login";
};

const hashPassword = (password: string) =>
  crypto.createHash("sha256").update(password).digest("hex");

export async function POST(request: Request) {
  let payload: AuthPayload;
  try {
    payload = (await request.json()) as AuthPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { email: rawEmail, password, name, mode } = payload;
  // Normalizar email: trim y lowercase
  const email = rawEmail?.trim().toLowerCase() || rawEmail;
  if (!email || !password) {
    return jsonError("Email y contraseña son obligatorios");
  }

  const action = mode ?? "login";
  if (action === "register") {
    if (!name) return jsonError("Nombre es obligatorio para registro");
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerified) return jsonError("El email ya está registrado", 409);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    let user: { id: string; email: string; name: string };
    if (existing && !existing.emailVerified) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expires,
          name,
          passwordHash: hashPassword(password),
        },
      });
      user = { id: existing.id, email: existing.email, name };
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hashPassword(password),
          emailVerified: false,
          emailVerificationToken: token,
          emailVerificationExpires: expires,
        },
      });
      user = created;

      await seedCategoriesForUser(user.id);
    }

    // En Vercel usar siempre VERCEL_URL para que el enlace no sea localhost. Si no, APP_URL o localhost.
    let appUrl: string;
    if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.APP_URL) {
      appUrl = process.env.APP_URL;
    } else {
      appUrl = "http://localhost:3000";
    }
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Verifica tu email en FinanzApp",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2>Bienvenido a FinanzApp</h2>
            <p>Para activar tu cuenta, verifica tu email haciendo click en el siguiente enlace:</p>
            <p><a href="${verifyUrl}">Verificar email</a></p>
            <p>Este enlace expira en 24 horas.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error enviando email de verificación', error);
      // No eliminamos el usuario si falla el email, solo registramos el error
      // El usuario puede verificar su email más tarde o contactar soporte
      // En producción, deberías configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS en Vercel
    }

    return NextResponse.json({
      data: {
        token: Buffer.from(user.id).toString("base64"),
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, image: true, preferences: true, passwordHash: true, emailVerified: true, totpSecret: true },
  });
  const passwordHash = hashPassword(password);

  if (!user) {
    return jsonError("Credenciales inválidas", 401);
  }

  if (user.passwordHash !== passwordHash) {
    return jsonError("Credenciales inválidas", 401);
  }

  if (!user.emailVerified) {
    return jsonError("Email no verificado", 403);
  }

  if (user.totpSecret) {
    const tempToken = signTempToken(user.id);
    return NextResponse.json({
      data: {
        requires2FA: true,
        tempToken,
      },
    });
  }

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
