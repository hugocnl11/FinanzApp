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
import { fetchCategories } from "@/lib/api/categories";
import { fetchAssetSnapshotsByMonth, fetchAssetSnapshotsForDate, fetchAssetSnapshotsLatest } from "@/lib/api/asset-snapshots";
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
    const today = new Date().toISOString().slice(0, 10);
    const [movementsRes, budgetsRes, goalsRes, categoriesRes, assetSnapshotsRes, snapshotsTodayRes, snapshotsLatestRes] = await Promise.all([
      fetchMovements(),
      fetchBudgets(),
      fetchGoals(),
      fetchCategories().catch(() => ({ data: [] })),
      fetchAssetSnapshotsByMonth(12).catch(() => ({ data: [] as { mes: string; valor: number }[] })),
      fetchAssetSnapshotsForDate(today).catch(() => ({ data: [] as { categoryId: string; categoryName: string; value: number; date?: string }[] })),
      fetchAssetSnapshotsLatest().catch(() => ({ data: [] as { categoryId: string; categoryName: string; value: number; date?: string }[] })),
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

    // Distribución de activos: usar todas las categorías de activos (inversión + ahorro) y priorizar
    // snapshot de hoy; si no hay snapshot, usar el valor del último movimiento. Así la gráfica de
    // tipo queso siempre refleja Acciones y el resto al actualizar en el diálogo.
    const snapshotsToday = snapshotsTodayRes.data ?? [];
    const categories = (categoriesRes.data ?? []) as {
      id: string;
      name: string;
      type: string;
      active?: boolean;
      taePercent?: number | null;
      investedAmount?: number | null;
    }[];
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const assetCategories = categories.filter(
      (c) => (c.type === "investment" || c.type === "savings") && c.active !== false
    );

    const applyTaeIfSavings = (categoryId: string, value: number, snapshotDateStr?: string): number => {
      const cat = categoryById.get(categoryId);
      if (cat?.taePercent == null || cat.taePercent <= 0) return value;
      const snapshotDate = snapshotDateStr ? new Date(snapshotDateStr + "T12:00:00") : new Date();
      const todayDate = new Date();
      if (Number.isNaN(snapshotDate.getTime()) || snapshotDate >= todayDate) return value;
      const days = (todayDate.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24);
      const factor = Math.pow(1 + cat.taePercent / 100, days / 365);
      return value * factor;
    };

    const snapshotsTodayMap = new Map(
      (snapshotsTodayRes.data ?? []).map((s) => [s.categoryId, { value: s.value, date: s.date }])
    );
    const snapshotsLatest = snapshotsLatestRes.data ?? [];
    const snapshotLatestByCategoryId = new Map(
      snapshotsLatest.map((s) => [s.categoryId, { value: s.value, date: s.date }])
    );
    const movementByCategoryName = new Map<string, number>();
    for (const item of [
      ...latestByCategory(movements, "Inversión"),
      ...latestByCategory(movements, "Ahorro"),
    ]) {
      movementByCategoryName.set(item.name, (movementByCategoryName.get(item.name) ?? 0) + item.value);
    }

    const distribucionActivos =
      assetCategories.length > 0
        ? assetCategories
            .map((cat) => {
              const snapshotToday = snapshotsTodayMap.get(cat.id);
              const snapshotLatest = snapshotLatestByCategoryId.get(cat.id);
              const valueFromSnapshotToday =
                snapshotToday != null ? applyTaeIfSavings(cat.id, snapshotToday.value, snapshotToday.date) : null;
              const valueFromSnapshotLatest =
                snapshotLatest != null ? applyTaeIfSavings(cat.id, snapshotLatest.value, snapshotLatest.date) : null;
              const valueFromMovement = movementByCategoryName.get(cat.name) ?? 0;
              const valueFromInvested =
                cat.type === "investment" && cat.investedAmount != null ? Number(cat.investedAmount) : null;
              const value =
                valueFromSnapshotToday ??
                valueFromSnapshotLatest ??
                valueFromMovement ??
                valueFromInvested ??
                0;
              return { name: cat.name, value };
            })
            .filter((item) => item.value > 0)
        : Array.from(
            [...latestByCategory(movements, "Inversión"), ...latestByCategory(movements, "Ahorro")].reduce(
              (acc, item) => {
                acc.set(item.name, (acc.get(item.name) ?? 0) + item.value);
                return acc;
              },
              new Map<string, number>()
            )
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
