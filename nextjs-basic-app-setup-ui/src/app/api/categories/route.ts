import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { CategoryType } from "@prisma/client";

type CategoryPayload = {
  name: string;
  type: string;
  icon: string;
  color: string;
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

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    data: categories.map((category) => ({
      ...category,
      type: fromCategoryType(category.type),
    })),
  });
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: CategoryPayload;
  try {
    payload = (await request.json()) as CategoryPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { name, type, icon, color, active } = payload;
  if (!name || !type || !icon || !color) {
    return jsonError("Campos requeridos: name, type, icon, color");
  }

  const mappedType = toCategoryType(type);
  if (!mappedType) return jsonError("Tipo de categoría inválido");

  const category = await prisma.category.create({
    data: {
      userId,
      name,
      type: mappedType,
      icon,
      color,
      active: active ?? true,
    },
  });

  return NextResponse.json(
    { data: { ...category, type: fromCategoryType(category.type) } },
    { status: 201 }
  );
}
