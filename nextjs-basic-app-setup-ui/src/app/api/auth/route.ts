import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/app/api/_helpers";
import { sendMail } from "@/lib/mailer";

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

  const { email, password, name, mode } = payload;
  if (!email || !password) {
    return jsonError("Email y contraseña son obligatorios");
  }

  const action = mode ?? "login";
  if (action === "register") {
    if (!name) return jsonError("Nombre es obligatorio para registro");
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError("El email ya está registrado", 409);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
    });

    const defaultCategories = [
      { name: "Alquiler", type: "EXPENSE", icon: "Home", color: "#6366f1" },
      { name: "Comida", type: "EXPENSE", icon: "Utensils", color: "#22c55e" },
      { name: "Salud", type: "EXPENSE", icon: "HeartPulse", color: "#e11d48" },
      { name: "Transporte", type: "EXPENSE", icon: "Car", color: "#0ea5e9" },
      { name: "Suscripciones", type: "EXPENSE", icon: "CreditCard", color: "#f59e0b" },
      { name: "Restaurantes", type: "EXPENSE", icon: "Utensils", color: "#f97316" },
      { name: "Ropa", type: "EXPENSE", icon: "ShoppingCart", color: "#f59e0b" },
      { name: "Tecnología", type: "EXPENSE", icon: "Smartphone", color: "#6366f1" },
      { name: "Regalos", type: "EXPENSE", icon: "Gift", color: "#f97316" },
      { name: "Otros", type: "EXPENSE", icon: "Wallet", color: "#64748b" },
      { name: "Nomina", type: "INCOME", icon: "Briefcase", color: "#16a34a" },
      { name: "Transferencia", type: "INCOME", icon: "Wallet", color: "#38bdf8" },
      { name: "Venta de Crypto", type: "INCOME", icon: "Droplet", color: "#f59e0b" },
      { name: "Venta de acciones", type: "INCOME", icon: "LineChart", color: "#6366f1" },
      { name: "Ahorro", type: "INVESTMENT", icon: "PiggyBank", color: "#8b5cf6" },
      { name: "Acciones", type: "INVESTMENT", icon: "LineChart", color: "#22c55e" },
      { name: "Crypto", type: "INVESTMENT", icon: "Droplet", color: "#f59e0b" },
    ] as const;

    await prisma.category.createMany({
      data: defaultCategories.map((category) => ({
        userId: user.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        active: true,
      })),
      skipDuplicates: true,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
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
      console.error("Error enviando email de verificación", error);
      await prisma.user.delete({ where: { id: user.id } });
      return jsonError("No se pudo enviar el email de verificación", 500);
    }

    return NextResponse.json({
      data: {
        token: Buffer.from(user.id).toString("base64"),
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.passwordHash !== hashPassword(password)) {
    return jsonError("Credenciales inválidas", 401);
  }

  if (!user.emailVerified) {
    return jsonError("Email no verificado", 403);
  }

  return NextResponse.json({
    data: {
      token: Buffer.from(user.id).toString("base64"),
      user: { id: user.id, name: user.name, email: user.email },
    },
  });
}
