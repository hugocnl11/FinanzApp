"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { IncomeCard, ExpensesCard, GoalCard } from "@/components/dashboard/Widgets";
import { BudgetSummary } from "@/components/dashboard/BudgetSummary";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DashboardMonthSelector } from "@/components/dashboard/DashboardMonthSelector";
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
        <div className="min-w-0">
          <h1 id="dashboard-titulo" className="text-2xl md:text-3xl font-bold truncate">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tu visión financiera en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <PeriodSelector />
          <DashboardMonthSelector />
        </div>
      </div>

      {/* Resumen + Presupuesto: en móvil una columna; en desktop dos columnas con altura alineada */}
      <section aria-labelledby="dashboard-titulo">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 lg:items-start">
          {/* Columna Izquierda: Resumen + Ingresos y Gastos diarios */}
          <div ref={leftColRef} className="space-y-4 min-w-0">
            <div className="grid gap-4 grid-cols-2 min-w-0">
              <div className="min-w-0">
                <IncomeCard />
              </div>
              <div className="min-w-0">
                <ExpensesCard />
              </div>
            </div>
            <GoalCard />
            <AnalyticsCharts type="combined" />
          </div>

          {/* Columna Derecha: Presupuesto (en móvil debajo sin altura fija; en desktop altura = columna izquierda) */}
          <div
            className="min-w-0 min-h-0 flex flex-col w-full lg:h-[var(--budget-col-height)] lg:min-h-[var(--budget-col-height)] lg:max-h-[var(--budget-col-height)]"
            style={
              budgetMaxHeight != null
                ? { ["--budget-col-height" as string]: `${budgetMaxHeight}px` }
                : undefined
            }
          >
            <BudgetSummary mode="combined" className="h-full min-h-0 max-h-full max-lg:min-h-[280px]" />
          </div>
        </div>
      </section>

      {/* Resto de gráficas */}
      <section className="min-w-0">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="min-w-0">
            <AnalyticsCharts type="patrimonio" />
          </div>
          <div className="min-w-0">
            <DashboardCategoryBreakdowns type="assets" />
          </div>
        </div>
      </section>

    </div>
    </PeriodProvider>
  );
} 