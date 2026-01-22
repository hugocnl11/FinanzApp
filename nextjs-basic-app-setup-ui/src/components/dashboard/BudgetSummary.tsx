"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { loadFromStorage } from "@/lib/storage";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { Pencil } from "lucide-react";
import { motion } from "framer-motion";

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
};

type CategoryItem = {
  id: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
};

const fallbackBudgets: BudgetItem[] = [
  // Fijos
  { id: "bud-1", category: "Vivienda", limit: 850, spent: 620 },
  { id: "bud-2", category: "Garaje", limit: 90, spent: 90 },
  { id: "bud-3", category: "Gimnasio", limit: 45, spent: 45 },
  { id: "bud-4", category: "Seguros", limit: 120, spent: 110 },
  { id: "bud-5", category: "Servicios", limit: 160, spent: 145 },
  // Variables
  { id: "bud-6", category: "Comida", limit: 420, spent: 310 },
  { id: "bud-7", category: "Ocio", limit: 180, spent: 120 },
  { id: "bud-8", category: "Ropa", limit: 140, spent: 60 },
  { id: "bud-9", category: "Transporte", limit: 180, spent: 190 },
  { id: "bud-10", category: "Salud", limit: 90, spent: 40 },
  { id: "bud-11", category: "Educación", limit: 120, spent: 30 },
  { id: "bud-12", category: "Viajes", limit: 260, spent: 140 },
  { id: "bud-13", category: "Regalos", limit: 110, spent: 65 },
];

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
  const [budgetType, setBudgetType] = useState<BudgetType>("Fijo");

  useEffect(() => {
    const loadBudgets = () => {
      const stored = loadFromStorage<BudgetItem[]>("budgets", fallbackBudgets);
      if (stored.length > 0) {
        setBudgets(stored);
      }
    };
    
    loadBudgets();
    
    // Escuchar cambios en storage
    const handler = () => loadBudgets();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const stored = loadFromStorage<CategoryItem[]>("categories", []);
    if (stored.length > 0) {
      setCategories(stored);
    }
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.name, cat]));
  }, [categories]);

  const filterByType = (type: BudgetType) => {
    const categoriesToShow = type === "Fijo" ? FIXED_CATEGORIES : VARIABLE_CATEGORIES;
    return budgets.filter((budget) =>
      categoriesToShow.some((cat) =>
        budget.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(budget.category.toLowerCase())
      )
    );
  };

  // Filtrar presupuestos según tipo (Fijo/Variable)
  const filteredBudgets = useMemo(() => filterByType(budgetType), [budgets, budgetType]);
  const fixedBudgets = useMemo(() => filterByType("Fijo"), [budgets]);
  const variableBudgets = useMemo(() => filterByType("Variable"), [budgets]);

  const totals = useMemo(() => {
    const list = mode === "combined" ? budgets : filteredBudgets;
    const totalLimit = list.reduce((acc, item) => acc + item.limit, 0);
    const totalSpent = list.reduce((acc, item) => acc + item.spent, 0);
    const percent = totalLimit ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, percent };
  }, [budgets, filteredBudgets, mode]);

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
        € {totals.totalSpent.toFixed(0)}{" "}
        <span className="text-sm text-muted-foreground">/ € {totals.totalLimit.toFixed(0)}</span>
      </div>
      <Progress
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
                className="rounded-xl border border-border/70 bg-muted/10 p-3 shadow-sm flex flex-col h-full min-h-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    € {list.reduce((acc, item) => acc + item.spent, 0).toFixed(0)} /{" "}
                    {list.reduce((acc, item) => acc + item.limit, 0).toFixed(0)}
                  </span>
                </div>
                <div className="h-px w-full bg-border/50 mb-3" />
                {list.length > 0 ? (
                  <div className="flex-1 min-h-0 max-h-[420px] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {list.map((budget) => {
                        const meta = categoryMap.get(budget.category) ?? FALLBACK_CATEGORY_META[budget.category];
                        const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                        const percent = Math.min((budget.spent / budget.limit) * 100, 120);
                        return (
                          <div
                            key={budget.id}
                            className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
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
                              </div>
                              <span className="text-xs text-muted-foreground">
                                € {budget.spent} / {budget.limit}
                              </span>
                            </div>
                            <Progress
                              value={percent}
                              className={`mt-2 ${budget.spent > budget.limit ? "[&>div]:bg-rose-500" : ""}`}
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
                {filteredBudgets.map((budget) => {
                  const meta = categoryMap.get(budget.category) ?? FALLBACK_CATEGORY_META[budget.category];
                  const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                  const percent = Math.min((budget.spent / budget.limit) * 100, 120);
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
                          € {budget.spent} / {budget.limit}
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className={`mt-2 ${budget.spent > budget.limit ? "[&>div]:bg-rose-500" : ""}`}
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
