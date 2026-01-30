import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/app/api/_helpers";
import { encryptToken } from "@/lib/notion/encryption";
import { validateNotionToken } from "@/lib/notion/client";

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  try {
    const integration = await prisma.notionIntegration.findUnique({
      where: { userId },
      select: {
        id: true,
        databaseId: true,
        lastSyncAt: true,
        syncInterval: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        // No devolver el token por seguridad
      },
    });

    if (!integration) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: integration });
  } catch (error) {
    console.error("Error fetching Notion integration:", error);
    return jsonError("Error al obtener la configuración", 500);
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  let payload: {
    integrationToken: string;
    databaseId: string;
    syncInterval?: number;
    enabled?: boolean;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonError("Payload inválido");
  }

  const { integrationToken, databaseId, syncInterval, enabled } = payload;

  if (!databaseId?.trim()) {
    return jsonError("El ID de la base de datos es obligatorio");
  }

  const existing = await prisma.notionIntegration.findUnique({
    where: { userId },
  });

  // Al crear nueva integración, el token es obligatorio
  if (!existing && (!integrationToken || !integrationToken.trim())) {
    return jsonError("El token de integración es obligatorio al conectar por primera vez");
  }

  // Al actualizar: si no envían token, mantener el actual
  let encryptedToken: string | undefined;
  if (integrationToken?.trim()) {
    try {
      const isValid = await validateNotionToken(integrationToken);
      if (!isValid) {
        return jsonError("Token de Notion inválido", 400);
      }
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
      return jsonError(errorMessage, 400);
    }
    encryptedToken = encryptToken(integrationToken);
  } else if (existing) {
    encryptedToken = existing.integrationToken;
  }

  try {
    const integration = await prisma.notionIntegration.upsert({
      where: { userId },
      create: {
        userId,
        integrationToken: encryptedToken!,
        databaseId: databaseId.trim(),
        syncInterval: syncInterval ?? 60,
        enabled: enabled ?? true,
      },
      update: {
        ...(encryptedToken != null && { integrationToken: encryptedToken }),
        databaseId: databaseId.trim(),
        syncInterval: syncInterval ?? undefined,
        enabled: enabled ?? undefined,
      },
    });

    return NextResponse.json({
      data: {
        id: integration.id,
        databaseId: integration.databaseId,
        syncInterval: integration.syncInterval,
        enabled: integration.enabled,
        lastSyncAt: integration.lastSyncAt,
      },
    });
  } catch (error) {
    console.error("Error saving Notion integration:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Mensajes de error más específicos
    if (errorMessage.includes("P2002") || errorMessage.includes("Unique constraint")) {
      return jsonError("Ya existe una integración para este usuario", 409);
    }
    if (errorMessage.includes("NOTION_ENCRYPTION_KEY")) {
      return jsonError("Error de configuración del servidor. Contacta al administrador.", 500);
    }
    if (errorMessage.includes("Prisma") || errorMessage.includes("model") || errorMessage.includes("table")) {
      return jsonError("Error de base de datos. Asegúrate de ejecutar las migraciones.", 500);
    }
    
    return jsonError(`Error al guardar la configuración: ${errorMessage}`, 500);
  }
}

export async function DELETE(request: Request) {
  const userId = getUserId(request);
  if (!userId) return jsonError("No autorizado", 401);

  try {
    await prisma.notionIntegration.delete({
      where: { userId },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting Notion integration:", error);
    return jsonError("Error al eliminar la configuración", 500);
  }
}
