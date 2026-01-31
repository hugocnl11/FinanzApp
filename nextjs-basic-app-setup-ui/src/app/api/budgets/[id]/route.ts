import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

type BudgetPayload = {
  categoryId?: string;
  category?: string;
  limit?: number;
  spent?: number;
  period?: string;
};

export async function PUT(request: Request, context: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: BudgetPayload;
  try {
    payload = (await request.json()) as BudgetPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: Record<string, unknown> = {};
  if (payload.categoryId) data.categoryId = payload.categoryId;
  if (typeof payload.limit === "number") data.limit = payload.limit;
  if (typeof payload.spent === "number") data.spent = payload.spent;
  if (payload.period) data.period = payload.period;

  if (payload.category && !payload.categoryId) {
    const category = await prisma.category.findFirst({
      where: { userId, name: payload.category },
      select: { id: true },
    });
    if (!category) return jsonError("Categoría no encontrada", 404);
    data.categoryId = category.id;
  }

  const updated = await prisma.budget.updateMany({
    where: { id: context.params.id, userId },
    data,
  });
  if (!updated.count) return jsonError("Presupuesto no encontrado", 404);
  const budget = await prisma.budget.findUnique({
    where: { id: context.params.id },
    include: { category: true },
  });
  if (!budget) return jsonError("Presupuesto no encontrado", 404);
  return NextResponse.json({
    data: {
      id: budget.id,
      category: budget.category.name,
      limit: Number(budget.limit),
      spent: Number(budget.spent),
      period: budget.period,
    },
  });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const deleted = await prisma.budget.deleteMany({
    where: { id: context.params.id, userId },
  });
  if (!deleted.count) return jsonError("Presupuesto no encontrado", 404);
  return NextResponse.json({ data: { success: true } });
}
