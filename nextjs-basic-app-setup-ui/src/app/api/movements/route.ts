import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { MovementType, Prisma } from "@/generated/prisma/client";
 
type MovementPayload = {
  categoryId?: string;
  categoria?: string;
  date?: string;
  fecha?: string;
  concept?: string;
  concepto?: string;
  type?: string;
  tipo?: string;
  amount?: number;
  cantidad?: number;
};

const toMovementType = (value: string): MovementType | null => {
  const normalized = value.toLowerCase();
  if (normalized === "ingreso" || normalized === "income") return "INCOME";
  if (normalized === "gasto" || normalized === "expense") return "EXPENSE";
  if (normalized === "inversión" || normalized === "inversion" || normalized === "investment")
    return "INVESTMENT";
  if (normalized === "ahorro" || normalized === "savings") return "SAVINGS";
  return null;
};

const fromMovementType = (value: MovementType) => {
  if (value === "INCOME") return "Ingreso";
  if (value === "EXPENSE") return "Gasto";
  if (value === "INVESTMENT") return "Inversión";
  return "Ahorro";
};

type MovementWithCategory = Prisma.MovementGetPayload<{
  include: { category: true };
}>;

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const movements = await prisma.movement.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });
  return NextResponse.json({
    data: (movements as MovementWithCategory[]).map((movement) => ({
      id: movement.id,
      fecha: movement.date.toISOString().slice(0, 10),
      concepto: movement.concept,
      categoria: movement.category.name,
      tipo: fromMovementType(movement.type),
      cantidad: Number(movement.amount),
    })),
  });
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: MovementPayload;
  try {
    payload = (await request.json()) as MovementPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const categoryId = payload.categoryId;
  const categoryName = payload.categoria;
  const date = payload.date ?? payload.fecha;
  const concept = payload.concept ?? payload.concepto;
  const type = payload.type ?? payload.tipo;
  const amount = payload.amount ?? payload.cantidad;

  if (!date || !concept || !type || typeof amount !== "number") {
    return jsonError("Campos requeridos: date/fecha, concept/concepto, type/tipo, amount/cantidad");
  }

  const mappedType = toMovementType(type);
  if (!mappedType) return jsonError("Tipo de movimiento inválido");

  let resolvedCategoryId = categoryId ?? null;
  if (!resolvedCategoryId && categoryName) {
    const category = await prisma.category.findFirst({
      where: { userId, name: categoryName },
      select: { id: true },
    });
    resolvedCategoryId = category?.id ?? null;
  }

  if (!resolvedCategoryId) {
    return jsonError("categoryId o categoria es obligatorio");
  }

  const normalizedAmount =
    mappedType === "EXPENSE" ? -Math.abs(amount) : Math.abs(amount);

  const movement = await prisma.movement.create({
    data: {
      userId,
      categoryId: resolvedCategoryId,
      date: new Date(date),
      concept,
      type: mappedType,
      amount: normalizedAmount,
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      data: {
        id: movement.id,
        fecha: movement.date.toISOString().slice(0, 10),
        concepto: movement.concept,
        categoria: movement.category.name,
        tipo: fromMovementType(movement.type),
        cantidad: Number(movement.amount),
      },
    },
    { status: 201 }
  );
}
