"use client";

import { apiFetch } from "./client";
import type { ApiResponse, AuthPayload, AuthResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Restaura la sesión desde la cookie (útil tras limpiar caché/localStorage). */
export async function restoreSessionFromCookie(): Promise<AuthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<AuthResponse>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function login(payload: AuthPayload) {
  return apiFetch<ApiResponse<AuthResponse>>("/auth", {
    method: "POST",
    json: { ...payload, mode: "login" },
  });
}

export function register(payload: AuthPayload) {
  return apiFetch<ApiResponse<AuthResponse>>("/auth", {
    method: "POST",
    json: { ...payload, mode: "register" },
  });
}

export function forgotPassword(email: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>("/auth/forgot-password", {
    method: "POST",
    json: { email },
  });
}

export function resendVerification(email: string) {
  return apiFetch<ApiResponse<{ sent: boolean }>>("/auth/resend-verification", {
    method: "POST",
    json: { email },
  });
}

export async function logout(): Promise<void> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

export type ProfileUpdatePayload = { name?: string; email?: string; image?: string | null };

export async function updateProfile(payload: ProfileUpdatePayload) {
  return apiFetch<ApiResponse<{ user: { id: string; name: string; email: string; image?: string } }>>("/user", {
    method: "PATCH",
    json: payload,
  });
}
