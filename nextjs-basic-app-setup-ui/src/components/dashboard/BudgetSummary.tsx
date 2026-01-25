"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import { fetchBudgets, createBudget, updateBudget } from "@/lib/api/budgets";
import { fetchCategories } from "@/lib/api/categories";
import { getUserId } from "@/lib/auth";
import { fetchMovements } from "@/lib/api/movements";
import type { Movement } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/format";

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period?: string;
  isImplicit?: boolean;
};

type CategoryItem = {
  id: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
};

const fallbackBudgets: BudgetItem[] = [];

type BudgetType = "Fijo" | "Variable";

// Categorías fijas (gastos recurrentes)
const FIXED_CATEGORIES = [
  "Vivienda",
  "Alquiler", 
  "Garaje",
  "Gimnasio",
  "Inversiones",
  "Inversión",
  "Seguros",
  "Servicios",
  "Suscripciones",
];

// Categorías variables (gastos flexibles)
const VARIABLE_CATEGORIES = [
  "Alimentación",
  "Comida",
  "Ocio",
  "Ropa",
  "Transporte",
  "Salud",
  "Educación",
  "Viajes",
  "Regalos",
  "Otros",
];

type BudgetSummaryMode = "selector" | "combined";

// Mapeo de iconos y colores por defecto para cada categoría
const FALLBACK_CATEGORY_META: Record<string, { icon: CategoryIconKey; color: string }> = {
  // Fijos
  Vivienda: { icon: "Home", color: "#6366f1" },
  Alquiler: { icon: "Home", color: "#6366f1" },
  Garaje: { icon: "Car", color: "#ef4444" },
  Gimnasio: { icon: "HeartPulse", color: "#f97316" },
  Inversiones: { icon: "LineChart", color: "#22c55e" },
  Inversión: { icon: "LineChart", color: "#22c55e" },
  Seguros: { icon: "ShieldCheck", color: "#0ea5e9" },
  Servicios: { icon: "Smartphone", color: "#06b6d4" },
  Suscripciones: { icon: "CreditCard", color: "#f59e0b" },
  // Variables
  Alimentación: { icon: "Utensils", color: "#22c55e" },
  Comida: { icon: "Utensils", color: "#22c55e" },
  Ocio: { icon: "Film", color: "#ec4899" },
  Ropa: { icon: "ShoppingCart", color: "#f59e0b" },
  Transporte: { icon: "Fuel", color: "#ef4444" },
  Salud: { icon: "HeartPulse", color: "#e11d48" },
  Educación: { icon: "GraduationCap", color: "#6366f1" },
  Viajes: { icon: "Plane", color: "#38bdf8" },
  Regalos: { icon: "Gift", color: "#f97316" },
  Otros: { icon: "Wallet", color: "#64748b" },
};

export function BudgetSummary({
  mode = "selector",
  className,
}: {
  mode?: BudgetSummaryMode;
  className?: string;
}) {
  const [budgets, setBudgets] = useState<BudgetItem[]>(fallbackBudgets);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [budgetType, setBudgetType] = useState<BudgetType>("Fijo");
  const [dragOver, setDragOver] = useState<"fixed" | "variable" | null>(null);

  useEffect(() => {
    const loadBudgets = async () => {
      try {
        if (!getUserId()) {
          setBudgets([]);
          return;
        }
        const response = await fetchBudgets();
        setBudgets(response.data as BudgetItem[]);
      } catch {
        setBudgets([]);
      }
    };
    void loadBudgets();
    const handler = () => loadBudgets();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
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
    void loadCategories();
    const handler = () => loadCategories();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  useEffect(() => {
    const loadMovements = async () => {
      try {
        if (!getUserId()) {
          setMovements([]);
          return;
        }
        const response = await fetchMovements();
        setMovements(response.data as Movement[]);
      } catch {
        setMovements([]);
      }
    };
    void loadMovements();
    const handler = () => loadMovements();
    window.addEventListener("finanzapp:data-updated", handler);
    return () => window.removeEventListener("finanzapp:data-updated", handler);
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.name, cat]));
  }, [categories]);

  const filterByType = (type: BudgetType, source = budgets) => {
    const periodKey = type === "Fijo" ? "fixed" : "variable";
    return source.filter((budget) => {
      if (!budget.period) return true;
      return budget.period === periodKey;
    });
  };

  const implicitVariableBudgets = useMemo(() => {
    if (movements.length === 0) return [] as BudgetItem[];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const budgetedCategories = new Set(budgets.map((budget) => budget.category));

    const gastoMap = new Map<string, number>();
    movements.forEach((movement) => {
      if (movement.tipo !== "Gasto") return;
      const date = new Date(movement.fecha);
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
      const current = gastoMap.get(movement.categoria) ?? 0;
      gastoMap.set(movement.categoria, current + Math.abs(movement.cantidad));
    });

    return Array.from(gastoMap.entries())
      .filter(([category]) => !budgetedCategories.has(category))
      .map(([category, spent]) => ({
        id: `implicit-${category}`,
        category,
        limit: 0,
        spent,
        period: "variable",
        isImplicit: true,
      }));
  }, [movements, budgets]);

  const spentByCategory = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const map = new Map<string, number>();
    movements.forEach((movement) => {
      if (movement.tipo !== "Gasto") return;
      const date = new Date(movement.fecha);
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
      const current = map.get(movement.categoria) ?? 0;
      map.set(movement.categoria, current + Math.abs(movement.cantidad));
    });
    return map;
  }, [movements]);

  const budgetsWithSpent = useMemo(() => {
    return budgets.map((budget) => ({
      ...budget,
      spent: spentByCategory.get(budget.category) ?? 0,
    }));
  }, [budgets, spentByCategory]);

  // Filtrar presupuestos según tipo (Fijo/Variable)
  const filteredBudgets = useMemo(() => {
    const list = filterByType(budgetType, budgetsWithSpent);
    if (budgetType === "Variable") {
      return [...list, ...implicitVariableBudgets];
    }
    return list;
  }, [budgetsWithSpent, budgetType, implicitVariableBudgets]);

  const fixedBudgets = useMemo(() => filterByType("Fijo", budgetsWithSpent), [budgetsWithSpent]);
  const variableBudgets = useMemo(
    () => [...filterByType("Variable", budgetsWithSpent), ...implicitVariableBudgets],
    [budgetsWithSpent, implicitVariableBudgets]
  );

  const handleDrop = async (target: "fixed" | "variable", payload?: string | null) => {
    if (!payload) return;
    const [id, category, spent] = payload.split("|");
    const targetPeriod = target === "fixed" ? "fixed" : "variable";
    try {
      if (id.startsWith("implicit-")) {
        await createBudget({
          category,
          limit: 0,
          spent: Number(spent) || 0,
          period: targetPeriod,
        });
      } else {
        await updateBudget(id, { period: targetPeriod });
      }
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } finally {
      setDragOver(null);
    }
  };

  const totals = useMemo(() => {
    const list = mode === "combined" ? budgetsWithSpent : filteredBudgets;
    const totalLimit = list.reduce((acc, item) => acc + item.limit, 0);
    const totalSpent = list.reduce((acc, item) => acc + item.spent, 0);
    const percent = totalLimit ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, percent };
  }, [budgetsWithSpent, filteredBudgets, mode]);

  const isOver = totals.totalSpent > totals.totalLimit;

  const budgetTypes: BudgetType[] = ["Fijo", "Variable"];
  const showTwoColumns = filteredBudgets.length > 2;
  const listClassName = showTwoColumns
    ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
    : "space-y-2";

  return (
    <Card className={`p-6 flex flex-col gap-3 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Presupuestos del mes</p>
          <h3 className="text-sm font-semibold">Estado general</h3>
        </div>
        <div className="flex items-center gap-2">
          {mode === "selector" && (
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
              {budgetTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBudgetType(type)}
                  className="relative px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition"
                >
                  {budgetType === type && (
                    <motion.span
                      layoutId="budget-type-pill"
                      className="absolute inset-0 rounded-full bg-background shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={budgetType === type ? "relative text-foreground" : "relative"}>
                    {type}
                  </span>
                </button>
              ))}
            </div>
          )}
          <BudgetManager />
        </div>
      </div>
      <div className="text-2xl font-bold">
        € {formatNumber(totals.totalSpent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
        <span className="text-sm text-muted-foreground">
          / € {formatNumber(totals.totalLimit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <AnimatedProgress
        value={Math.min(totals.percent, 100)}
        className={isOver ? "[&>div]:bg-rose-500" : ""}
      />
      <div className={`text-xs font-medium ${isOver ? "text-rose-500" : "text-emerald-600"}`}>
        {isOver ? "Has superado el presupuesto" : "Vas dentro del presupuesto"}
      </div>
      <div className="pt-2 text-sm flex-1 min-h-0 overflow-hidden">
        {mode === "combined" ? (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 h-full min-h-0">
            {[
              { label: "Fijo", list: fixedBudgets },
              { label: "Variable", list: variableBudgets },
            ].map(({ label, list }) => (
              <div
                key={label}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(label === "Fijo" ? "fixed" : "variable");
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const payload = event.dataTransfer.getData("text/plain");
                  handleDrop(label === "Fijo" ? "fixed" : "variable", payload);
                }}
                className={`rounded-xl border border-border/70 bg-muted/10 p-3 shadow-sm flex flex-col h-full min-h-0 transition ${
                  dragOver === (label === "Fijo" ? "fixed" : "variable")
                    ? "ring-2 ring-primary/40"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    € {formatNumber(list.reduce((acc, item) => acc + item.spent, 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{" "}
                    {formatNumber(list.reduce((acc, item) => acc + item.limit, 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-px w-full bg-border/50 mb-3" />
                {list.length > 0 ? (
                  <div className="flex-1 min-h-0 max-h-[420px] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {list
                        .slice()
                        .sort((a, b) => b.limit - a.limit)
                        .map((budget) => {
                        const meta = categoryMap.get(budget.category) ?? FALLBACK_CATEGORY_META[budget.category];
                        const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                        const isOver = budget.spent > budget.limit;
                        const percent = budget.limit
                          ? Math.min((budget.spent / budget.limit) * 100, 100)
                          : 100;
                        return (
                          <div
                            key={budget.id}
                            className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                `${budget.id}|${budget.category}|${budget.spent}`
                              );
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="flex h-7 w-7 items-center justify-center rounded-md"
                                  style={{ backgroundColor: meta ? `${meta.color}25` : "hsl(var(--muted))", color: meta?.color }}
                                >
                                  {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">€</span>}
                                </span>
                                <span className="font-medium truncate">{budget.category}</span>
                                {budget.isImplicit && (
                                  <span
                                    className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
                                    title="Sin presupuesto"
                                    aria-label="Sin presupuesto"
                                  >
                                    <Ban className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                € {formatNumber(budget.spent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{" "}
                                {formatNumber(budget.limit || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <AnimatedProgress
                              value={isOver ? 100 : percent}
                              className="mt-2"
                              indicatorClassName={isOver ? "!bg-rose-500" : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    No hay presupuestos {label.toLowerCase()}s configurados
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          filteredBudgets.length > 0 ? (
            <div className="max-h-[260px] overflow-y-auto pr-1">
              <div className={listClassName}>
                {filteredBudgets
                  .slice()
                  .sort((a, b) => b.limit - a.limit)
                  .map((budget) => {
                  const meta = categoryMap.get(budget.category) ?? FALLBACK_CATEGORY_META[budget.category];
                  const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                  const isOver = budget.spent > budget.limit;
                  const percent = Math.min((budget.spent / budget.limit) * 100, 100);
                  return (
                    <div key={budget.id} className="rounded-lg border border-border/70 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: meta ? `${meta.color}20` : "hsl(var(--muted))", color: meta?.color }}
                          >
                            {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">€</span>}
                          </span>
                          <span className="font-medium truncate">{budget.category}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          € {formatNumber(budget.spent, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /{" "}
                          {formatNumber(budget.limit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <AnimatedProgress
                        value={isOver ? 100 : percent}
                        className="mt-2"
                        indicatorClassName={isOver ? "!bg-rose-500" : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              No hay presupuestos {budgetType.toLowerCase()}s configurados
            </div>
          )
        )}
      </div>
    </Card>
  );
}
