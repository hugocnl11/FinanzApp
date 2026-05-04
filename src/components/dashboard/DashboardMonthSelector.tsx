"use client";

import { useMemo } from "react";
import { usePeriod } from "@/contexts/PeriodContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export function DashboardMonthSelector() {
  const { dashboardMonthKey, setDashboardMonthKey } = usePeriod();
  const { data } = useDashboardData();

  const monthKeys = useMemo(() => {
    const keys = data.ingresosMensuales.map((row) => row.monthKey).filter(Boolean) as string[];
    return [...new Set(keys)];
  }, [data.ingresosMensuales]);

  const resolvedValue = dashboardMonthKey || monthKeys[monthKeys.length - 1] || "";

  if (monthKeys.length === 0) return null;

  return (
    <label className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">Mes</span>
      <select
        aria-label="Mes de referencia del dashboard"
        value={resolvedValue}
        onChange={(e) => setDashboardMonthKey(e.target.value)}
        className={cn(
          "h-9 min-w-[10rem] max-w-[14rem] rounded-md border border-input bg-background px-2 py-1 text-xs font-medium",
          "text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        {monthKeys.map((key) => (
          <option key={key} value={key}>
            {formatMonthLabel(key)}
          </option>
        ))}
      </select>
    </label>
  );
}
