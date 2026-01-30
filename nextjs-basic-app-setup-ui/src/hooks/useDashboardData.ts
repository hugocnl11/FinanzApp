import { useCallback, useEffect, useState } from "react";
import type { DashboardData, Goal, Movement } from "@/lib/dashboard/types";
import { fetchMovements } from "@/lib/api/movements";
import { fetchBudgets } from "@/lib/api/budgets";
import { fetchGoals } from "@/lib/api/goals";
import { fetchAssetSnapshotsByMonth } from "@/lib/api/asset-snapshots";
import { buildMonthlySeries, latestByCategory, totalsByCategory } from "@/lib/dashboard/derive";
import { getSession, isDemoUser, saveSession } from "@/lib/auth";
import { restoreSessionFromCookie } from "@/lib/api/auth";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";

const emptyData: DashboardData = {
  ingresosMensuales: [],
  gastosMensuales: [],
  activosPorMes: [],
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
    let session = getSession();
    if (!session && typeof window !== "undefined") {
      const restored = await restoreSessionFromCookie();
      if (restored) {
        saveSession(restored);
        session = getSession();
      }
    }
    if (!session) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    // Si es usuario demo, usar datos mockeados
    if (isDemoUser()) {
      try {
        setLoading(true);
        setError(null);
        // Los datos mockeados ya están en el formato Movement correcto
        const mockMovements: Movement[] = DASHBOARD_MOCK.movimientos.map((m) => ({
          id: m.id,
          fecha: m.fecha,
          concepto: m.concepto,
          categoria: m.categoria,
          tipo: m.tipo as Movement["tipo"],
          cantidad: m.cantidad,
        }));

        // Calcular series mensuales desde los movimientos para consistencia
        const ingresosMensuales = buildMonthlySeries(mockMovements, "Ingreso", 12);
        const gastosMensuales = buildMonthlySeries(mockMovements, "Gasto", 12);
        // Calcular totales por categoría desde los movimientos
        const ingresosPorCategoria = totalsByCategory(mockMovements, "Ingreso");
        const gastosPorCategoria = totalsByCategory(mockMovements, "Gasto");
        const inversiones = latestByCategory(mockMovements, "Inversión");
        const ahorros = latestByCategory(mockMovements, "Ahorro");
        const distribucionActivos = Array.from(
          [...inversiones, ...ahorros].reduce((acc, item) => {
            acc.set(item.name, (acc.get(item.name) ?? 0) + item.value);
            return acc;
          }, new Map<string, number>())
        )
          .map(([name, value]) => ({ name, value }))
          .filter((item) => item.value > 0);

        const mockGoals: Goal[] = DASHBOARD_MOCK.goals.map((g) => ({
          id: g.id,
          title: g.title,
          target: g.target,
          saved: g.saved,
          type: g.type as Goal["type"],
          dueDate: g.dueDate,
          description: g.description,
        }));

        const primaryGoalId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("finanzapp:primary-goal")
            : null;
        const selectedGoal =
          mockGoals.find((goal) => goal.id === primaryGoalId) ?? mockGoals[0] ?? null;

        setData({
          ingresosMensuales,
          gastosMensuales,
          activosPorMes: [],
          goal: selectedGoal,
          goals: mockGoals,
          budgets: DASHBOARD_MOCK.budgets,
          notifications: DASHBOARD_MOCK.notifications,
          recurringMovements: DASHBOARD_MOCK.recurringMovements.map((rm) => ({
            ...mockMovements.find((m) => m.id === rm.id)!,
            frequency: rm.frequency,
            nextDate: rm.nextDate,
          })),
          gastosPorCategoria,
          ingresosPorCategoria,
          distribucionActivos,
          movimientos: mockMovements,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error cargando datos";
        setError(message);
        setData(emptyData);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [movementsRes, budgetsRes, goalsRes, assetSnapshotsRes] = await Promise.all([
        fetchMovements(),
        fetchBudgets(),
        fetchGoals(),
        fetchAssetSnapshotsByMonth(12).catch(() => ({ data: [] as { mes: string; valor: number }[] })),
      ]);

      const movements = movementsRes.data;
      const goals = goalsRes.data;
      const activosPorMes = (assetSnapshotsRes.data ?? []).map((d) => ({ mes: d.mes as import("@/lib/dashboard/types").MonthLabel, valor: d.valor }));
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
        activosPorMes,
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
