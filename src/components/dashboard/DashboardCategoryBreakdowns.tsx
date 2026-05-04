"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { AssetsDistributionManager } from "@/components/dashboard/AssetsDistributionManager";
import {
  gastosPorCategoriaDesdeMovimientos,
  scaleCategoriesToTotal,
  sumMoneyByMonthForDashboard,
  percentChangeForDashboard,
  movimientosPorRango,
  resolveEndMonthIndex,
} from "@/lib/dashboard/selectors";

function monthKeyToRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}
import type { CategoryIconKey } from "@/lib/category-icons";
import { usePeriod } from "@/contexts/PeriodContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { fetchCategories } from "@/lib/api/categories";
import { getUserId } from "@/lib/auth";

type CategoryItem = {
  name: string;
  icon: CategoryIconKey;
  color: string;
};

type DashboardCategoryBreakdownsProps = {
  type?: "expenses" | "assets";
};

export function DashboardCategoryBreakdowns({ type = "expenses" }: DashboardCategoryBreakdownsProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const { period, getMonthCount, dashboardMonthKey } = usePeriod();
  const { data } = useDashboardData();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (!getUserId()) {
          setCategories([]);
          return;
        }
        const response = await fetchCategories();
        setCategories(response.data as CategoryItem[]);
      } catch {
        setCategories([]);
      }
    };
    void loadCategories();
    const handler = () => loadCategories();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  const categoryMeta = useMemo(() => {
    return categories.reduce<Record<string, { color: string; icon: CategoryIconKey }>>((acc, cat) => {
      acc[cat.name] = { color: cat.color, icon: cat.icon };
      return acc;
    }, {});
  }, [categories]);

  const gastosCategories = useMemo(() => {
    const base = data.gastosPorCategoria;
    const monthCount = getMonthCount();
    const endKey = dashboardMonthKey || undefined;
    const totalPeriod = sumMoneyByMonthForDashboard(data.gastosMensuales, monthCount, endKey);

    let movs = data.movimientos;
    const resolvedEnd =
      endKey ?? data.gastosMensuales[resolveEndMonthIndex(data.gastosMensuales, null)]?.monthKey;
    if (resolvedEnd) {
      if (monthCount === 1) {
        const { start, end } = monthKeyToRange(resolvedEnd);
        movs = movimientosPorRango(data.movimientos, start, end);
      } else {
        const endIdx = resolveEndMonthIndex(data.gastosMensuales, endKey);
        const firstKey = data.gastosMensuales[Math.max(0, endIdx - 11)]?.monthKey;
        if (firstKey) {
          const { start } = monthKeyToRange(firstKey);
          const { end } = monthKeyToRange(resolvedEnd);
          movs = movimientosPorRango(data.movimientos, start, end);
        }
      }
    }

    const fromMovs = gastosPorCategoriaDesdeMovimientos(movs);
    const scaled = scaleCategoriesToTotal(fromMovs.length ? fromMovs : base, totalPeriod);
    return scaled;
  }, [data, period, getMonthCount, dashboardMonthKey]);

  // Calcular % de cambio según el período
  const gastosPercentChange = useMemo(() => {
    const monthCount = getMonthCount();
    const endKey = dashboardMonthKey || undefined;
    return percentChangeForDashboard(data.gastosMensuales, monthCount, endKey);
  }, [data, period, getMonthCount, dashboardMonthKey]);

  const periodLabel = period === "Mes" ? "MES" : "AÑO";

  if (type === "assets") {
    return (
      <CategoryBreakdown
        title="Distribución de Activos"
        categories={data.distribucionActivos}
        categoryMeta={categoryMeta}
        headerRight={<AssetsDistributionManager />}
      />
    );
  }

  return (
    <div key={`category-breakdown-${period}-${dashboardMonthKey || "last"}`}>
      <CategoryBreakdown
        title="Gastos por Categoría"
        categories={gastosCategories}
        categoryMeta={categoryMeta}
        periodLabel={periodLabel}
        animationKey={`gastos-${period}`}
        percentChange={gastosPercentChange}
      />
    </div>
  );
}

