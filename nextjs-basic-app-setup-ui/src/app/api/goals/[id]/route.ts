import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { GoalType } from "@prisma/client";

type GoalMilestonePayload = { date: string; amount: number };

type GoalPayload = {
  title?: string;
  target?: number;
  saved?: number;
  type?: string;
  dueDate?: string;
  description?: string;
  milestones?: GoalMilestonePayload[];
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

export async function PUT(request: Request, context: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: GoalPayload;
  try {
    payload = (await request.json()) as GoalPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: Record<string, unknown> = {};
  if (payload.title) data.title = payload.title;
  if (typeof payload.target === "number") data.target = payload.target;
  if (typeof payload.saved === "number") data.saved = payload.saved;
  if (payload.type) {
    const mappedType = toGoalType(payload.type);
    if (!mappedType) return jsonError("Tipo de objetivo inválido");
    data.type = mappedType;
  }
  if (payload.dueDate) data.dueDate = new Date(payload.dueDate);
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.milestones !== undefined) data.milestones = Array.isArray(payload.milestones) ? payload.milestones : null;

  const updated = await prisma.goal.updateMany({
    where: { id: context.params.id, userId },
    data,
  });
  if (!updated.count) return jsonError("Objetivo no encontrado", 404);
  const goal = await prisma.goal.findUnique({ where: { id: context.params.id } });
  if (!goal) return jsonError("Objetivo no encontrado", 404);
  return NextResponse.json({
    data: {
      id: goal.id,
      title: goal.title,
      target: Number(goal.target),
      saved: Number(goal.saved),
      type: fromGoalType(goal.type),
      dueDate: goal.dueDate.toISOString().slice(0, 10),
      description: goal.description ?? undefined,
      milestones: (goal.milestones as GoalMilestonePayload[] | null) ?? undefined,
    },
  });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const deleted = await prisma.goal.deleteMany({
    where: { id: context.params.id, userId },
  });
  if (!deleted.count) return jsonError("Objetivo no encontrado", 404);
  return NextResponse.json({ data: { success: true } });
}
