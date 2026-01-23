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
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(headers ?? {}),
    },
    body: json ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Error en la petición");
  }

  return (await response.json()) as T;
}
