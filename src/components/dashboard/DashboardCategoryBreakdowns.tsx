"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { AssetsDistributionManager } from "@/components/dashboard/AssetsDistributionManager";
import { gastosPorCategoriaDesdeMovimientos, scaleCategoriesToTotal, sumFilteredMonths, filterMonthsByPeriod, percentChangeByPeriod } from "@/lib/dashboard/selectors";
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
  const { period, getMonthCount } = usePeriod();
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
    const totalPeriod = sumFilteredMonths(data.gastosMensuales, monthCount);

    const fromMovs = gastosPorCategoriaDesdeMovimientos(data.movimientos);
    const scaled = scaleCategoriesToTotal(fromMovs.length ? fromMovs : base, totalPeriod);
    return scaled;
  }, [data, period, getMonthCount]);

  // Calcular % de cambio según el período
  const gastosPercentChange = useMemo(() => {
    const monthCount = getMonthCount();
    return percentChangeByPeriod(data.gastosMensuales, data.gastosMensuales, monthCount);
  }, [data, period, getMonthCount]);

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
    <div key={`category-breakdown-${period}`}>
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

