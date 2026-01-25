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

  const { email: rawEmail, password, name, mode } = payload;
  // Normalizar email: trim y lowercase
  const email = rawEmail?.trim().toLowerCase() || rawEmail;
  // #region agent log
  console.log('[DEBUG] POST /api/auth entry', { rawEmail, email, passwordLength: password?.length, mode, hasName: !!name });
  const fs = await import('fs/promises'); const logPath = '/Users/hugonavima/Desktop/projects/FinanzApp/.cursor/debug.log'; await fs.appendFile(logPath, JSON.stringify({location:'route.ts:25',message:'POST entry',data:{rawEmail,email,passwordLength:password?.length,mode,hasName:!!name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n').catch(()=>{});
  // #endregion
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
    // #region agent log
    console.log('[DEBUG] User registered successfully', { userId: user.id, email: user.email, emailVerified: user.emailVerified });
    // #endregion

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
      // #region agent log
      console.log('[DEBUG] Verification email sent', { email: user.email, verifyUrl });
      // #endregion
    } catch (error) {
      // #region agent log
      console.error('[DEBUG] Error enviando email de verificación', error);
      // #endregion
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
  const passwordHash = hashPassword(password);
  // #region agent log
  console.log('[DEBUG] User lookup result', { 
    userExists: !!user, 
    userEmail: user?.email, 
    emailSearched: email,
    emailMatch: user?.email === email,
    storedHashPrefix: user?.passwordHash?.substring(0, 10), 
    computedHashPrefix: passwordHash.substring(0, 10), 
    hashesMatch: user?.passwordHash === passwordHash,
    emailVerified: user?.emailVerified,
    passwordLength: password?.length
  });
  // Verificar todos los usuarios para debug
  const allUsers = await prisma.user.findMany({ select: { email: true, emailVerified: true } });
  console.log('[DEBUG] All users in DB', { count: allUsers.length, emails: allUsers.map(u => ({ email: u.email, verified: u.emailVerified })) });
  const fs2 = await import('fs/promises'); const logPath2 = '/Users/hugonavima/Desktop/projects/FinanzApp/.cursor/debug.log'; await fs2.appendFile(logPath2, JSON.stringify({location:'route.ts:115',message:'User lookup result',data:{userExists:!!user,userEmail:user?.email,emailSearched:email,storedHash:user?.passwordHash?.substring(0,10)+'...',computedHash:passwordHash.substring(0,10)+'...',hashesMatch:user?.passwordHash===passwordHash,emailVerified:user?.emailVerified,allUsersCount:allUsers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n').catch(()=>{});
  // #endregion
  if (!user) {
    // #region agent log
    console.log('[DEBUG] User not found', { email, allUsersCount: (await prisma.user.findMany()).length });
    const fs3 = await import('fs/promises'); const logPath3 = '/Users/hugonavima/Desktop/projects/FinanzApp/.cursor/debug.log'; await fs3.appendFile(logPath3, JSON.stringify({location:'route.ts:129',message:'User not found',data:{email,allUsersCount:(await prisma.user.findMany()).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n').catch(()=>{});
    // #endregion
    return jsonError("Credenciales inválidas", 401);
  }

  if (user.passwordHash !== passwordHash) {
    // #region agent log
    console.log('[DEBUG] Password hash mismatch', { 
      userEmail: user.email,
      storedHashPrefix: user.passwordHash.substring(0, 10), 
      computedHashPrefix: passwordHash.substring(0, 10)
    });
    const fs4 = await import('fs/promises'); const logPath4 = '/Users/hugonavima/Desktop/projects/FinanzApp/.cursor/debug.log'; await fs4.appendFile(logPath4, JSON.stringify({location:'route.ts:137',message:'Password hash mismatch',data:{userEmail:user.email,storedHashPrefix:user.passwordHash.substring(0,10),computedHashPrefix:passwordHash.substring(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n').catch(()=>{});
    // #endregion
    return jsonError("Credenciales inválidas", 401);
  }

  if (!user.emailVerified) {
    // #region agent log
    console.log('[DEBUG] Email not verified', { emailVerified: user.emailVerified });
    const fs4 = await import('fs/promises'); const logPath4 = '/Users/hugonavima/Desktop/projects/FinanzApp/.cursor/debug.log'; await fs4.appendFile(logPath4, JSON.stringify({location:'route.ts:129',message:'Email not verified',data:{emailVerified:user.emailVerified},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n').catch(()=>{});
    // #endregion
    return jsonError("Email no verificado", 403);
  }

  return NextResponse.json({
    data: {
      token: Buffer.from(user.id).toString("base64"),
      user: { id: user.id, name: user.name, email: user.email },
    },
  });
}
