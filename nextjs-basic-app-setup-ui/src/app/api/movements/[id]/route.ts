import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { MovementType } from "@/generated/prisma/client";

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

export async function PUT(request: Request, context: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: MovementPayload;
  try {
    payload = (await request.json()) as MovementPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: Record<string, unknown> = {};
  if (payload.categoryId) data.categoryId = payload.categoryId;
  if (payload.date || payload.fecha) data.date = new Date(payload.date ?? payload.fecha!);
  if (payload.concept || payload.concepto) data.concept = payload.concept ?? payload.concepto;
  if (payload.type || payload.tipo) {
    const mappedType = toMovementType(payload.type ?? payload.tipo!);
    if (!mappedType) return jsonError("Tipo de movimiento inválido");
    data.type = mappedType;
  }
  if (typeof payload.amount === "number" || typeof payload.cantidad === "number") {
    const rawAmount = (payload.amount ?? payload.cantidad) as number;
    const typeValue = (data.type as MovementType | undefined) ?? null;
    data.amount = typeValue === "EXPENSE" ? -Math.abs(rawAmount) : Math.abs(rawAmount);
  }

  if (payload.categoria && !payload.categoryId) {
    const category = await prisma.category.findFirst({
      where: { userId, name: payload.categoria },
      select: { id: true },
    });
    if (!category) return jsonError("Categoría no encontrada", 404);
    data.categoryId = category.id;
  }

  const updated = await prisma.movement.updateMany({
    where: { id: context.params.id, userId },
    data,
  });
  if (!updated.count) return jsonError("Movimiento no encontrado", 404);
  const movement = await prisma.movement.findUnique({
    where: { id: context.params.id },
    include: { category: true },
  });
  if (!movement) return jsonError("Movimiento no encontrado", 404);
  return NextResponse.json({
    data: {
      id: movement.id,
      fecha: movement.date.toISOString().slice(0, 10),
      concepto: movement.concept,
      categoria: movement.category.name,
      tipo: fromMovementType(movement.type),
      cantidad: Number(movement.amount),
    },
  });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const deleted = await prisma.movement.deleteMany({
    where: { id: context.params.id, userId },
  });
  if (!deleted.count) return jsonError("Movimiento no encontrado", 404);
  return NextResponse.json({ data: { success: true } });
}
