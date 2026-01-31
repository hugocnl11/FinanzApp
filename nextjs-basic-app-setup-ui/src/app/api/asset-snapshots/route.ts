import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  const { searchParams } = new URL(request.url);
  const monthsParam = searchParams.get("months");

  // GET ?months=12 → serie mensual de total activos (para evolución patrimonial)
  if (monthsParam) {
    const months = Math.min(12, Math.max(1, parseInt(monthsParam, 10) || 12));
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const allSnapshots = await prisma.assetSnapshot.findMany({
      where: { userId, date: { gte: startDate } },
      orderBy: { date: "asc" },
      select: { categoryId: true, value: true, date: true },
    });

    const series: { mes: string; valor: number }[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = MONTH_LABELS[endOfMonth.getMonth()];

      const upToEnd = allSnapshots.filter((s) => s.date <= endOfMonth);
      const latestByCategory = new Map<string, { value: number; date: Date }>();
      for (const s of upToEnd) {
        const existing = latestByCategory.get(s.categoryId);
        if (!existing || s.date > existing.date) {
          latestByCategory.set(s.categoryId, { value: Number(s.value), date: s.date });
        }
      }
      const total = Array.from(latestByCategory.values()).reduce((acc, x) => acc + x.value, 0);
      series.push({ mes: monthLabel, valor: total });
    }

    return NextResponse.json({ data: series });
  }

  // GET ?date=YYYY-MM-DD → valor por categoría para ese día (para editor de activos: valor actual del día)
  const dateParam = searchParams.get("date");
  if (dateParam) {
    const dateStr = dateParam.trim();
    const startOfDay = new Date(dateStr + "T00:00:00.000Z");
    const endOfDay = new Date(dateStr + "T23:59:59.999Z");
    if (Number.isNaN(startOfDay.getTime())) {
      return jsonError("Parámetro date inválido (usar YYYY-MM-DD)");
    }
    const snapshotsForDay = await prisma.assetSnapshot.findMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: "desc" },
      include: { category: true },
    });
    const onePerCategory = new Map<
      string,
      { categoryId: string; categoryName: string; value: number; date: string }
    >();
    for (const s of snapshotsForDay) {
      if (!onePerCategory.has(s.categoryId)) {
        onePerCategory.set(s.categoryId, {
          categoryId: s.categoryId,
          categoryName: s.category.name,
          value: Number(s.value),
          date: s.date.toISOString().slice(0, 10),
        });
      }
    }
    return NextResponse.json({
      data: Array.from(onePerCategory.values()),
    });
  }

  // GET sin params → último valor por categoría (compatibilidad con evolución patrimonial, etc.)
  const snapshots = await prisma.assetSnapshot.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });

  const latestByCategory = new Map<
    string,
    { categoryId: string; categoryName: string; value: number; date: string }
  >();
  for (const s of snapshots) {
    if (!latestByCategory.has(s.categoryId)) {
      latestByCategory.set(s.categoryId, {
        categoryId: s.categoryId,
        categoryName: s.category.name,
        value: Number(s.value),
        date: s.date.toISOString().slice(0, 10),
      });
    }
  }

  return NextResponse.json({
    data: Array.from(latestByCategory.values()),
  });
}

type PostPayload = {
  categoryId?: string;
  value: number;
  date?: string;
};

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("userId es obligatorio");

  let payload: PostPayload;
  try {
    payload = (await request.json()) as PostPayload;
  } catch {
    return jsonError("Payload inválido");
  }

  const { categoryId, value, date } = payload;
  if (!categoryId || typeof value !== "number" || value < 0) {
    return jsonError("categoryId y value (número >= 0) son obligatorios");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) return jsonError("Categoría no encontrada", 404);

  const dateObj = date ? new Date(date) : new Date();
  if (Number.isNaN(dateObj.getTime())) return jsonError("Fecha inválida");

  const snapshot = await prisma.assetSnapshot.create({
    data: {
      userId,
      categoryId,
      value,
      date: dateObj,
    },
    include: { category: true },
  });

  return NextResponse.json(
    {
      data: {
        id: snapshot.id,
        categoryId: snapshot.categoryId,
        categoryName: snapshot.category.name,
        value: Number(snapshot.value),
        date: snapshot.date.toISOString().slice(0, 10),
      },
    },
    { status: 201 }
  );
}
