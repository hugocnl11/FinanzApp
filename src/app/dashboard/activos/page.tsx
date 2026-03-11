"use client";

import { useMemo, useEffect, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAssetEvolutionByCategory } from "@/hooks/useAssetEvolutionByCategory";
import { AssetCard } from "@/components/dashboard/AssetCard";
import { AssetsDistributionManager } from "@/components/dashboard/AssetsDistributionManager";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createAssetSnapshot } from "@/lib/api/asset-snapshots";
import { updateCategory } from "@/lib/api/categories";
import { getUserId, isDemoUser } from "@/lib/auth";
import type { CategoryIconKey } from "@/lib/category-icons";

type CategoryItem = { name: string; icon: CategoryIconKey; color: string };

export default function ActivosPage() {
  const { data, loading: dataLoading } = useDashboardData();
  const { evolutionByCategory, loading: evolutionLoading } = useAssetEvolutionByCategory(12);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [demoOverrides, setDemoOverrides] = useState<
    Map<string, { investedValue?: number; taePercent?: number; currentValue: number }>
  >(new Map());
  const [chartMode, setChartMode] = useState<"valor" | "rentabilidad">("valor");
  const [barsMounted, setBarsMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { fetchCategories } = await import("@/lib/api/categories");
        const res = await fetchCategories();
        setCategories((res.data ?? []) as CategoryItem[]);
      } catch {
        setCategories([]);
      }
    };
    void load();
    const handler = () => load();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBarsMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const categoryMeta = useMemo(() => {
    return categories.reduce<Record<string, { color: string; icon: CategoryIconKey }>>(
      (acc, cat) => {
        acc[cat.name] = { color: cat.color, icon: cat.icon };
        return acc;
      },
      {}
    );
  }, [categories]);

  const assetsWithCategoryId = useMemo(() => {
    const cats = data.categories ?? [];
    const assetCats = cats.filter(
      (c) => (c.type === "investment" || c.type === "savings") && c.active !== false
    );
    const distributionMap = new Map(
      data.distribucionActivos.map((item) => [item.name, item.value] as const)
    );
    return assetCats.map((cat) => {
      const override = demoOverrides.get(cat.id);
      const investedValue =
        override?.investedValue ?? cat.investedAmount ?? 0;
      const taePercent =
        override?.taePercent ?? cat.taePercent ?? 0;
      const currentValue =
        override?.currentValue ?? distributionMap.get(cat.name) ?? 0;
      return {
        name: cat.name,
        type: cat.type as "investment" | "savings",
        investedValue: Number(investedValue) || 0,
        taePercent: Number(taePercent) || 0,
        currentValue: Number(currentValue) || 0,
        categoryId: cat.id,
      };
    });
  }, [data.distribucionActivos, data.categories, demoOverrides]);

  const totalActivos = useMemo(
    () =>
      assetsWithCategoryId.reduce((sum, a) => sum + a.currentValue, 0),
    [assetsWithCategoryId]
  );

  const sortedByValue = useMemo(
    () =>
      [...assetsWithCategoryId]
        .map((a) => ({ name: a.name, value: a.currentValue }))
        .sort((a, b) => b.value - a.value),
    [assetsWithCategoryId]
  );

  const sortedByValuePositive = useMemo(
    () => sortedByValue.filter((item) => item.value > 0),
    [sortedByValue]
  );

  const totalPositive = useMemo(
    () => sortedByValuePositive.reduce((sum, item) => sum + item.value, 0),
    [sortedByValuePositive]
  );

  const mayorResumen = useMemo(() => {
    if (sortedByValuePositive.length === 0 || totalPositive <= 0) return null;
    const first = sortedByValuePositive[0];
    const pct = (first.value / totalPositive) * 100;
    return { name: first.name, pct };
  }, [sortedByValuePositive, totalPositive]);

  const canEdit = Boolean(getUserId());

  const handleSaveAsset = async (
    categoryId: string,
    primaryValue: number,
    currentValue: number,
    assetType: "investment" | "savings"
  ) => {
    if (isDemoUser()) {
      setDemoOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(categoryId) ?? { currentValue: 0 };
        if (assetType === "savings") {
          next.set(categoryId, { ...existing, taePercent: primaryValue, currentValue });
        } else {
          next.set(categoryId, { ...existing, investedValue: primaryValue, currentValue });
        }
        return next;
      });
      window.dispatchEvent(new Event("finanzapp:data-updated"));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all([
      updateCategory(categoryId, assetType === "savings" ? { taePercent: primaryValue } : { investedAmount: primaryValue }),
      createAssetSnapshot({ categoryId, value: currentValue, date: today }),
    ]);
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  if (dataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[220px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">Activos</h1>
          <p className="text-sm text-muted-foreground">
            Distribución de tu patrimonio por activo. Actualiza el valor actual cuando quieras.
          </p>
        </div>
        {canEdit && !isDemoUser() && (
          <div className="flex items-center gap-2">
            <AssetsDistributionManager />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Editar distribución de activos
            </span>
          </div>
        )}
      </div>

      {/* Resumen global */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total patrimonial</p>
              <p className="text-2xl font-bold">{formatNumber(totalActivos)} €</p>
              <p className="text-xs text-muted-foreground mt-1">
                {assetsWithCategoryId.length} activos
                {mayorResumen && ` · mayor: ${mayorResumen.name} (${mayorResumen.pct.toFixed(0)}%)`}
              </p>
            </div>
          </div>
          {assetsWithCategoryId.length > 0 && (
            <div className="flex-1 min-w-0 grid grid-cols-1 gap-y-2">
              {sortedByValue.map((item, i) => {
                const pct = totalActivos > 0 ? (item.value / totalActivos) * 100 : 0;
                const meta = categoryMeta[item.name];
                const color = meta?.color ?? "#6366f1";
                return (
                  <div key={item.name} className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium w-24 sm:w-28 truncate shrink-0">{item.name}</span>
                    <div className="flex-1 min-w-0 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: barsMounted ? `${pct}%` : "0%",
                          backgroundColor: color,
                          transitionDelay: `${i * 40}ms`,
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-10 shrink-0 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Grid por activo */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">Por activo</h2>
          {assetsWithCategoryId.some((a) => a.type === "investment") && (
            <div className="flex rounded-full border border-input bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setChartMode("valor")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  chartMode === "valor"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Valor
              </button>
              <button
                type="button"
                onClick={() => setChartMode("rentabilidad")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  chartMode === "rentabilidad"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Rentabilidad
              </button>
            </div>
          )}
        </div>
        {assetsWithCategoryId.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No hay activos registrados. Añade activos de inversión o ahorro desde el dashboard o
            usando &quot;Editar distribución de activos&quot;.
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...assetsWithCategoryId]
              .sort((a, b) => b.currentValue - a.currentValue)
              .map((asset) => (
              <AssetCard
                key={asset.categoryId}
                name={asset.name}
                assetType={asset.type}
                investedValue={asset.investedValue}
                taePercent={asset.taePercent}
                currentValue={asset.currentValue}
                categoryId={asset.categoryId}
                categoryMeta={categoryMeta[asset.name]}
                evolution={
                  asset.categoryId && !evolutionLoading
                    ? evolutionByCategory.get(asset.categoryId) ?? []
                    : []
                }
                chartMode={chartMode}
                onSave={handleSaveAsset}
                canEdit={canEdit && Boolean(asset.categoryId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
