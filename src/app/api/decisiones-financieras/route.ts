import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId, jsonError } from "@/app/api/_helpers";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const bodySchema = z.object({
  question: z.string().min(1, "La pregunta es obligatoria"),
  plazo: z.enum(["corto", "medio", "largo"]),
  estimatedAmount: z.number().positive().optional(),
});

const SYSTEM_PROMPT = `Eres un asesor financiero que responde en español. 
Tu tarea es valorar si una decisión de compra o meta financiera es adecuada para la persona, según el resumen de su situación que recibirás.
Responde SIEMPRE con un veredicto claro en una línea: "Buena decisión", "Decisión arriesgada" o "Mala decisión" (o equivalentes breves).
Después, en uno o dos párrafos, explica el razonamiento de forma breve y comprensible, basándote solo en el resumen y en la pregunta del usuario. No inventes datos que no estén en el resumen.`;

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return jsonError("No autenticado", 401);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors.map((x) => x.message).join(", ") : "Body inválido";
    return jsonError(msg, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Servicio de recomendaciones no disponible. Falta configuración." },
      { status: 503 }
    );
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const [movements, budgets, goals, assetSnapshots] = await Promise.all([
    prisma.movement.findMany({
      where: { userId, date: { gte: twelveMonthsAgo } },
      select: { amount: true, type: true },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { limit: true, spent: true, period: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { title: true, target: true, saved: true, type: true, dueDate: true },
    }),
    prisma.assetSnapshot.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { categoryId: true, value: true, date: true },
    }),
  ]);

  const toNum = (v: { toString(): string } | null | undefined) =>
    v == null ? 0 : Number(v.toString());

  let income = 0,
    expense = 0,
    investment = 0,
    savings = 0;
  for (const m of movements) {
    const a = toNum(m.amount);
    switch (m.type) {
      case "INCOME":
        income += a;
        break;
      case "EXPENSE":
        expense += a;
        break;
      case "INVESTMENT":
        investment += a;
        break;
      case "SAVINGS":
        savings += a;
        break;
    }
  }

  const lastByCategory = new Map<string, { value: number; date: Date }>();
  for (const s of assetSnapshots) {
    if (!lastByCategory.has(s.categoryId)) {
      lastByCategory.set(s.categoryId, { value: toNum(s.value), date: s.date });
    }
  }
  const totalPatrimonio = [...lastByCategory.values()].reduce((acc, x) => acc + x.value, 0);

  const budgetLines =
    budgets.length > 0
      ? budgets
          .slice(0, 10)
          .map(
            (b) =>
              `  - Límite ${toNum(b.limit)} €, gastado ${toNum(b.spent)} € (${b.period})`
          )
          .join("\n")
      : "  (sin presupuestos)";

  const goalLines =
    goals.length > 0
      ? goals
          .slice(0, 8)
          .map(
            (g) =>
              `  - ${g.title}: ${toNum(g.saved)} / ${toNum(g.target)} € (tipo: ${g.type})`
          )
          .join("\n")
      : "  (sin objetivos)";

  const summary = `
Resumen financiero (últimos 12 meses y estado actual):

Ingresos totales: ${income.toFixed(2)} €
Gastos totales: ${expense.toFixed(2)} €
Inversiones (movimientos): ${investment.toFixed(2)} €
Ahorro (movimientos): ${savings.toFixed(2)} €
Ahorro aproximado (ingresos - gastos): ${(income - expense).toFixed(2)} €

Presupuestos:
${budgetLines}

Objetivos:
${goalLines}

Patrimonio/inversión (último valor por categoría): ${totalPatrimonio.toFixed(2)} €
`.trim();

  const userPrompt = `
${summary}

---

Pregunta del usuario: ${body.question}
Plazo: ${body.plazo}${body.estimatedAmount != null ? `\nImporte o coste estimado: ${body.estimatedAmount} €` : ""}

Responde con el veredicto en la primera línea y luego el razonamiento.
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "La IA no devolvió una respuesta válida." },
        { status: 500 }
      );
    }
    const firstLine = text.split("\n")[0]?.trim() ?? "";
    const reasoning = text.slice(firstLine.length).trim() || text;
    return NextResponse.json({
      verdict: firstLine || "Recomendación",
      reasoning: reasoning || text,
    });
  } catch (err) {
    console.error("Gemini decisiones-financieras error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error al obtener la recomendación. Inténtalo más tarde.",
      },
      { status: 500 }
    );
  }
}
