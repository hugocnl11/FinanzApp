"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Budget } from "@/lib/dashboard/types";

export function fetchBudgets() {
  return apiFetch<ApiResponse<Budget[]>>("/budgets");
}

export function createBudget(payload: Budget) {
  return apiFetch<ApiResponse<Budget>>("/budgets", { method: "POST", json: payload });
}

export function updateBudget(id: string, payload: Partial<Budget>) {
  return apiFetch<ApiResponse<Budget>>(`/budgets/${id}`, { method: "PUT", json: payload });
}

export function deleteBudget(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/budgets/${id}`, { method: "DELETE" });
}
