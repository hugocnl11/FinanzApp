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
  value: number;
  categoryId: string;
  categoryMeta?: AssetCardMeta;
  evolution?: AssetEvolutionPoint[];
  onSaveValue: (categoryId: string, value: number) => Promise<void>;
  canEdit?: boolean;
};

export function AssetCard({
  name,
  value,
  categoryId,
  categoryMeta,
  evolution = [],
  onSaveValue,
  canEdit = true,
}: AssetCardProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const color = categoryMeta?.color ?? "#6366f1";
  const IconComponent = categoryMeta?.icon ? CATEGORY_ICON_MAP[categoryMeta.icon] : null;

  const chartData = evolution.map((p) => ({ mes: p.mes.slice(0, 3), valor: p.valor }));

  const handleSave = async () => {
    const num = Math.max(0, Number(localValue.replace(",", ".")) || 0);
    setSaving(true);
    try {
      await onSaveValue(categoryId, num);
      setLocalValue(num.toString());
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
        <h3 className="font-semibold truncate">{name}</h3>
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
                formatter={(v: number) => [formatNumber(v) + " €", "Valor"]}
                labelFormatter={(label) => label}
                contentStyle={{ fontSize: "12px" }}
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

      <div className="flex items-end gap-2 mt-auto">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <label htmlFor={`valor-${categoryId}`} className="text-xs text-muted-foreground font-medium">
            Valor actual (€)
          </label>
          <input
            id={`valor-${categoryId}`}
            type="number"
            min={0}
            step="0.01"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
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
