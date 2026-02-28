"use client";

import { useEffect, useRef } from "react";
import { getUserId } from "@/lib/auth";

const POLL_INTERVAL_MS = 60_000; // 1 minuto

/**
 * En local el cron de Vercel no corre. Este componente llama a la sincronización
 * con Notion cada minuto cuando el dashboard está abierto, para que los
 * movimientos nuevos aparezcan sin tener que pulsar "Sincronizar ahora".
 */
export function NotionSyncPoller() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const sync = async () => {
      try {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${base}/api/notion/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { created?: number } };
        if (json?.data && (json.data.created ?? 0) > 0) {
          window.dispatchEvent(new Event("finanzapp:data-updated"));
        }
      } catch {
        // Ignorar errores (ej. sin integración Notion)
      }
    };

    const initialDelay = setTimeout(sync, 5000);
    intervalRef.current = setInterval(sync, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
