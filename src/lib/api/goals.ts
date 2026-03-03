"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Goal } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";

export function fetchGoals() {
  // Si es usuario demo, devolver objetivos mockeados
  if (isDemoUser()) {
    return Promise.resolve({
      data: DASHBOARD_MOCK.goals.map((g) => ({
        id: g.id,
        title: g.title,
        target: g.target,
        saved: g.saved,
        type: g.type as Goal["type"],
        dueDate: g.dueDate,
        description: g.description,
        milestones: g.milestones,
        linkedCategoryIds: (g as Goal).linkedCategoryIds,
        linkedBudgetId: (g as Goal).linkedBudgetId,
        isPrimary: (g as Goal).isPrimary ?? false,
        color: (g as Goal).color,
      })),
    } as ApiResponse<Goal[]>);
  }
  return apiFetch<ApiResponse<Goal[]>>("/goals");
}

export function createGoal(payload: Omit<Goal, "id">) {
  return apiFetch<ApiResponse<Goal>>("/goals", { method: "POST", json: payload });
}

export function updateGoal(id: string, payload: Partial<Goal>) {
  return apiFetch<ApiResponse<Goal>>(`/goals/${id}`, { method: "PUT", json: payload });
}

export function deleteGoal(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/goals/${id}`, { method: "DELETE" });
}
