"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { Movement } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";

export function fetchMovements() {
  // Si es usuario demo, devolver movimientos mockeados
  if (isDemoUser()) {
    return Promise.resolve({
      data: DASHBOARD_MOCK.movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        concepto: m.concepto,
        categoria: m.categoria,
        tipo: m.tipo as Movement["tipo"],
        cantidad: m.cantidad,
      })),
    } as ApiResponse<Movement[]>);
  }
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
