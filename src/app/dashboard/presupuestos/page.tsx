"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { Wallet } from "lucide-react";

export default function PresupuestosPage() {
  return (
    <div className="space-y-4 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">Presupuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define límites por categoría y controla tus gastos
        </p>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-green-500" />
            <CardTitle className="text-lg">Gestionar Presupuestos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetManager triggerLabel="Gestionar Presupuestos" />
        </CardContent>
      </Card>
    </div>
  );
}
