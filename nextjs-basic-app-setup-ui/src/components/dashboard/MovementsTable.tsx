"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Movement, MovementType } from "@/lib/dashboard/types";
import { Edit2, Trash2, Plus, ArrowUpCircle, ArrowDownCircle, TrendingUp, PiggyBank } from "lucide-react";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { fetchCategories } from "@/lib/api/categories";
import { getUserId } from "@/lib/auth";

type CategoryItem = {
  id: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
};

type MovementsTableProps = {
  movimientos: Movement[];
  total?: number;
  onEdit: (movement: Movement) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
};

export function MovementsTable({ movimientos = [], total, onEdit, onDelete, onAddNew }: MovementsTableProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!getUserId()) {
          setCategories([]);
          return;
        }
        const response = await fetchCategories();
        setCategories(response.data as CategoryItem[]);
      } catch {
        setCategories([]);
      }
    };
    void load();
    const handler = () => load();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.name, cat]));
  }, [categories]);
  const getTipoIcon = (tipo: MovementType) => {
    switch (tipo) {
      case "Ingreso":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "Gasto":
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case "Inversión":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "Ahorro":
        return <PiggyBank className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getTipoColor = (tipo: MovementType) => {
    switch (tipo) {
      case "Ingreso":
        return "text-green-600 dark:text-green-400";
      case "Gasto":
        return "text-red-600 dark:text-red-400";
      case "Inversión":
        return "text-blue-600 dark:text-blue-400";
      case "Ahorro":
        return "text-emerald-600 dark:text-emerald-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Movimientos</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona tus ingresos, gastos e inversiones
          </p>
        </div>
        <Button onClick={onAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      <div className="overflow-x-auto">
        {movimientos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No hay movimientos</p>
            <p className="text-sm">Añade tu primer movimiento para comenzar</p>
          </div>
        ) : (
          <>
          <ul className="space-y-3 block md:hidden" role="list">
            {movimientos.map((m) => {
              const meta = categoryMap.get(m.categoria);
              const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
              return (
                <li key={m.id || `${m.fecha}-${m.concepto}`}>
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background p-4 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTipoIcon(m.tipo)}
                        <span className={`text-sm font-medium ${getTipoColor(m.tipo)}`}>{m.tipo}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(m.fecha)}</span>
                      </div>
                      <p className="font-medium truncate">{m.concepto}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded"
                          style={{
                            backgroundColor: meta ? `${meta.color}20` : "hsl(var(--muted))",
                            color: meta?.color,
                          }}
                        >
                          {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[8px]">•</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.categoria}</span>
                        {m.metodoPago && (
                          <span className="text-xs text-muted-foreground">· {m.metodoPago}</span>
                        )}
                      </div>
                      <p className={`mt-2 text-base font-semibold ${getTipoColor(m.tipo)}`}>
                        {m.cantidad > 0 ? "+" : ""}
                        {m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="touch-icon"
                        onClick={() => m.id && onEdit(m)}
                        className="h-11 w-11"
                        aria-label="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="touch-icon"
                        onClick={() => m.id && onDelete(m.id)}
                        className="h-11 w-11 text-destructive hover:text-destructive"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Concepto</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Categoría</th>
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Método de pago</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Cantidad</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr
                  key={m.id || `${m.fecha}-${m.concepto}`}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-2">{formatDate(m.fecha)}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(m.tipo)}
                      <span className={`font-medium ${getTipoColor(m.tipo)}`}>{m.tipo}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-medium">{m.concepto}</td>
                  <td className="py-3 px-2">
                    {(() => {
                      const meta = categoryMap.get(m.categoria);
                      const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                      return (
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{
                              backgroundColor: meta ? `${meta.color}20` : "hsl(var(--muted))",
                              color: meta?.color,
                            }}
                          >
                            {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="text-[10px]">•</span>}
                          </span>
                          <span className="text-xs font-medium">{m.categoria}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">
                    {m.metodoPago ?? "—"}
                  </td>
                  <td className={`py-3 px-2 text-right font-semibold ${getTipoColor(m.tipo)}`}>
                    {m.cantidad > 0 ? "+" : ""}
                    {m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => m.id && onEdit(m)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => m.id && onDelete(m.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {movimientos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/40 text-sm text-muted-foreground">
          Mostrando {movimientos.length}
          {typeof total === "number" ? ` de ${total}` : ""} movimientos
        </div>
      )}
    </Card>
  );
}
