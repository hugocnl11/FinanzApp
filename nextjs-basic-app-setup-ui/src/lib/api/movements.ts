"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Movement } from "@/lib/dashboard/types";

export function fetchMovements() {
  return apiFetch<ApiResponse<Movement[]>>("/movements");
}

export function createMovement(payload: Omit<Movement, "id">) {
  return apiFetch<ApiResponse<Movement>>("/movements", { method: "POST", json: payload });
}

export function updateMovement(id: string, payload: Partial<Movement>) {
  return apiFetch<ApiResponse<Movement>>(`/movements/${id}`, { method: "PUT", json: payload });
}

export function deleteMovement(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/movements/${id}`, { method: "DELETE" });
}
