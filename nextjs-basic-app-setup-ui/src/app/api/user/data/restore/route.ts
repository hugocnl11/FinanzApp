import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { CategoryType, MovementType, GoalType } from "@prisma/client";

type RestorePayload = {
  data: {
    categories?: Array<{ name: string; type: string; icon: string; color: string }>;
    movements?: Array<{ date: string; concept: string; type: string; amount: number; paymentMethod?: string; categoryName: string }>;
    budgets?: Array<{ categoryName: string; limit: number; spent: number; period: string }>;
    goals?: Array<{ title: string; target: number; saved: number; type: string; dueDate: string; description?: string; milestones?: unknown }>;
  };
  mode?: "replace" | "merge";
};

function toCategoryType(s: string): CategoryType {
  const u = s?.toUpperCase();
  if (u === "INCOME") return "INCOME";
  if (u === "EXPENSE") return "EXPENSE";
  if (u === "INVESTMENT") return "INVESTMENT";
  if (u === "SAVINGS") return "SAVINGS";
  return "EXPENSE";
}

function toMovementType(s: string): MovementType {
  const u = s?.toUpperCase();
  if (u === "INCOME") return "INCOME";
  if (u === "EXPENSE") return "EXPENSE";
  if (u === "INVESTMENT") return "INVESTMENT";
  if (u === "SAVINGS") return "SAVINGS";
  return "EXPENSE";
}

function toGoalType(s: string): GoalType {
  const u = s?.toUpperCase();
  if (u === "AHORRO") return "AHORRO";
  if (u === "REDUCIR_GASTO") return "REDUCIR_GASTO";
  if (u === "AUMENTAR_INGRESO") return "AUMENTAR_INGRESO";
  return "AHORRO";
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  let payload: RestorePayload;
  try {
    payload = (await request.json()) as RestorePayload;
  } catch {
    return jsonError("Payload inválido");
  }
  const { data, mode = "merge" } = payload;
  if (!data || typeof data !== "object") return jsonError("data es obligatorio");

  if (mode === "replace") {
    await prisma.$transaction([
      prisma.movement.deleteMany({ where: { userId } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.assetSnapshot.deleteMany({ where: { userId } }),
      prisma.category.deleteMany({ where: { userId } }),
    ]);
  }

  const categoryIds = new Map<string, string>();

  if (data.categories?.length) {
    for (const c of data.categories) {
      const existing = await prisma.category.findFirst({
        where: { userId, name: c.name },
        select: { id: true },
      });
      if (existing) {
        categoryIds.set(c.name, existing.id);
      } else {
        const created = await prisma.category.create({
          data: {
            userId,
            name: c.name,
            type: toCategoryType(c.type),
            icon: c.icon || "Wallet",
            color: c.color || "#64748b",
          },
          select: { id: true, name: true },
        });
        categoryIds.set(created.name, created.id);
      }
    }
  }

  if (data.movements?.length) {
    for (const m of data.movements) {
      const categoryId = categoryIds.get(m.categoryName);
      if (!categoryId) continue;
      await prisma.movement.create({
        data: {
          userId,
          categoryId,
          date: new Date(m.date),
          concept: m.concept || "",
          type: toMovementType(m.type),
          amount: m.amount,
          paymentMethod: m.paymentMethod ?? null,
        },
      });
    }
  }

  if (data.budgets?.length) {
    for (const b of data.budgets) {
      const categoryId = categoryIds.get(b.categoryName);
      if (!categoryId) continue;
      await prisma.budget.upsert({
        where: {
          userId_categoryId_period: { userId, categoryId, period: b.period },
        },
        create: {
          userId,
          categoryId,
          limit: b.limit,
          spent: mode === "replace" ? b.spent : 0,
          period: b.period,
        },
        update: { limit: b.limit },
      });
    }
  }

  if (data.goals?.length) {
    for (const g of data.goals) {
      await prisma.goal.create({
        data: {
          userId,
          title: g.title,
          target: g.target,
          saved: mode === "replace" ? g.saved : 0,
          type: toGoalType(g.type),
          dueDate: new Date(g.dueDate),
          description: g.description ?? null,
          milestones: Array.isArray(g.milestones) ? g.milestones : null,
        },
      });
    }
  }

  return NextResponse.json({ data: { restored: true } });
}
