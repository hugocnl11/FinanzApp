"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchAssetSnapshotsInMonth } from "@/lib/api/asset-snapshots";
import type { AssetSnapshotInMonth } from "@/lib/api/asset-snapshots";
import type { MonthLabel } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";

const MONTH_LABELS: MonthLabel[] = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type AssetEvolutionPoint = { mes: MonthLabel; valor: number };

/**
 * Para cada categoría de activo, devuelve la serie mensual (últimos 12 meses).
 * Usa fetchAssetSnapshotsInMonth por mes y toma el último valor del mes por categoría.
 */
export function useAssetEvolutionByCategory(months = 12) {
  const [evolutionByCategory, setEvolutionByCategory] = useState<
    Map<string, AssetEvolutionPoint[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (typeof window !== "undefined" && isDemoUser()) {
      setEvolutionByCategory(new Map());
      setLoading(false);
      return;
    }
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      monthKeys.push(`${y}-${m}`);
    }

    try {
      const results = await Promise.all(
        monthKeys.map((key) =>
          fetchAssetSnapshotsInMonth(key).then((r) => ({ key, data: r.data ?? [] }))
        )
      );

      const byCategory = new Map<string, AssetEvolutionPoint[]>();

      results.forEach(({ key, data }, index) => {
        const [yearStr, monthStr] = key.split("-");
        const monthIndex = parseInt(monthStr, 10) - 1;
        const mes = MONTH_LABELS[monthIndex] ?? ("Mes" as MonthLabel);

        // Por categoría, quedarse con el último snapshot del mes (mayor fecha)
        const latestByCategoryInMonth = new Map<string, { value: number; date: string }>();
        (data as AssetSnapshotInMonth[]).forEach((s) => {
          const current = latestByCategoryInMonth.get(s.categoryId);
          if (!current || s.date > current.date) {
            latestByCategoryInMonth.set(s.categoryId, { value: s.value, date: s.date });
          }
        });

        latestByCategoryInMonth.forEach(({ value }, categoryId) => {
          let series = byCategory.get(categoryId);
          if (!series) {
            series = [];
            byCategory.set(categoryId, series);
          }
          series[index] = { mes, valor: value };
        });
      });

      // Rellenar huecos: si una categoría no tuvo snapshot en un mes, valor 0
      byCategory.forEach((series, categoryId) => {
        const filled: AssetEvolutionPoint[] = monthKeys.map((key, i) => {
          const monthIndex = parseInt(key.split("-")[1], 10) - 1;
          const mes = MONTH_LABELS[monthIndex] ?? ("Mes" as MonthLabel);
          return series[i] ?? { mes, valor: 0 };
        });
        byCategory.set(categoryId, filled);
      });

      setEvolutionByCategory(new Map(byCategory));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando evolución");
      setEvolutionByCategory(new Map());
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  return { evolutionByCategory, loading, error, refetch: load };
}
