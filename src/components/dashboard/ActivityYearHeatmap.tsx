"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import {
  buildYearHeatmap,
  heatmapLevel,
  yearsWithMovements,
  type HeatmapDay,
} from "@/lib/dashboard/advanced-charts";
import type { Movement } from "@/lib/dashboard/types";

const HEIGHT = 280;
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LEVEL_COLORS = [
  "hsl(var(--muted))",
  "color-mix(in srgb, hsl(var(--primary)) 28%, hsl(var(--muted)))",
  "color-mix(in srgb, hsl(var(--primary)) 48%, hsl(var(--muted)))",
  "color-mix(in srgb, hsl(var(--primary)) 72%, transparent)",
  "hsl(var(--primary))",
];

type ActivityYearHeatmapProps = {
  movimientos: Movement[];
};

export function ActivityYearHeatmap({ movimientos }: ActivityYearHeatmapProps) {
  const years = useMemo(() => yearsWithMovements(movimientos), [movimientos]);
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year != null && years.includes(year) ? year : (years[0] ?? new Date().getFullYear());
  const [hover, setHover] = useState<HeatmapDay | null>(null);
  const weeks = useMemo(() => buildYearHeatmap(movimientos, activeYear), [movimientos, activeYear]);
  const maxGastado = useMemo(
    () => Math.max(...weeks.flatMap((week) => week.days.map((day) => day?.gastado ?? 0)), 0),
    [weeks]
  );

  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, index) => {
      const first = week.days.find((day) => day);
      if (!first) return;
      const month = Number(first.date.slice(5, 7)) - 1;
      if (month !== lastMonth) {
        labels.push({ index, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <Card className="p-4 flex flex-col overflow-hidden" style={{ height: HEIGHT }}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Actividad anual</h3>
            <p className="text-xs text-muted-foreground mt-1">Gasto por día a lo largo del año</p>
          </div>
          {years.length > 0 && (
            <div className="flex rounded-full bg-muted/50 p-0.5 border border-border/60">
              {years.slice(0, 4).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeYear === y ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
        {weeks.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin datos disponibles
          </div>
        ) : (
          <div className="flex-1 min-h-0 mt-3 flex gap-2">
            <div className="flex flex-col justify-between py-[14px] text-[10px] text-muted-foreground shrink-0">
              {WEEKDAYS.map((day, i) => (
                <span key={day} className={i % 2 === 1 ? "opacity-0" : undefined}>{day}</span>
              ))}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="relative h-4 mb-1 text-[10px] text-muted-foreground">
                {monthLabels.map((item) => (
                  <span
                    key={`${item.label}-${item.index}`}
                    className="absolute"
                    style={{ left: `${(item.index / weeks.length) * 100}%` }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="flex-1 min-h-0 flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex-1 min-w-0 flex flex-col gap-[3px]">
                    {week.days.map((day, di) => {
                      if (!day) return <div key={di} className="flex-1 min-h-0" />;
                      const level = heatmapLevel(day.gastado, maxGastado);
                      return (
                        <div
                          key={day.date}
                          className="flex-1 min-h-0 rounded-[2px]"
                          style={{ backgroundColor: LEVEL_COLORS[level] }}
                          onMouseEnter={() => setHover(day)}
                          onMouseLeave={() => setHover(null)}
                          title={`${day.date}: ${formatNumber(day.gastado)} € gastados`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="shrink-0 flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-2">
          {hover ? (
            <span className="tabular-nums">
              {hover.date} · Gastado {formatNumber(hover.gastado)} € · Ingresos {formatNumber(hover.ingresado)} €
            </span>
          ) : (
            <span>Pasa el cursor por un día</span>
          )}
          <span className="flex items-center gap-1">
            Menos
            {LEVEL_COLORS.map((color) => (
              <span key={color} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
            ))}
            Más
          </span>
        </div>
      </div>
    </Card>
  );
}
