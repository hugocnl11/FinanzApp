"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { formatNumber } from "@/lib/format";
import type { AssetEvolutionPoint } from "@/hooks/useAssetEvolutionByCategory";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export type AssetCardMeta = { color: string; icon: CategoryIconKey };

type AssetCardProps = {
  name: string;
  assetType: "investment" | "savings";
  investedValue: number;
  taePercent: number;
  currentValue: number;
  categoryId: string;
  categoryMeta?: AssetCardMeta;
  evolution?: AssetEvolutionPoint[];
  /** Solo aplica a inversión; en ahorro siempre se muestra valor */
  chartMode?: "valor" | "rentabilidad";
  onSave: (
    categoryId: string,
    primaryValue: number,
    currentValue: number,
    assetType: "investment" | "savings"
  ) => Promise<void>;
  canEdit?: boolean;
};

export function AssetCard({
  name,
  assetType,
  investedValue,
  taePercent,
  currentValue,
  categoryId,
  categoryMeta,
  evolution = [],
  chartMode = "valor",
  onSave,
  canEdit = true,
}: AssetCardProps) {
  const [localInvested, setLocalInvested] = useState(investedValue.toString());
  const [localTae, setLocalTae] = useState(taePercent.toString());
  const [localCurrent, setLocalCurrent] = useState(currentValue.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalInvested(investedValue.toString());
    setLocalTae(taePercent.toString());
    setLocalCurrent(currentValue.toString());
  }, [investedValue, taePercent, currentValue]);

  const color = categoryMeta?.color ?? "#6366f1";
  const IconComponent = categoryMeta?.icon ? CATEGORY_ICON_MAP[categoryMeta.icon] : null;

  const showRentabilidad = assetType === "investment" && chartMode === "rentabilidad";
  const chartData = evolution.map((p) => {
    const mes = p.mes.slice(0, 3);
    if (showRentabilidad && investedValue > 0) {
      const rentabilidad = ((p.valor - investedValue) / investedValue) * 100;
      return { mes, valor: rentabilidad };
    }
    return { mes, valor: p.valor };
  });

  const handleSave = async () => {
    const primary = Number(
      (assetType === "savings" ? localTae : localInvested).replace(",", ".")
    ) || 0;
    const primaryValue = assetType === "savings" ? primary : Math.max(0, primary);
    const current = Math.max(0, Number(localCurrent.replace(",", ".")) || 0);
    setSaving(true);
    try {
      await onSave(categoryId, primaryValue, current, assetType);
      if (assetType === "savings") setLocalTae(primaryValue.toString());
      else setLocalInvested(primaryValue.toString());
      setLocalCurrent(current.toString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-4 min-h-[200px]">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {IconComponent ? <IconComponent className="h-4 w-4" /> : <span className="text-xs">•</span>}
        </span>
        <h3 className="font-semibold truncate min-w-0 flex-1">{name}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            assetType === "savings"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-violet-500/15 text-violet-700 dark:text-violet-400"
          )}
        >
          {assetType === "savings" ? "Ahorro" : "Inversión"}
        </span>
      </div>

      {chartData.length > 0 && (
        <div className="h-[80px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`area-${categoryId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" hide tick={{ fontSize: 10 }} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0];
                  const valor = Number(entry.value);
                  const mes = entry.payload?.mes ?? "";
                  return (
                    <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-md text-xs">
                      {mes && <span className="font-medium">{mes}</span>}
                      <span className={mes ? "ml-2" : ""}>
                        {showRentabilidad
                          ? `${valor.toFixed(1)}%`
                          : formatNumber(valor) + " €"}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        {showRentabilidad ? "Rentabilidad" : "Valor"}
                      </span>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#area-${categoryId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 mt-auto">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <label
            htmlFor={assetType === "savings" ? `tae-${categoryId}` : `valor-ingresado-${categoryId}`}
            className="text-xs text-muted-foreground font-medium"
          >
            {assetType === "savings" ? "% TAE" : "Valor ingresado (€)"}
          </label>
          <input
            id={assetType === "savings" ? `tae-${categoryId}` : `valor-ingresado-${categoryId}`}
            type="number"
            min={assetType === "savings" ? undefined : 0}
            step={assetType === "savings" ? "0.01" : "0.01"}
            value={assetType === "savings" ? localTae : localInvested}
            onChange={(e) =>
              assetType === "savings"
                ? setLocalTae(e.target.value)
                : setLocalInvested(e.target.value)
            }
            disabled={!canEdit}
            placeholder={assetType === "savings" ? "Ej. 2,5" : undefined}
            className={cn(
              "h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <label htmlFor={`valor-actual-${categoryId}`} className="text-xs text-muted-foreground font-medium">
            Valor actual (€)
          </label>
          <input
            id={`valor-actual-${categoryId}`}
            type="number"
            min={0}
            step="0.01"
            value={localCurrent}
            onChange={(e) => setLocalCurrent(e.target.value)}
            disabled={!canEdit}
            className={cn(
              "h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          />
        </div>
        {canEdit && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="shrink-0 h-9">
            {saving ? "..." : "Guardar"}
          </Button>
        )}
      </div>
    </Card>
  );
}
