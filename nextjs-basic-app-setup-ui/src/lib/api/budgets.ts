"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Budget } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";

export function fetchBudgets() {
  // Si es usuario demo, devolver presupuestos mockeados
  if (isDemoUser()) {
    return Promise.resolve({
      data: DASHBOARD_MOCK.budgets,
    } as ApiResponse<Budget[]>);
  }
  return apiFetch<ApiResponse<Budget[]>>("/budgets");
}

export function createBudget(payload: Omit<Budget, "id">) {
  return apiFetch<ApiResponse<Budget>>("/budgets", { method: "POST", json: payload });
}

export function updateBudget(id: string, payload: Partial<Budget>) {
  return apiFetch<ApiResponse<Budget>>(`/budgets/${id}`, { method: "PUT", json: payload });
}

export function deleteBudget(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/budgets/${id}`, { method: "DELETE" });
}
