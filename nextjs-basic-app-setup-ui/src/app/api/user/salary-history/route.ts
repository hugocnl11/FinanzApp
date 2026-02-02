import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

const NOTE_MAX_LENGTH = 200;

type PostPayload = {
  fromDate: string;
  toDate?: string | null;
  amount: number;
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

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  const entries = await prisma.salaryEntry.findMany({
    where: { userId },
    orderBy: { fromDate: "asc" },
  });
  return NextResponse.json({
    data: { entries: entries.map(entryToJson) },
  });
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No hay sesión", 401);

  let payload: PostPayload;
  try {
    payload = (await request.json()) as PostPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { fromDate, toDate, amount, note } = payload;
  if (!fromDate || typeof fromDate !== "string") return jsonError("fromDate es obligatorio");
  const from = new Date(fromDate);
  if (Number.isNaN(from.getTime())) return jsonError("fromDate debe ser una fecha válida");
  if (typeof amount !== "number" || amount <= 0) return jsonError("amount debe ser un número positivo");
  const amountRounded = Math.round(amount * 100) / 100;
  if (amountRounded <= 0) return jsonError("amount debe ser mayor que 0");

  let to: Date | null = null;
  if (toDate != null && toDate !== "") {
    to = new Date(toDate);
    if (Number.isNaN(to.getTime())) return jsonError("toDate debe ser una fecha válida");
    if (to < from) return jsonError("toDate no puede ser anterior a fromDate");
  }

  const noteTrimmed = note != null && typeof note === "string" ? note.trim().slice(0, NOTE_MAX_LENGTH) : null;
  const noteFinal = noteTrimmed === "" ? null : noteTrimmed;

  const entry = await prisma.salaryEntry.create({
    data: {
      userId,
      fromDate: from,
      toDate: to,
      amount: amountRounded,
      note: noteFinal,
    },
  });

  return NextResponse.json({ data: entryToJson(entry) }, { status: 201 });
}
