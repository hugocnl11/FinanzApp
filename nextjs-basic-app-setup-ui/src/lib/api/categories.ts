"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Category } from "@/lib/dashboard/types";

export function fetchCategories() {
  return apiFetch<ApiResponse<Category[]>>("/categories");
}

export function createCategory(payload: Category) {
  return apiFetch<ApiResponse<Category>>("/categories", { method: "POST", json: payload });
}

export function updateCategory(id: string, payload: Partial<Category>) {
  return apiFetch<ApiResponse<Category>>(`/categories/${id}`, { method: "PUT", json: payload });
}

export function deleteCategory(id: string) {
  return apiFetch<ApiResponse<{ success: boolean }>>(`/categories/${id}`, { method: "DELETE" });
}
