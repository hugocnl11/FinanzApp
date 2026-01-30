import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncNotionMovements } from "@/lib/notion/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron job para sincronizar movimientos de Notion automáticamente
 * Se ejecuta según la configuración en vercel.json
 */
export async function GET(request: Request) {
  // Verificar que la solicitud viene de Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Obtener todas las integraciones activas
    const integrations = await prisma.notionIntegration.findMany({
      where: {
        enabled: true,
      },
      select: {
        userId: true,
        syncInterval: true,
        lastSyncAt: true,
      },
    });

    const results = [];

    for (const integration of integrations) {
      try {
        // Verificar si es momento de sincronizar
        const now = new Date();
        const lastSync = integration.lastSyncAt
          ? new Date(integration.lastSyncAt)
          : null;

        if (lastSync) {
          const minutesSinceLastSync =
            (now.getTime() - lastSync.getTime()) / (1000 * 60);
          if (minutesSinceLastSync < integration.syncInterval) {
            results.push({
              userId: integration.userId,
              status: "skipped",
              reason: "Not yet time to sync",
            });
            continue;
          }
        }

        // Sincronizar
        const syncResult = await syncNotionMovements(integration.userId);
        results.push({
          userId: integration.userId,
          status: "success",
          created: syncResult.created,
          skipped: syncResult.skipped,
          errors: syncResult.errors,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          userId: integration.userId,
          status: "error",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: integrations.length,
      results,
    });
  } catch (error) {
    console.error("Error in Notion sync cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
