"use client";

import { useMemo, useEffect, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAssetEvolutionByCategory } from "@/hooks/useAssetEvolutionByCategory";
import { AssetCard } from "@/components/dashboard/AssetCard";
import { AssetsDistributionManager } from "@/components/dashboard/AssetsDistributionManager";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { createAssetSnapshot } from "@/lib/api/asset-snapshots";
import { getUserId } from "@/lib/auth";
import type { CategoryIconKey } from "@/lib/category-icons";

type CategoryItem = { name: string; icon: CategoryIconKey; color: string };

export default function ActivosPage() {
  const { data, loading: dataLoading } = useDashboardData();
  const { evolutionByCategory, loading: evolutionLoading } = useAssetEvolutionByCategory(12);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

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

  const categoryMeta = useMemo(() => {
    return categories.reduce<Record<string, { color: string; icon: CategoryIconKey }>>((acc, cat) => {
      acc[cat.name] = { color: cat.color, icon: cat.icon };
      return acc;
    }, {});
  }, [categories]);

  const assetsWithCategoryId = useMemo(() => {
    const cats = data.categories ?? [];
    return data.distribucionActivos.map((item) => {
      const category = cats.find(
        (c) => (c.type === "investment" || c.type === "savings") && c.name === item.name
      );
      return {
        name: item.name,
        value: item.value,
        categoryId: category?.id ?? "",
      };
    });
  }, [data.distribucionActivos, data.categories]);

  const totalActivos = useMemo(
    () => data.distribucionActivos.reduce((sum, a) => sum + a.value, 0),
    [data.distribucionActivos]
  );

  const canEdit = Boolean(getUserId());

  const handleSaveValue = async (categoryId: string, value: number) => {
    const today = new Date().toISOString().slice(0, 10);
    await createAssetSnapshot({ categoryId, value, date: today });
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
        {canEdit && (
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total patrimonial</p>
            <p className="text-2xl font-bold">{formatNumber(totalActivos)} €</p>
          </div>
          {data.distribucionActivos.length > 0 && (
            <div className="flex-1 max-w-md space-y-2">
              {[...data.distribucionActivos]
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const pct = totalActivos > 0 ? (item.value / totalActivos) * 100 : 0;
                  const meta = categoryMeta[item.name];
                  const color = meta?.color ?? "#6366f1";
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-28 truncate">{item.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-12 text-right">
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
        <h2 className="text-lg font-semibold mb-4">Por activo</h2>
        {assetsWithCategoryId.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No hay activos registrados. Añade activos de inversión o ahorro desde el dashboard o
            usando &quot;Editar distribución de activos&quot;.
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {assetsWithCategoryId.map((asset) => (
              <AssetCard
                key={asset.name}
                name={asset.name}
                value={asset.value}
                categoryId={asset.categoryId}
                categoryMeta={categoryMeta[asset.name]}
                evolution={
                  asset.categoryId && !evolutionLoading
                    ? evolutionByCategory.get(asset.categoryId) ?? []
                    : []
                }
                onSaveValue={handleSaveValue}
                canEdit={canEdit && Boolean(asset.categoryId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
