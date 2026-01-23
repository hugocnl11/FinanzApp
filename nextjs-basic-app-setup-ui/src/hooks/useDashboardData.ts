import { useCallback, useEffect, useState } from "react";
import type { DashboardData, Goal } from "@/lib/dashboard/types";
import { fetchMovements } from "@/lib/api/movements";
import { fetchBudgets } from "@/lib/api/budgets";
import { fetchGoals } from "@/lib/api/goals";
import { buildMonthlySeries, latestByCategory, totalsByCategory } from "@/lib/dashboard/derive";
import { getSession } from "@/lib/auth";

const emptyData: DashboardData = {
  ingresosMensuales: [],
  gastosMensuales: [],
  goal: null,
  goals: [],
  budgets: [],
  notifications: [],
  recurringMovements: [],
  gastosPorCategoria: [],
  ingresosPorCategoria: [],
  distribucionActivos: [],
  movimientos: [],
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [movementsRes, budgetsRes, goalsRes] = await Promise.all([
        fetchMovements(),
        fetchBudgets(),
        fetchGoals(),
      ]);

      const movements = movementsRes.data;
      const goals = goalsRes.data;
      const primaryGoalId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("finanzapp:primary-goal")
          : null;
      const selectedGoal =
        goals.find((goal) => goal.id === primaryGoalId) ?? goals[0] ?? null;

      const ingresosMensuales = buildMonthlySeries(movements, "Ingreso", 12);
      const gastosMensuales = buildMonthlySeries(movements, "Gasto", 12);

      const ingresosPorCategoria = totalsByCategory(movements, "Ingreso");
      const gastosPorCategoria = totalsByCategory(movements, "Gasto");
      const inversiones = latestByCategory(movements, "Inversión");
      const ahorros = latestByCategory(movements, "Ahorro");
      const distribucionActivos = Array.from(
        [...inversiones, ...ahorros].reduce((acc, item) => {
          acc.set(item.name, (acc.get(item.name) ?? 0) + item.value);
          return acc;
        }, new Map<string, number>())
      )
        .map(([name, value]) => ({ name, value }))
        .filter((item) => item.value > 0);

      setData({
        ingresosMensuales,
        gastosMensuales,
        goal: selectedGoal as Goal | null,
        goals,
        budgets: budgetsRes.data,
        notifications: [],
        recurringMovements: [],
        gastosPorCategoria,
        ingresosPorCategoria,
        distribucionActivos,
        movimientos: movements,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Error cargando datos";
      setError(message);
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("finanzapp:data-updated", handler);
    window.addEventListener("finanzapp:auth-changed", handler);
    return () => {
      window.removeEventListener("finanzapp:data-updated", handler);
      window.removeEventListener("finanzapp:auth-changed", handler);
    };
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
