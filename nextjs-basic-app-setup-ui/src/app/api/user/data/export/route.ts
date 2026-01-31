import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const [categories, movements, budgets, goals] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, icon: true, color: true },
    }),
    prisma.movement.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { id: true, title: true, target: true, saved: true, type: true, dueDate: true, description: true, milestones: true },
    }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    categories: categories.map((c) => ({ name: c.name, type: c.type, icon: c.icon, color: c.color })),
    movements: movements.map((m) => ({
      date: m.date.toISOString().slice(0, 10),
      concept: m.concept,
      type: m.type,
      amount: Number(m.amount),
      paymentMethod: m.paymentMethod ?? undefined,
      categoryName: m.category.name,
    })),
    budgets: budgets.map((b) => ({
      categoryName: b.category.name,
      limit: Number(b.limit),
      spent: Number(b.spent),
      period: b.period,
    })),
    goals: goals.map((g) => ({
      title: g.title,
      target: Number(g.target),
      saved: Number(g.saved),
      type: g.type,
      dueDate: g.dueDate.toISOString().slice(0, 10),
      description: g.description ?? undefined,
      milestones: g.milestones ?? undefined,
    })),
  };

  return NextResponse.json({ data });
}
