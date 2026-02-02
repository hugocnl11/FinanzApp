"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";

export type AssetSnapshotLatest = {
  categoryId: string;
  categoryName: string;
  value: number;
  date: string;
};

export type AssetSnapshotByMonth = {
  mes: string;
  valor: number;
};

/** Snapshots del mes (para gráfica rentabilidad por día): date YYYY-MM-DD, categoryId, categoryName, value */
export type AssetSnapshotInMonth = {
  date: string;
  categoryId: string;
  categoryName: string;
  value: number;
};

export function fetchAssetSnapshotsLatest() {
  return apiFetch<ApiResponse<AssetSnapshotLatest[]>>("/asset-snapshots");
}

export function fetchAssetSnapshotsForDate(date: string) {
  return apiFetch<ApiResponse<AssetSnapshotLatest[]>>(
    `/asset-snapshots?date=${encodeURIComponent(date)}`
  );
}

export function fetchAssetSnapshotsByMonth(months = 12) {
  return apiFetch<ApiResponse<AssetSnapshotByMonth[]>>(
    `/asset-snapshots?months=${months}`
  );
}

/** GET ?month=YYYY-MM → todos los snapshots del mes (para gráfica rentabilidad por día) */
export function fetchAssetSnapshotsInMonth(month: string) {
  return apiFetch<ApiResponse<AssetSnapshotInMonth[]>>(
    `/asset-snapshots?month=${encodeURIComponent(month)}`
  );
}

export function createAssetSnapshot(payload: {
  categoryId: string;
  value: number;
  date?: string;
}) {
  return apiFetch<ApiResponse<AssetSnapshotLatest>>("/asset-snapshots", {
    method: "POST",
    json: payload,
  });
}
