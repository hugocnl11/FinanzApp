import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { WishlistColumn as PrismaWishlistColumn } from "@prisma/client";
import type { WishlistColumn } from "@/lib/dashboard/types";

const TO_PRISMA: Record<WishlistColumn, PrismaWishlistColumn> = {
  undecided: "UNDECIDED",
  short: "SHORT",
  medium: "MEDIUM",
  long: "LONG",
};

const FROM_PRISMA: Record<PrismaWishlistColumn, WishlistColumn> = {
  UNDECIDED: "undecided",
  SHORT: "short",
  MEDIUM: "medium",
  LONG: "long",
};

function toJson(item: {
  id: string;
  title: string;
  price: unknown;
  notes: string | null;
  column: PrismaWishlistColumn;
  sortOrder: number;
}) {
  return {
    id: item.id,
    title: item.title,
    price: Number(item.price),
    notes: item.notes ?? undefined,
    column: FROM_PRISMA[item.column],
    sortOrder: item.sortOrder,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");
  const params = await Promise.resolve(context.params);
  const id = params.id;

  let payload: { title?: string; price?: number; notes?: string | null; column?: WishlistColumn; sortOrder?: number };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonError("Payload inválido");
  }

  const data: Record<string, unknown> = {};
  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) return jsonError("El título no puede estar vacío");
    data.title = title;
  }
  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) return jsonError("El precio debe ser mayor que 0");
    data.price = price;
  }
  if (payload.notes !== undefined) data.notes = payload.notes?.trim() || null;
  if (payload.column && TO_PRISMA[payload.column]) data.column = TO_PRISMA[payload.column];
  if (typeof payload.sortOrder === "number") data.sortOrder = payload.sortOrder;

  if (payload.column && TO_PRISMA[payload.column] && payload.sortOrder === undefined) {
    const last = await prisma.wishlistItem.findFirst({
      where: { userId, column: TO_PRISMA[payload.column], id: { not: id } },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    data.sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  const updated = await prisma.wishlistItem.updateMany({
    where: { id, userId },
    data,
  });
  if (!updated.count) return jsonError("Objeto no encontrado", 404);
  const item = await prisma.wishlistItem.findUnique({ where: { id } });
  if (!item) return jsonError("Objeto no encontrado", 404);
  return NextResponse.json({ data: toJson(item) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");
  const params = await Promise.resolve(context.params);
  const id = params.id;

  const deleted = await prisma.wishlistItem.deleteMany({
    where: { id, userId },
  });
  if (!deleted.count) return jsonError("Objeto no encontrado", 404);
  return NextResponse.json({ data: { success: true } });
}
