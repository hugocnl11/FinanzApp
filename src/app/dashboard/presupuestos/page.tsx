"use client";

import { BudgetManager } from "@/components/dashboard/BudgetManager";

export default function PresupuestosPage() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">Presupuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define límites por categoría y controla tus gastos
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Incluye gastos, inversiones y ahorros según el tipo de cada categoría. Usa la flecha para ver el desglose de movimientos.
        </p>
      </div>

      <BudgetManager inline />
    </div>
  );
}
