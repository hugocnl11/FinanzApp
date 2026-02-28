import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalMovimientos, totalUsuarios, byUserAndType] = await Promise.all([
      prisma.movement.count(),
      prisma.user.count(),
      prisma.movement.groupBy({
        by: ["userId", "type"],
        _sum: { amount: true },
        where: { type: { in: ["INCOME", "EXPENSE"] } },
      }),
    ]);

    const ingresosGastosPorUsuario = new Map<
      string,
      { ingresos: number; gastos: number }
    >();
    for (const row of byUserAndType) {
      const amount = Number(row._sum.amount ?? 0);
      const current = ingresosGastosPorUsuario.get(row.userId) ?? {
        ingresos: 0,
        gastos: 0,
      };
      if (row.type === "INCOME") current.ingresos += amount;
      if (row.type === "EXPENSE") current.gastos += amount;
      ingresosGastosPorUsuario.set(row.userId, current);
    }

    const tasas: number[] = [];
    for (const { ingresos, gastos } of ingresosGastosPorUsuario.values()) {
      if (ingresos > 0) {
        const tasa = ((ingresos - gastos) / ingresos) * 100;
        tasas.push(tasa);
      }
    }
    const ahorroMedioPorcentaje =
      tasas.length > 0
        ? Math.round((tasas.reduce((a, b) => a + b, 0) / tasas.length) * 10) / 10
        : null;

    const body = {
      totalMovimientos,
      totalUsuarios,
      ahorroMedioPorcentaje,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    console.error("GET /api/stats", e);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
