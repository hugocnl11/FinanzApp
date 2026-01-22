"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";
import type { DashboardData } from "@/lib/dashboard/types";
import { gastosPorCategoriaDesdeMovimientos, scaleCategoriesToTotal, sumFilteredMonths, filterMonthsByPeriod, percentChangeByPeriod } from "@/lib/dashboard/selectors";
import { loadFromStorage } from "@/lib/storage";
import type { CategoryIconKey } from "@/lib/category-icons";
import { usePeriod } from "@/contexts/PeriodContext";
import { motion } from "framer-motion";

type CategoryItem = {
  name: string;
  icon: CategoryIconKey;
  color: string;
};

type DashboardCategoryBreakdownsProps = {
  data?: DashboardData;
  type?: "expenses" | "assets";
};

export function DashboardCategoryBreakdowns({ data = DASHBOARD_MOCK, type = "expenses" }: DashboardCategoryBreakdownsProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const { period, getMonthCount } = usePeriod();

  useEffect(() => {
    const stored = loadFromStorage<CategoryItem[]>("categories", []);
    if (stored.length > 0) {
      setCategories(stored);
    }
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

