import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { GoalType } from "@prisma/client";

type GoalPayload = {
  title: string;
  target: number;
  saved?: number;
  type: string;
  dueDate: string;
  description?: string;
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

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json({
    data: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      target: Number(goal.target),
      saved: Number(goal.saved),
      type: fromGoalType(goal.type),
      dueDate: goal.dueDate.toISOString().slice(0, 10),
      description: goal.description ?? undefined,
    })),
  });
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: GoalPayload;
  try {
    payload = (await request.json()) as GoalPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { title, target, saved, type, dueDate, description } = payload;
  if (!title || typeof target !== "number" || !type || !dueDate) {
    return jsonError("Campos requeridos: title, target, type, dueDate");
  }

  const mappedType = toGoalType(type);
  if (!mappedType) return jsonError("Tipo de objetivo inválido");

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      target,
      saved: saved ?? 0,
      type: mappedType,
      dueDate: new Date(dueDate),
      description,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: goal.id,
        title: goal.title,
        target: Number(goal.target),
        saved: Number(goal.saved),
        type: fromGoalType(goal.type),
        dueDate: goal.dueDate.toISOString().slice(0, 10),
        description: goal.description ?? undefined,
      },
    },
    { status: 201 }
  );
}
