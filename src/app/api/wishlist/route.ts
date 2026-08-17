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

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: [{ column: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ data: items.map(toJson) });
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: { title?: string; price?: number; notes?: string; column?: WishlistColumn };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonError("Payload inválido");
  }

  const title = payload.title?.trim();
  const price = Number(payload.price);
  if (!title || !Number.isFinite(price) || price <= 0) {
    return jsonError("Campos requeridos: title y price > 0");
  }

  const column = payload.column && TO_PRISMA[payload.column] ? payload.column : "undecided";
  const last = await prisma.wishlistItem.findFirst({
    where: { userId, column: TO_PRISMA[column] },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const item = await prisma.wishlistItem.create({
    data: {
      userId,
      title,
      price,
      notes: payload.notes?.trim() || null,
      column: TO_PRISMA[column],
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ data: toJson(item) }, { status: 201 });
}
