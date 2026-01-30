import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalMovimientos, totalUsuarios] = await Promise.all([
      prisma.movement.count(),
      prisma.user.count(),
    ]);

    const body = { totalMovimientos, totalUsuarios };

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
