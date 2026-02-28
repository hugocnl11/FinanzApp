import { NextResponse } from "next/server";
import { getUserId, jsonError } from "@/app/api/_helpers";
import { syncNotionMovements } from "@/lib/notion/sync";

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  try {
    const result = await syncNotionMovements(userId);

    return NextResponse.json({
      data: {
        created: result.created,
        skipped: result.skipped,
        skippedDuplicates: result.skippedDuplicates,
        skippedMissingFields: result.skippedMissingFields,
        skippedMissingByField: result.skippedMissingByField,
        errors: result.errors,
        success: result.errors.length === 0,
      },
    });
  } catch (error) {
    console.error("Error syncing Notion movements:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return jsonError(`Error al sincronizar: ${errorMessage}`, 500);
  }
}
