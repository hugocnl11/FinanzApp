"use client";

import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { DashboardCategoryBreakdowns } from "@/components/dashboard/DashboardCategoryBreakdowns";
import { IncomeCard, ExpensesCard, GoalCard } from "@/components/dashboard/Widgets";
import { BudgetSummary } from "@/components/dashboard/BudgetSummary";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { PeriodProvider } from "@/contexts/PeriodContext";

export default function DashboardPage() {
  return (
    <PeriodProvider>
      <div className="space-y-4 px-4 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tu visión financiera en un solo lugar.
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Resumen + Presupuesto grande (alto) */}
      <section>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 lg:items-stretch">
          {/* Columna Izquierda: Resumen + Ingresos y Gastos diarios */}
          <div className="space-y-4">
            {/* Ingresos y Gastos lado a lado */}
            <div className="grid gap-4 grid-cols-2">
              <IncomeCard />
              <ExpensesCard />
            </div>
            
            {/* Objetivo Principal */}
            <GoalCard />

            {/* Ingresos y Gastos diarios */}
            <AnalyticsCharts type="combined" />
          </div>
          
          {/* Columna Derecha: Presupuesto combinado (doble altura) */}
          <BudgetSummary mode="combined" className="h-full" />
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