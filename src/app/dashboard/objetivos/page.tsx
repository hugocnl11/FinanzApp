"use client";

import { GoalsManager } from "@/components/dashboard/GoalsManager";

export default function ObjetivosPage() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">Objetivos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define metas de ahorro, gasto o ingresos y sigue tu progreso
        </p>
      </div>

      <GoalsManager inline />
    </div>
  );
}
