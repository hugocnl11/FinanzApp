"use client";

import { apiFetch } from "./client";
import type { ApiResponse, SalaryEntry, SalaryEntryPayload } from "./types";

export async function fetchSalaryHistory(): Promise<SalaryEntry[]> {
  const res = await apiFetch<ApiResponse<{ entries: SalaryEntry[] }>>("/user/salary-history");
  return res.data.entries;
}

export async function createSalaryEntry(payload: SalaryEntryPayload): Promise<SalaryEntry> {
  const res = await apiFetch<ApiResponse<SalaryEntry>>("/user/salary-history", {
    method: "POST",
    json: payload,
  });
  return res.data;
}

export async function updateSalaryEntry(id: string, payload: Partial<SalaryEntryPayload>): Promise<SalaryEntry> {
  const res = await apiFetch<ApiResponse<SalaryEntry>>(`/user/salary-history/${id}`, {
    method: "PATCH",
    json: payload,
  });
  return res.data;
}

export async function deleteSalaryEntry(id: string): Promise<void> {
  await apiFetch<ApiResponse<{ success: boolean }>>(`/user/salary-history/${id}`, {
    method: "DELETE",
  });
}
