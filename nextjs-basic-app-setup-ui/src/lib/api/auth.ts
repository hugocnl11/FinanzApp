"use client";

import { apiFetch } from "./client";
import type { ApiResponse, AuthPayload, AuthResponse } from "./types";

export function login(payload: AuthPayload) {
  return apiFetch<ApiResponse<AuthResponse>>("/auth/login", { method: "POST", json: payload });
}

export function register(payload: AuthPayload) {
  return apiFetch<ApiResponse<AuthResponse>>("/auth/register", { method: "POST", json: payload });
}

export function forgotPassword(email: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>("/auth/forgot-password", {
    method: "POST",
    json: { email },
  });
}
