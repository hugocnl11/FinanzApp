import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

const NOTE_MAX_LENGTH = 200;

type PatchPayload = {
  fromDate?: string;
  toDate?: string | null;
  amount?: number;
  note?: string | null;
};

function entryToJson(entry: { id: string; fromDate: Date; toDate: Date | null; amount: unknown; note: string | null }) {
  return {
    id: entry.id,
    fromDate: entry.fromDate.toISOString().slice(0, 10),
    toDate: entry.toDate ? entry.toDate.toISOString().slice(0, 10) : null,
    amount: Number(entry.amount),
    note: entry.note ?? undefined,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  const { id } = await context.params;
  const existing = await prisma.salaryEntry.findFirst({
    where: { id, userId },
  });
  if (!existing) return jsonError("Entrada no encontrada", 404);

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: { fromDate?: Date; toDate?: Date | null; amount?: number; note?: string | null } = {};

  if (payload.fromDate !== undefined) {
    const from = new Date(payload.fromDate);
    if (Number.isNaN(from.getTime())) return jsonError("fromDate debe ser una fecha válida");
    data.fromDate = from;
  }
  if (payload.toDate !== undefined) {
    if (payload.toDate == null || payload.toDate === "") {
      data.toDate = null;
    } else {
      const to = new Date(payload.toDate);
      if (Number.isNaN(to.getTime())) return jsonError("toDate debe ser una fecha válida");
      const from = data.fromDate ?? existing.fromDate;
      if (to < from) return jsonError("toDate no puede ser anterior a fromDate");
      data.toDate = to;
    }
  }
  if (typeof payload.amount === "number") {
    if (payload.amount <= 0) return jsonError("amount debe ser un número positivo");
    data.amount = Math.round(payload.amount * 100) / 100;
  }
  if (payload.note !== undefined) {
    const noteTrimmed = typeof payload.note === "string" ? payload.note.trim().slice(0, NOTE_MAX_LENGTH) : "";
    data.note = noteTrimmed === "" ? null : noteTrimmed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ data: entryToJson(existing) });
  }

  const entry = await prisma.salaryEntry.update({
    where: { id, userId },
    data,
  });
  return NextResponse.json({ data: entryToJson(entry) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  const { id } = await context.params;
  const deleted = await prisma.salaryEntry.deleteMany({
    where: { id, userId },
  });
  if (!deleted.count) return jsonError("Entrada no encontrada", 404);
  return NextResponse.json({ data: { success: true } });
}
