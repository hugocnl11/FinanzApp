"use client";

import { Card } from "@/components/ui/card";
import type { ReactNode, CSSProperties } from "react";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { formatNumber } from "@/lib/format";

type Category = { name: string; value: number };

const defaultCategories: Category[] = [];

type Variant = "donut" | "pill-list";

const palette = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"];

export function CategoryBreakdown({
  title = "Gastos por Categoría",
  categories = defaultCategories,
  variant = "donut",
  periodLabel = "TOTAL",
  headerRight,
  animationKey,
  percentChange,
  categoryMeta,
}: {
  title?: string;
  categories?: Category[];
  variant?: Variant;
  periodLabel?: string;
  headerRight?: ReactNode;
  animationKey?: string;
  percentChange?: number; // % de cambio respecto al mes anterior
  categoryMeta?: Record<string, { color: string; icon: CategoryIconKey }>;
}) {
  // Ordenar categorías por valor descendente (mayor a menor)
  const sortedCategories = [...categories].sort((a, b) => b.value - a.value);
  const total = sortedCategories.reduce((acc, c) => acc + c.value, 0);
  const usedColors = new Set<string>();
  const colors = sortedCategories.map((cat, i) => {
    const preferred = categoryMeta?.[cat.name]?.color;
    if (preferred && !usedColors.has(preferred)) {
      usedColors.add(preferred);
      return preferred;
    }
    const next = palette.find((color) => !usedColors.has(color));
    const chosen = next ?? preferred ?? palette[i % palette.length];
    usedColors.add(chosen);
    return chosen;
  });

  if (variant === "pill-list") {
    return (
      <Card className="p-5 min-h-[320px] h-full flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{periodLabel}</p>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          {headerRight ? <div className="text-xs">{headerRight}</div> : null}
        </div>
        <div className="space-y-2">
          {sortedCategories.map((cat, i) => {
            const pct = (cat.value / total) * 100;
            const meta = categoryMeta?.[cat.name];
            const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
            return (
              <div key={cat.name} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: `${colors[i]}20`, color: colors[i] }}
                  >
                    {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[10px]">•</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-sm font-medium">
                      <span className="min-w-0 truncate">{cat.name}</span>
                      <span className="tabular-nums whitespace-nowrap text-[11px] sm:text-xs">
                        {formatNumber(cat.value)} €
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: colors[i] }}
                        />
                      </div>
                      <span className="tabular-nums whitespace-nowrap text-[11px] sm:text-xs">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // variant === "donut"
  const radius = 80;
  const stroke = 18;
  const size = 220;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const donutKey = animationKey ?? `${title}-${periodLabel}`;

  return (
    <Card className="p-6 min-h-[320px] h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{periodLabel}</p>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {headerRight ? <div className="text-xs">{headerRight}</div> : null}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
        <div className="relative mx-auto">
          <svg key={donutKey} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {sortedCategories.map((cat, i) => {
              const pct = cat.value / total;
              const dash = circumference * pct;
              const gap = circumference - dash;
              const dashOffset = offset;
              offset += dash;
              return (
                <circle
                  key={cat.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={circumference}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="drop-shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                  style={
                    {
                      ["--dash-target" as string]: -dashOffset,
                      animation: "donut-reveal 1s ease-out forwards",
                      animationDelay: `${i * 80}ms`,
                      opacity: 0,
                    } as CSSProperties
                  }
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{formatNumber(total)} €</div>
            {percentChange !== undefined && (
              <div className="text-xs font-medium mt-1 text-center leading-tight">
                <span className={percentChange < 0 ? "text-green-500" : "text-red-500"}>
                  {percentChange >= 0 ? "+" : ""}
                  {percentChange.toFixed(0)}%
                </span>
                <span className="block text-muted-foreground font-normal">vs mes anterior</span>
              </div>
            )}
          </div>
          <style jsx>{`
            @keyframes donut-reveal {
              to {
                stroke-dashoffset: var(--dash-target);
                opacity: 1;
              }
            }
          `}</style>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {sortedCategories.map((cat, i) => {
            const meta = categoryMeta?.[cat.name];
            const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: `${colors[i]}20`, color: colors[i] }}
                  >
                    {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[10px]">•</span>}
                  </span>
                  <span className="font-medium min-w-0 truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
                  <span className="font-semibold text-foreground tabular-nums tracking-tight">
                    {formatNumber(cat.value)} €
                  </span>
                  <span className="tabular-nums">{((cat.value / total) * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}