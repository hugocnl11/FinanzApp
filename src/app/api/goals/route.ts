import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { GoalType } from "@prisma/client";

type GoalMilestonePayload = { date?: string; amount: number };

type GoalPayload = {
  title: string;
  target: number;
  saved?: number;
  type: string;
  dueDate: string;
  description?: string;
  milestones?: GoalMilestonePayload[];
  linkedCategoryIds?: string[];
  linkedBudgetId?: string | null;
  isPrimary?: boolean;
  color?: string | null;
};

const toGoalType = (value: string): GoalType | null => {
  const normalized = value.toLowerCase();
  if (normalized === "ahorro") return "AHORRO";
  if (normalized === "reducir-gasto") return "REDUCIR_GASTO";
  if (normalized === "aumentar-ingreso") return "AUMENTAR_INGRESO";
  return null;
};

const fromGoalType = (value: GoalType) => {
  if (value === "AHORRO") return "ahorro";
  if (value === "REDUCIR_GASTO") return "reducir-gasto";
  return "aumentar-ingreso";
};

type GoalRow = { id: string; title: string; target: unknown; saved: unknown; type: GoalType; dueDate: Date; description: string | null; milestones: unknown; linkedCategoryIds: unknown; linkedBudgetId: string | null; isPrimary: boolean; color?: string | null };

function goalToJson(goal: GoalRow) {
  return {
    id: goal.id,
    title: goal.title,
    target: Number(goal.target),
    saved: Number(goal.saved),
    type: fromGoalType(goal.type),
    dueDate: goal.dueDate instanceof Date ? goal.dueDate.toISOString().slice(0, 10) : String(goal.dueDate).slice(0, 10),
    description: goal.description ?? undefined,
    milestones: (goal.milestones as GoalMilestonePayload[] | null) ?? undefined,
    linkedCategoryIds: Array.isArray(goal.linkedCategoryIds) ? goal.linkedCategoryIds : undefined,
    linkedBudgetId: goal.linkedBudgetId ?? undefined,
    isPrimary: goal.isPrimary,
    color: goal.color ?? undefined,
  };
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let goals: GoalRow[];
  try {
    goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
    });
  } catch {
    // Fallback si la tabla no tiene la columna color (migración no aplicada)
    const rows = await prisma.$queryRaw<GoalRow[]>`
      SELECT id, title, target, saved, type, "dueDate", description, milestones, "linkedCategoryIds", "linkedBudgetId", "isPrimary"
      FROM "Goal"
      WHERE "userId" = ${userId}
      ORDER BY "dueDate" ASC
    `;
    goals = rows.map((r) => ({ ...r, color: null }));
  }
  return NextResponse.json({
    data: goals.map(goalToJson),
  });
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: GoalPayload;
  try {
    payload = (await request.json()) as GoalPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { title, target, saved, type, dueDate, description, milestones, linkedCategoryIds, linkedBudgetId, isPrimary, color } = payload;
  if (!title || typeof target !== "number" || !type || !dueDate) {
    return jsonError("Campos requeridos: title, target, type, dueDate");
  }

  const mappedType = toGoalType(type);
  if (!mappedType) return jsonError("Tipo de objetivo inválido");

  // Solo uno de los dos: por activos o por presupuesto
  const categoryIds = linkedBudgetId ? null : (Array.isArray(linkedCategoryIds) ? linkedCategoryIds : null);
  const budgetId = linkedBudgetId?.trim() || null;

  if (isPrimary === true) {
    await prisma.goal.updateMany({ where: { userId }, data: { isPrimary: false } });
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      target,
      saved: saved ?? 0,
      type: mappedType,
      dueDate: new Date(dueDate),
      description,
      milestones: Array.isArray(milestones) ? milestones : undefined,
      linkedCategoryIds: categoryIds ?? undefined,
      linkedBudgetId: budgetId ?? undefined,
      isPrimary: isPrimary === true,
      color: color?.trim() || null,
    },
  });

  return NextResponse.json({ data: goalToJson(goal) }, { status: 201 });
}
