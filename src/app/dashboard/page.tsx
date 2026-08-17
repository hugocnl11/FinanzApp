"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { IncomeCard, ExpensesCard, GoalCard } from "@/components/dashboard/Widgets";
import { BudgetSummary } from "@/components/dashboard/BudgetSummary";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DashboardMonthSelector } from "@/components/dashboard/DashboardMonthSelector";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Download } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

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
  const { data } = useDashboardData();

  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const updateHeight = () => setBudgetMaxHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const exportCsv = () => {
    const header = ["fecha", "concepto", "categoria", "tipo", "cantidad"];
    const rows = (data.movimientos ?? []).map((m) => [
      m.fecha,
      `"${(m.concepto ?? "").replaceAll('"', '""')}"`,
      `"${(m.categoria ?? "").replaceAll('"', '""')}"`,
      m.tipo,
      String(m.cantidad),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzapp-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const lastUpdate = data.movimientos?.length
    ? [...data.movimientos]
        .map((m) => m.fecha)
        .sort((a, b) => b.localeCompare(a))[0]
    : null;

  return (
    <PeriodProvider>
      <div className="space-y-4" aria-label="Dashboard">
      <DashboardPageHeader
        title="Dashboard"
        titleId="dashboard-titulo"
        description="Tu visión financiera en un solo lugar."
        meta={
          lastUpdate
            ? `Última actualización: ${new Date(lastUpdate).toLocaleDateString("es-ES")}`
            : undefined
        }
        inlineDetailsOnWide
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <NotificationCenter />
            <PeriodSelector />
            <DashboardMonthSelector />
          </>
        }
      />

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
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 md:items-stretch">
          <div className="min-w-0 h-full">
            <AnalyticsCharts type="patrimonio" />
          </div>
          <div className="min-w-0 h-full">
            <DashboardCategoryBreakdowns type="assets" />
          </div>
        </div>
      </section>

    </div>
    </PeriodProvider>
  );
} 