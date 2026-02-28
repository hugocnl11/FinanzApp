"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { getSession, isDemoUser, saveSession } from "@/lib/auth";
import { restoreSessionFromCookie } from "@/lib/api/auth";

/**
 * Sincroniza preferencias del usuario desde la API (incl. tema) y aplica el tema guardado.
 * Se ejecuta en el dashboard para usuarios reales (no demo).
 */
export function UserPreferencesSync() {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (isDemoUser()) return;

    let cancelled = false;

    (async () => {
      const data = await restoreSessionFromCookie();
      if (cancelled || !data) return;
      saveSession(data);
      const prefs = data.user?.preferences as { theme?: "light" | "dark" | "system" } | undefined;
      if (prefs?.theme && !applied.current) {
        applied.current = true;
        setTheme(prefs.theme);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  // Aplicar tema desde sesión ya cargada (p. ej. tras login)
  useEffect(() => {
    if (isDemoUser()) return;
    const session = getSession();
    const prefs = session?.user?.preferences as { theme?: "light" | "dark" | "system" } | undefined;
    if (prefs?.theme && !applied.current) {
      applied.current = true;
      setTheme(prefs.theme);
    }
  }, [setTheme]);

  return null;
}
