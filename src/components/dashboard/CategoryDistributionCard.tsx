"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { CategoryAmount } from "@/lib/dashboard/types";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"];
const CARD_HEIGHT_PX = 380;

type CategoryView = "circular" | "bars";

type CategoryDistributionCardProps = {
  title: string;
  subtitle: string;
  data: CategoryAmount[];
  loading?: boolean;
};

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string; value?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = entry.payload?.name ?? entry.name;
  const value = Number(entry.payload?.value ?? entry.value ?? 0);
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <span className="font-medium">{name}</span>
      <span className="ml-2">€ {formatNumber(value)}</span>
    </div>
  );
}

export function CategoryDistributionCard({
  title,
  subtitle,
  data,
  loading = false,
}: CategoryDistributionCardProps) {
  const [view, setView] = useState<CategoryView>("circular");
  const total = useMemo(() => data.reduce((acc, item) => acc + item.value, 0), [data]);

  return (
    <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div
            className="flex shrink-0 rounded-full bg-muted/50 p-0.5 border border-border/60"
            role="tablist"
            aria-label={`Vista de ${title}`}
          >
            {(
              [
                { value: "circular", label: "Circular" },
                { value: "bars", label: "Barras" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-3">
            <Skeleton className="flex-1 w-full rounded-full mx-auto max-w-[220px]" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin datos disponibles
          </div>
        ) : view === "bars" ? (
          <CategoryBars data={data} total={total} />
        ) : (
          <>
            <div className="flex-1 min-h-0 relative mt-2">
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold">{formatNumber(total)} €</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="88%"
                    paddingAngle={2}
                    cornerRadius={8}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: "transparent" }} content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <CategoryLegend data={data} total={total} />
          </>
        )}
      </div>
    </Card>
  );
}

function CategoryBars({ data, total }: { data: CategoryAmount[]; total: number }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);
  const max = Math.max(...sorted.map((item) => item.value), 1);

  return (
    <div className="flex-1 min-h-0 flex flex-col mt-3">
      <p className="shrink-0 text-xs text-muted-foreground tabular-nums mb-3">
        Total {formatNumber(total)} €
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 space-y-2.5">
        {sorted.map((entry) => {
          const index = data.indexOf(entry);
          const pct = total ? (entry.value / total) * 100 : 0;
          const width = Math.max(2, (entry.value / max) * 100);
          return (
            <div key={entry.name} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                <span className="truncate font-medium">{entry.name}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {formatNumber(entry.value)} € · {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryLegend({ data, total }: { data: CategoryAmount[]; total: number }) {
  return (
    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 text-xs max-h-[100px] overflow-y-auto overflow-x-hidden mt-2">
      {[...data]
        .sort((a, b) => b.value - a.value)
        .map((entry) => {
          const index = data.indexOf(entry);
          const pct = total ? (entry.value / total) * 100 : 0;
          return (
            <div
              key={entry.name}
              className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1 min-w-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="truncate text-[11px]">{entry.name}</span>
              </div>
              <span className="tabular-nums text-muted-foreground text-[11px] shrink-0">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
    </div>
  );
}
