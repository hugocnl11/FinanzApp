"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePeriod } from "@/contexts/PeriodContext";
import {
  proyeccionMensual,
  resolveEndMonthIndex,
  sliceMonthsEndingAt,
} from "@/lib/dashboard/selectors";
import { formatCurrency } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";

export function ForecastCard() {
  const { data } = useDashboardData();
  const { dashboardMonthKey } = usePeriod();
  const currency = useCurrency();

  const forecast = useMemo(() => {
    const endIdx = resolveEndMonthIndex(data.ingresosMensuales, dashboardMonthKey || undefined);
    if (endIdx < 0) return [];
    const ingresosBase = sliceMonthsEndingAt(data.ingresosMensuales, 12, dashboardMonthKey || undefined);
    const gastosBase = sliceMonthsEndingAt(data.gastosMensuales, 12, dashboardMonthKey || undefined);
    return proyeccionMensual(ingresosBase, gastosBase, 3, 6);
  }, [data.ingresosMensuales, data.gastosMensuales, dashboardMonthKey]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold">Forecast 3 meses</h3>
        <span className="text-xs text-muted-foreground">Escenario base (media 6m)</span>
      </div>
      {forecast.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos suficientes para proyectar.</p>
      ) : (
        <div className="space-y-2">
          {forecast.map((row, i) => {
            const balance = row.ingresos - row.gastos;
            return (
              <div
                key={`${row.mes}-${i}`}
                className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="font-medium">{row.mes}</span>
                <span className={balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                  {formatCurrency(balance, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
