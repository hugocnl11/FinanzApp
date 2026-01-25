import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { CategoryType } from "@prisma/client";

type CategoryPayload = {
  name?: string;
  type?: string;
  icon?: string;
  color?: string;
  active?: boolean;
};

const toCategoryType = (value: string): CategoryType | null => {
  const normalized = value.toLowerCase();
  if (normalized === "income") return "INCOME";
  if (normalized === "expense") return "EXPENSE";
  if (normalized === "investment") return "INVESTMENT";
  if (normalized === "savings" || normalized === "ahorro") return "SAVINGS";
  return null;
};

const fromCategoryType = (value: CategoryType) => {
  if (value === "INCOME") return "income";
  if (value === "EXPENSE") return "expense";
  if (value === "INVESTMENT") return "investment";
  return "savings";
};

export async function PUT(request: Request, context: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: CategoryPayload;
  try {
    payload = (await request.json()) as CategoryPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: Record<string, unknown> = {};
  if (payload.name) data.name = payload.name;
  if (payload.type) {
    const mappedType = toCategoryType(payload.type);
    if (!mappedType) return jsonError("Tipo de categoría inválido");
    data.type = mappedType;
  }
  if (payload.icon) data.icon = payload.icon;
  if (payload.color) data.color = payload.color;
  if (typeof payload.active === "boolean") data.active = payload.active;

  const updated = await prisma.category.updateMany({
    where: { id: context.params.id, userId },
    data,
  });

  if (!updated.count) return jsonError("Categoría no encontrada", 404);
  const category = await prisma.category.findUnique({ where: { id: context.params.id } });
  if (!category) return jsonError("Categoría no encontrada", 404);
  return NextResponse.json({ data: { ...category, type: fromCategoryType(category.type) } });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const deleted = await prisma.category.deleteMany({
    where: { id: context.params.id, userId },
  });
  if (!deleted.count) return jsonError("Categoría no encontrada", 404);
  return NextResponse.json({ data: { success: true } });
}
