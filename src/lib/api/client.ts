"use client";

import { getUserId } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ApiRequestOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const { json, headers, ...rest } = options;
  const userId = typeof window !== "undefined" ? getUserId() : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(headers ?? {}),
    },
    body: json ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error ?? parsed.message ?? text;
    } catch {
      if (text.startsWith("<") || text.includes("<!DOCTYPE")) {
        message = `El servidor respondió con una página de error (${response.status}). Comprueba que la app esté desplegada y que la base de datos esté configurada.`;
      }
    }
    const fallback =
      response.status === 401
        ? "No autorizado. Vuelve a iniciar sesión."
        : response.status === 500
          ? "Error del servidor. Revisa la consola del servidor o los logs de Vercel."
          : "Error en la petición";
    throw new Error((message && String(message).trim()) || fallback);
  }

  return (await response.json()) as T;
}
