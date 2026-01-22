"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ApiRequestOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const { json, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
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
