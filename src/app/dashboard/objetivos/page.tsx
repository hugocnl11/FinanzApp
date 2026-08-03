"use client";

import { GoalsManager } from "@/components/dashboard/GoalsManager";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function ObjetivosPage() {
  return (
    <div className="space-y-6 min-w-0">
      <DashboardPageHeader
        eyebrow="Metas"
        title="Objetivos"
        description="Define metas de ahorro, gasto o ingresos y sigue tu progreso."
      />

      <GoalsManager inline />
    </div>
  );
}
