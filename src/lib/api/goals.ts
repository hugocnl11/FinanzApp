"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Goal } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";

let demoGoalsStore: Goal[] | null = null;

function cloneDemoGoals(): Goal[] {
  return DASHBOARD_MOCK.goals.map((g) => ({
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
  }));
}

function getDemoGoalsStore(): Goal[] {
  if (!demoGoalsStore) {
    demoGoalsStore = cloneDemoGoals();
  }
  return demoGoalsStore;
}

export function fetchGoals() {
  if (isDemoUser()) {
    return Promise.resolve({
      data: getDemoGoalsStore().map((g) => ({ ...g })),
    } as ApiResponse<Goal[]>);
  }
  return apiFetch<ApiResponse<Goal[]>>("/goals");
}

export function createGoal(payload: Omit<Goal, "id">) {
  if (isDemoUser()) {
    const created: Goal = { id: `goal-${Date.now()}`, ...payload };
    getDemoGoalsStore().push(created);
    return Promise.resolve({ data: { ...created } } as ApiResponse<Goal>);
  }
  return apiFetch<ApiResponse<Goal>>("/goals", { method: "POST", json: payload });
}

export function updateGoal(id: string, payload: Partial<Goal>) {
  if (isDemoUser()) {
    const store = getDemoGoalsStore();
    const index = store.findIndex((g) => g.id === id);
    if (index >= 0) {
      store[index] = { ...store[index], ...payload, id };
      return Promise.resolve({ data: { ...store[index] } } as ApiResponse<Goal>);
    }
    const created: Goal = { id, title: "", target: 0, saved: 0, type: "ahorro", ...payload };
    store.push(created);
    return Promise.resolve({ data: { ...created } } as ApiResponse<Goal>);
  }
  return apiFetch<ApiResponse<Goal>>(`/goals/${id}`, { method: "PUT", json: payload });
}

export function deleteGoal(id: string) {
  if (isDemoUser()) {
    demoGoalsStore = getDemoGoalsStore().filter((g) => g.id !== id);
    return Promise.resolve({
      data: { success: true },
    } as ApiResponse<{ success: boolean }>);
  }
  return apiFetch<ApiResponse<{ success: boolean }>>(`/goals/${id}`, { method: "DELETE" });
}
