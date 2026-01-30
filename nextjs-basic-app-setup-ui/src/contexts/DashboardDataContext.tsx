"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

type DashboardDataContextValue = {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export async function loadDashboardDataCore(opts: {
  setData: (d: DashboardData) => void;
  setLoading: (b: boolean) => void;
  setError: (s: string | null) => void;
  isMounted: () => boolean;
}) {
  const { setData, setLoading, setError, isMounted } = opts;

  let session = getSession();
  if (!session && typeof window !== "undefined") {
    const restored = await restoreSessionFromCookie();
    if (restored) {
      saveSession(restored);
      session = getSession();
    }
  }
  if (!session) {
    if (isMounted()) {
      setData(emptyData);
      setLoading(false);
    }
    return;
  }

  if (isDemoUser()) {
    try {
      if (isMounted()) {
        setLoading(true);
        setError(null);
      }
      const mockMovements: Movement[] = DASHBOARD_MOCK.movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        concepto: m.concepto,
        categoria: m.categoria,
        tipo: m.tipo as Movement["tipo"],
        cantidad: m.cantidad,
      }));

      const ingresosMensuales = buildMonthlySeries(mockMovements, "Ingreso", 12);
      const gastosMensuales = buildMonthlySeries(mockMovements, "Gasto", 12);
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

      if (isMounted()) {
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
      }
    } catch (err) {
      if (isMounted()) {
        const message = err instanceof Error ? err.message : "Error cargando datos";
        setError(message);
        setData(emptyData);
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
    return;
  }

  try {
    if (isMounted()) {
      setLoading(true);
      setError(null);
    }
    const [movementsRes, budgetsRes, goalsRes, assetSnapshotsRes] = await Promise.all([
      fetchMovements(),
      fetchBudgets(),
      fetchGoals(),
      fetchAssetSnapshotsByMonth(12).catch(() => ({ data: [] as { mes: string; valor: number }[] })),
    ]);

    if (!isMounted()) return;

    const movements = movementsRes.data;
    const goals = goalsRes.data;
    const activosPorMes = (assetSnapshotsRes.data ?? []).map((d) => ({
      mes: d.mes as DashboardData["activosPorMes"][0]["mes"],
      valor: d.valor,
    }));
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

    if (isMounted()) {
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
    }
  } catch (err) {
    if (isMounted()) {
      const message = err instanceof Error ? err.message : "Error cargando datos";
      setError(message);
      setData(emptyData);
    }
  } finally {
    if (isMounted()) setLoading(false);
  }
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    await loadDashboardDataCore({
      setData,
      setLoading,
      setError,
      isMounted: () => mountedRef.current,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    const handler = () => void loadData();
    window.addEventListener("finanzapp:data-updated", handler);
    window.addEventListener("finanzapp:auth-changed", handler);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("finanzapp:data-updated", handler);
      window.removeEventListener("finanzapp:auth-changed", handler);
    };
  }, [loadData]);

  const value: DashboardDataContextValue = {
    data,
    loading,
    error,
    refresh: loadData,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardDataContext() {
  return useContext(DashboardDataContext);
}
