"use client";

import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function PresupuestosPage() {
  return (
    <div className="space-y-6 min-w-0">
      <DashboardPageHeader
        eyebrow="Control"
        title="Presupuestos"
        description="Define límites por categoría y controla tus gastos. Incluye gastos, inversiones y ahorros según el tipo de cada categoría."
      />

      <BudgetManager inline />
    </div>
  );
}
