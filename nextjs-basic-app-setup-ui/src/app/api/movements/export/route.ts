import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import type { MovementType, Prisma } from "@prisma/client";

const fromMovementType = (value: MovementType) => {
  if (value === "INCOME") return "Ingreso";
  if (value === "EXPENSE") return "Gasto";
  if (value === "INVESTMENT") return "Inversión";
  return "Ahorro";
};

type MovementWithCategory = Prisma.MovementGetPayload<{
  include: { category: true };
}>;

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  const movements = await prisma.movement.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });

  if (format === "csv") {
    const headers = ["fecha", "concepto", "categoria", "tipo", "cantidad", "metodoPago"];
    const rows = (movements as MovementWithCategory[]).map((m) => [
      m.date.toISOString().slice(0, 10),
      m.concept,
      m.category.name,
      fromMovementType(m.type),
      Number(m.amount),
      m.paymentMethod ?? "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\n");
    const filename = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return jsonError("Formato no soportado. Use format=csv.", 400);
}
