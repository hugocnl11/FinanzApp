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
