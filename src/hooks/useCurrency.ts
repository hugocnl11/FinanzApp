"use client";

import { getSession } from "@/lib/auth";

/** Devuelve la moneda del usuario desde preferencias (EUR por defecto) */
export function useCurrency(): string {
  if (typeof window === "undefined") return "EUR";
  const prefs = getSession()?.user?.preferences as { currency?: string } | undefined;
  return prefs?.currency ?? "EUR";
}
