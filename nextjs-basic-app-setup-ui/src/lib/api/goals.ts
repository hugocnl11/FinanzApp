"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Goal } from "@/lib/dashboard/types";

export function fetchGoals() {
  return apiFetch<ApiResponse<Goal[]>>("/goals");
}

export function createGoal(payload: Goal) {
  return apiFetch<ApiResponse<Goal>>("/goals", { method: "POST", json: payload });
}

export function updateGoal(id: string, payload: Partial<Goal>) {
  return apiFetch<ApiResponse<Goal>>(`/goals/${id}`, { method: "PUT", json: payload });
}

export function deleteGoal(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/goals/${id}`, { method: "DELETE" });
}
