"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { IncomeCard, ExpensesCard, GoalCard } from "@/components/dashboard/Widgets";
import { BudgetSummary } from "@/components/dashboard/BudgetSummary";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsCharts = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((m) => ({ default: m.AnalyticsCharts })),
  { loading: () => <Skeleton className="h-[320px] w-full rounded-lg" />, ssr: false }
);

const DashboardCategoryBreakdowns = dynamic(
  () => import("@/components/dashboard/DashboardCategoryBreakdowns").then((m) => ({ default: m.DashboardCategoryBreakdowns })),
  { loading: () => <Skeleton className="h-[320px] w-full rounded-lg" />, ssr: false }
);

export default function DashboardPage() {
  const leftColRef = useRef<HTMLDivElement>(null);
  const [budgetMaxHeight, setBudgetMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const updateHeight = () => setBudgetMaxHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <PeriodProvider>
      <div className="space-y-4 px-4 md:px-8" aria-label="Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 id="dashboard-titulo" className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tu visión financiera en un solo lugar.
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Resumen + Presupuesto: el bloque de presupuesto se limita a la altura de la columna izquierda para quedar alineado */}
      <section aria-labelledby="dashboard-titulo">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 lg:items-start">
          {/* Columna Izquierda: Resumen + Ingresos y Gastos diarios */}
          <div ref={leftColRef} className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <IncomeCard />
              <ExpensesCard />
            </div>
            <GoalCard />
            <AnalyticsCharts type="combined" />
          </div>

          {/* Columna Derecha: Presupuesto del mes (altura fija = columna izquierda, min = max) */}
          <div
            className="min-h-0 flex flex-col w-full"
            style={
              budgetMaxHeight != null
                ? { height: budgetMaxHeight, minHeight: budgetMaxHeight, maxHeight: budgetMaxHeight }
                : undefined
            }
          >
            <BudgetSummary mode="combined" className="h-full min-h-0 max-h-full" />
          </div>
        </div>
      </section>

      {/* Resto de gráficas */}
      <section>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <AnalyticsCharts type="patrimonio" />
          <DashboardCategoryBreakdowns type="assets" />
        </div>
      </section>

    </div>
    </PeriodProvider>
  );
} 