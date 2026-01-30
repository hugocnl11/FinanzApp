"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Link2, CheckCircle2, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";

interface NotionIntegration {
  id: string;
  databaseId: string;
  lastSyncAt: string | null;
  syncInterval: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function NotionIntegrationManager() {
  const [integration, setIntegration] = useState<NotionIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    integrationToken: "",
    databaseId: "",
    syncInterval: 60,
    enabled: true,
  });

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      setLoading(true);
      const response = await apiFetch<ApiResponse<NotionIntegration | null>>(
        "/notion/integration"
      );
      if (response.data) {
        setIntegration(response.data);
        setFormData({
          integrationToken: "", // No mostrar token por seguridad
          databaseId: response.data.databaseId,
          syncInterval: response.data.syncInterval,
          enabled: response.data.enabled,
        });
      }
    } catch (error) {
      console.error("Error loading integration:", error);
      setError("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.integrationToken && !integration) {
      setError("El token de integración es obligatorio");
      return;
    }

    if (!formData.databaseId) {
      setError("El ID de la base de datos es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiFetch<ApiResponse<NotionIntegration>>(
        "/notion/integration",
        {
          method: "POST",
          json: {
            integrationToken: formData.integrationToken || undefined,
            databaseId: formData.databaseId,
            syncInterval: formData.syncInterval,
            enabled: formData.enabled,
          },
        }
      );

      setIntegration(response.data);
      setSuccess("Configuración guardada correctamente");
      setFormData((prev) => ({ ...prev, integrationToken: "" })); // Limpiar token del formulario
    } catch (error) {
      console.error("Error saving integration:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      
      // Mostrar mensaje de error más descriptivo
      if (errorMessage.includes("migraciones") || errorMessage.includes("table") || errorMessage.includes("model")) {
        setError("Error: La base de datos no está actualizada. Ejecuta 'npx prisma migrate dev' primero.");
      } else {
        setError(errorMessage || "Error al guardar la configuración");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await apiFetch<
        ApiResponse<{
          created: number;
          skipped: number;
          skippedDuplicates?: number;
          skippedMissingFields?: number;
          skippedMissingByField?: { concept: number; type: number; amount: number; date: number; category: number };
          errors: string[];
          success: boolean;
        }>
      >("/notion/sync", {
        method: "POST",
      });

      const d = response.data;
      if (d.success) {
        const parts: string[] = [`${d.created} creados`];
        if (d.skipped > 0) {
          const dup = d.skippedDuplicates ?? 0;
          const missing = d.skippedMissingFields ?? 0;
          if (dup > 0) parts.push(`${dup} omitidos (ya existían)`);
          if (missing > 0) parts.push(`${missing} omitidos (datos incompletos)`);
          if (dup === 0 && missing === 0) parts.push(`${d.skipped} omitidos`);
        }
        let successMsg = `Sincronización completada: ${parts.join(", ")}`;
        const byField = d.skippedMissingByField;
        if ((d.skippedMissingFields ?? 0) > 0 && byField) {
          const labels: Record<string, string> = {
            concept: "Nombre",
            type: "Movimiento",
            amount: "Cantidad",
            date: "Fecha del gasto",
            category: "Categoría",
          };
          const main = (["concept", "type", "amount", "date", "category"] as const)
            .filter((k) => byField[k] > 0)
            .sort((a, b) => byField[b] - byField[a])[0];
          if (main) {
            successMsg += ` Falta principalmente: «${labels[main]}» (${byField[main]} filas). Revisa que esa columna exista y tenga el nombre exacto en Notion.`;
          } else {
            successMsg += " Revisa que las columnas en Notion se llamen: Nombre, Movimiento, Cantidad, Fecha del gasto, Método de pago, Categoría.";
          }
        }
        setSuccess(successMsg);
        await loadIntegration();
      } else {
        const errMsg = response.data.errors.join(" ");
        const isDbNotShared =
          /could not find database|shared with your integration|no está compartida/i.test(errMsg);
        setError(
          isDbNotShared
            ? "La base de datos no está compartida con tu integración. En Notion: abre la base de datos Tracker → menú «…» (arriba derecha) → «Añadir conexiones» o «Conectar con» → elige tu integración y vuelve a sincronizar."
            : errMsg
        );
      }
    } catch (error) {
      console.error("Error syncing:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar la integración con Notion?")) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await apiFetch("/notion/integration", {
        method: "DELETE",
      });

      setIntegration(null);
      setFormData({
        integrationToken: "",
        databaseId: "",
        syncInterval: 60,
        enabled: true,
      });
      setSuccess("Integración eliminada correctamente");
    } catch (error) {
      console.error("Error deleting integration:", error);
      setError("Error al eliminar la integración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold">Integración con Notion</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="space-y-3">
        <Input
          label="Token de Integración de Notion"
          type="password"
          placeholder={integration ? "••••••••" : "secret_..."}
          value={formData.integrationToken}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              integrationToken: e.target.value,
            }))
          }
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Obtén tu token desde{" "}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Notion Integrations
          </a>
        </p>

        <Input
          label="ID de Base de Datos (Tracker)"
          type="text"
          placeholder="abc123def456..."
          value={formData.databaseId}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              databaseId: e.target.value,
            }))
          }
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          El ID se encuentra en la URL de tu base de datos de Notion. Recuerda compartir esa base de datos con tu integración (menú «…» → Añadir conexiones).
        </p>

        <Input
          label="Intervalo de Sincronización (minutos)"
          type="number"
          min="1"
          max="1440"
          value={formData.syncInterval}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              syncInterval: Math.max(1, parseInt(e.target.value) || 60),
            }))
          }
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Con intervalo 1 minuto, los registros nuevos en Notion se reflejan en la app en aproximadamente 1 minuto (el cron se ejecuta cada minuto).
        </p>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm font-medium">Sincronización automática</span>
          <Button
            variant={formData.enabled ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            disabled={saving}
          >
            {formData.enabled ? "Activada" : "Desactivada"}
          </Button>
        </div>
      </div>

      {integration && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            {integration.enabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              Estado: {integration.enabled ? "Conectado" : "Desconectado"}
            </span>
          </div>
          {integration.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Última sincronización:{" "}
              {new Date(integration.lastSyncAt).toLocaleString("es-ES")}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || syncing}
          className="flex-1"
        >
          {saving ? (
            <>
              <Spinner className="mr-2" />
              Guardando...
            </>
          ) : integration ? (
            "Actualizar Configuración"
          ) : (
            "Conectar con Notion"
          )}
        </Button>

        {integration && (
          <>
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={saving || syncing}
            >
              {syncing ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || syncing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
