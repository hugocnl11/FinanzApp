"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Category } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";
import { DEMO_CATEGORIES } from "@/lib/dashboard/mock";

export function fetchCategories() {
  // Si es usuario demo, devolver categorías mockeadas
  if (isDemoUser()) {
    return Promise.resolve({
      data: DEMO_CATEGORIES.map((cat) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        active: cat.active,
      })),
    } as ApiResponse<Category[]>);
  }
  return apiFetch<ApiResponse<Category[]>>("/categories");
}

export function createCategory(payload: Omit<Category, "id">) {
  return apiFetch<ApiResponse<Category>>("/categories", { method: "POST", json: payload });
}

export function updateCategory(id: string, payload: Partial<Category>) {
  return apiFetch<ApiResponse<Category>>(`/categories/${id}`, { method: "PUT", json: payload });
}

export function deleteCategory(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/categories/${id}`, { method: "DELETE" });
}
