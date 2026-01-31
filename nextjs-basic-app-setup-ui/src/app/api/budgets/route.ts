import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

type BudgetPayload = {
  categoryId?: string;
  category?: string;
  limit: number;
  spent?: number;
  period: string;
};

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  try {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    if (today.getDate() === 1) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastVariableBudgetResetMonth: true },
      });
      if (user?.lastVariableBudgetResetMonth !== currentMonthStr) {
        await prisma.budget.deleteMany({
          where: { userId, period: "variable" },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { lastVariableBudgetResetMonth: currentMonthStr },
        });
      }
    }

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    return NextResponse.json({
      data: budgets.map((budget) => ({
        id: budget.id,
        category: budget.category.name,
        limit: Number(budget.limit),
        spent: Number(budget.spent),
        period: budget.period,
      })),
    });
  } catch (e) {
    throw e;
  }
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: BudgetPayload;
  try {
    payload = (await request.json()) as BudgetPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { categoryId, category, limit, spent, period } = payload;
  if ((!categoryId && !category) || typeof limit !== "number" || !period) {
    return jsonError("Campos requeridos: categoryId/category, limit, period");
  }

  let resolvedCategoryId = categoryId ?? null;
  if (!resolvedCategoryId && category) {
    const found = await prisma.category.findFirst({
      where: { userId, name: category },
      select: { id: true },
    });
    resolvedCategoryId = found?.id ?? null;
  }
  if (!resolvedCategoryId) return jsonError("Categoría no encontrada", 404);

  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: resolvedCategoryId,
      limit,
      spent: spent ?? 0,
      period,
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      data: {
        id: budget.id,
        category: budget.category.name,
        limit: Number(budget.limit),
        spent: Number(budget.spent),
        period: budget.period,
      },
    },
    { status: 201 }
  );
}
