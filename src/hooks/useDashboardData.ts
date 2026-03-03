import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/lib/dashboard/types";
import { useDashboardDataContext } from "@/contexts/DashboardDataContext";
import { loadDashboardDataCore } from "@/contexts/DashboardDataContext";

const emptyData: DashboardData = {
  ingresosMensuales: [],
  gastosMensuales: [],
  activosPorMes: [],
  goal: null,
  goals: [],
  budgets: [],
  categories: [],
  notifications: [],
  recurringMovements: [],
  gastosPorCategoria: [],
  ingresosPorCategoria: [],
  distribucionActivos: [],
  movimientos: [],
};

export function useDashboardData() {
  const context = useDashboardDataContext();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    await loadDashboardDataCore({
      setData,
      setLoading,
      setError,
      isMounted: () => true,
    });
  }, []);

  useEffect(() => {
    if (context) return;
    loadData();
    const handler = () => void loadData();
    window.addEventListener("finanzapp:data-updated", handler);
    window.addEventListener("finanzapp:auth-changed", handler);
    return () => {
      window.removeEventListener("finanzapp:data-updated", handler);
      window.removeEventListener("finanzapp:auth-changed", handler);
    };
  }, [loadData, context]);

  if (context) return context;
  return { data, loading, error, refresh: loadData };
}
