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
  const userId = getUserId(request);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/budgets/route.ts:GET',message:'GET entry',data:{hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
  // #endregion
  if (!userId) return jsonError("userId es obligatorio");

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/budgets/route.ts:GET',message:'GET success',data:{count:budgets.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    const err = e instanceof Error ? e : new Error(String(e));
    fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/budgets/route.ts:GET',message:'GET catch',data:{errorMessage:err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    throw e;
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
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
