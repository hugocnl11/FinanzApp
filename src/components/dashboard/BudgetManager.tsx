"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pencil, Plus, ChevronDown, ChevronRight, ChevronLeft, Trash2, ArrowDownCircle, TrendingUp, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getUserId } from "@/lib/auth";
import { useDashboardDataContext } from "@/contexts/DashboardDataContext";
import { fetchBudgets, createBudget, updateBudget, deleteBudget } from "@/lib/api/budgets";
import { fetchCategories } from "@/lib/api/categories";
import { fetchMovements } from "@/lib/api/movements";
import type { Category } from "@/lib/dashboard/types";
import type { Movement, MovementType } from "@/lib/dashboard/types";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";

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

type BudgetPeriod = "fixed" | "variable";

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "fixed", label: "Fijo" },
  { value: "variable", label: "Mensual" },
];

function normalizePeriod(period: string | undefined): BudgetPeriod {
  const p = (period ?? "variable").toLowerCase();
  if (p === "fixed") return "fixed";
  return "variable";
}

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period?: string;
};

const initialBudgets: BudgetItem[] = [];

const categories: string[] = [];

const MONTH_NAMES: string[] = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getInitialSelectedMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

const MAX_MONTHS_BACK = 24;

type BudgetManagerProps = {
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  /** Si true, renderiza el contenido directamente en la página sin Dialog */
  inline?: boolean;
};

export function BudgetManager({
  triggerLabel,
  triggerVariant,
  triggerSize,
  triggerClassName,
  inline = false,
}: BudgetManagerProps) {
  const dashboardContext = useDashboardDataContext();
  const [budgets, setBudgets] = useState<BudgetItem[]>(initialBudgets);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const useContextData = Boolean(dashboardContext);
  const budgetsSource = useContextData ? (dashboardContext!.data.budgets as BudgetItem[]) : budgets;
  const categoriesDataSource = useContextData ? (dashboardContext!.data.categories ?? []) : categoriesData;
  const movementsSource = useContextData ? dashboardContext!.data.movimientos : movements;
  const loadingSource = useContextData ? dashboardContext!.loading : loading;
  const [formData, setFormData] = useState({
    category: categories[0] ?? "",
    limit: "",
    period: "variable" as BudgetPeriod,
  });
  const [implicitPeriodOverrides, setImplicitPeriodOverrides] = useState<Record<string, BudgetPeriod>>({});
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<BudgetPeriod | null>(null);
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>(getInitialSelectedMonth);
  const [openNewBudgetDialog, setOpenNewBudgetDialog] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const hasLabel = Boolean(triggerLabel);
  // Presupuestos: gasto, inversión o ahorro (categorías con límite mensual)
  const budgetableCategories = categoriesDataSource.filter((category) =>
    category.type === "expense" || category.type === "investment" || category.type === "savings"
  );

  // Mapa de categorías para búsqueda rápida
  const categoryMap = useMemo(() => {
    return new Map(categoriesDataSource.map((cat) => [cat.name, cat]));
  }, [categoriesDataSource]);

  // Tipo de movimiento que corresponde a cada tipo de categoría (para calcular "gastado" del presupuesto)
  const movementTypeByCategoryType = useMemo(
    () =>
      new Map<"expense" | "investment" | "savings", Movement["tipo"]>([
        ["expense", "Gasto"],
        ["investment", "Inversión"],
        ["savings", "Ahorro"],
      ]),
    []
  );

  const isMovementInSelectedMonth = useCallback(
    (fecha: string) => {
      const parts = fecha.split("-").map(Number);
      const y = parts[0];
      const m = parts[1];
      return y === selectedMonth.year && m === selectedMonth.month + 1;
    },
    [selectedMonth.year, selectedMonth.month]
  );

  // Gastado/invertido/ahorrado por categoría en el mes seleccionado (según tipo de categoría)
  const spentByCategoryThisMonth = useMemo(() => {
    const map = new Map<string, number>();
    const categoryTypes = new Map(
      categoriesDataSource
        .filter((c) => c.type === "expense" || c.type === "investment" || c.type === "savings")
        .map((c) => [c.name, c.type as "expense" | "investment" | "savings"])
    );
    movementsSource.forEach((movement) => {
      const categoryType = categoryTypes.get(movement.categoria);
      if (!categoryType) return;
      const expectedTipo = movementTypeByCategoryType.get(categoryType);
      if (movement.tipo !== expectedTipo) return;
      if (!isMovementInSelectedMonth(movement.fecha)) return;
      const amount = Math.abs(movement.cantidad);
      map.set(movement.categoria, (map.get(movement.categoria) ?? 0) + amount);
    });
    return map;
  }, [movementsSource, categoriesDataSource, movementTypeByCategoryType, isMovementInSelectedMonth]);

  const budgetsWithSpent = useMemo(
    () =>
      budgetsSource.map((b) => ({
        ...b,
        spent: spentByCategoryThisMonth.get(b.category) ?? 0,
      })),
    [budgetsSource, spentByCategoryThisMonth]
  );

  // Categorías con gasto este mes que no tienen ningún presupuesto (ni fijo ni variable)
  const categoriesWithAnyBudget = useMemo(
    () => new Set(budgetsSource.map((b) => b.category)),
    [budgetsSource]
  );
  const implicitBudgets = useMemo(() => {
    if (movementsSource.length === 0) return [];
    return Array.from(spentByCategoryThisMonth.entries())
      .filter(([category]) => !categoriesWithAnyBudget.has(category))
      .map(([category, spent]) => ({
        id: `implicit-${category}`,
        category,
        limit: 0,
        spent,
        period: (implicitPeriodOverrides[category] ?? "variable") as BudgetPeriod,
      }));
  }, [movementsSource.length, spentByCategoryThisMonth, categoriesWithAnyBudget, implicitPeriodOverrides]);

  const displayBudgets = useMemo(
    () => [...budgetsWithSpent, ...implicitBudgets],
    [budgetsWithSpent, implicitBudgets]
  );

  const fixedBudgets = useMemo(
    () => displayBudgets.filter((b) => normalizePeriod(b.period) === "fixed"),
    [displayBudgets]
  );
  const variableBudgets = useMemo(
    () => displayBudgets.filter((b) => normalizePeriod(b.period) === "variable"),
    [displayBudgets]
  );

  const totalLimit = useMemo(
    () => displayBudgets.reduce((acc, item) => acc + item.limit, 0),
    [displayBudgets]
  );

  const totalSpent = useMemo(
    () => displayBudgets.reduce((acc, item) => acc + item.spent, 0),
    [displayBudgets]
  );

  // Movimientos del mes seleccionado por presupuesto (para el desglose desplegable)
  const movementsByBudgetId = useMemo(() => {
    const categoryTypes = new Map(
      categoriesDataSource
        .filter((c) => c.type === "expense" || c.type === "investment" || c.type === "savings")
        .map((c) => [c.name, c.type as "expense" | "investment" | "savings"])
    );
    const map = new Map<string, Movement[]>();
    displayBudgets.forEach((budget) => {
      const categoryType = categoryTypes.get(budget.category);
      if (!categoryType) {
        map.set(budget.id, []);
        return;
      }
      const expectedTipo = movementTypeByCategoryType.get(categoryType);
      if (!expectedTipo) {
        map.set(budget.id, []);
        return;
      }
      const list = movementsSource
        .filter(
          (m) =>
            m.categoria === budget.category &&
            m.tipo === expectedTipo &&
            isMovementInSelectedMonth(m.fecha)
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      map.set(budget.id, list);
    });
    return map;
  }, [displayBudgets, movementsSource, categoriesDataSource, movementTypeByCategoryType, isMovementInSelectedMonth]);

  const getTipoIcon = (tipo: MovementType) => {
    switch (tipo) {
      case "Gasto":
        return <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case "Inversión":
        return <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />;
      case "Ahorro":
        return <PiggyBank className="h-4 w-4 text-emerald-500 shrink-0" />;
      default:
        return null;
    }
  };

  const formatMovementDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  useEffect(() => {
    if (dashboardContext) return;
    const load = async () => {
      setLoading(true);
      const uid = getUserId();
      if (!uid) {
        setBudgets([]);
        setCategoriesData([]);
        setMovements([]);
        setLoading(false);
        return;
      }
      try {
        const [budgetsRes, categoriesRes, movementsRes] = await Promise.all([
          fetchBudgets(),
          fetchCategories(),
          fetchMovements(),
        ]);
        setBudgets(budgetsRes.data as BudgetItem[]);
        setCategoriesData(categoriesRes.data as Category[]);
        setMovements(movementsRes.data as Movement[]);
      } catch (error) {
        console.error(error);
        setBudgets([]);
        setCategoriesData([]);
        setMovements([]);
        setStatusMessage("No se pudieron cargar los presupuestos.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    const onUpdate = () => load();
    window.addEventListener("finanzapp:data-updated", onUpdate);
    return () => window.removeEventListener("finanzapp:data-updated", onUpdate);
  }, [dashboardContext]);

  const selectedCategory = budgetableCategories.find((cat) => cat.name === formData.category);

  useEffect(() => {
    if (!formData.category && budgetableCategories.length > 0) {
      setFormData((prev) => ({ ...prev, category: budgetableCategories[0].name }));
    }
    if (formData.category && !budgetableCategories.some((c) => c.name === formData.category)) {
      setFormData((prev) => ({
        ...prev,
        category: budgetableCategories[0]?.name ?? "",
      }));
    }
  }, [budgetableCategories, formData.category]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const handleAddBudget = async () => {
    const limitValue = Number(formData.limit);
    if (!formData.category || !limitValue) {
      setStatusMessage("Selecciona una categoría y define un límite válido.");
      return;
    }
    try {
      const period = formData.period;
      const existing = budgetsSource.find(
        (item) => item.category === formData.category && (item.period ?? "").toLowerCase() === period
      );
      if (existing) {
        const updated = await updateBudget(existing.id, { limit: limitValue });
        setBudgets((prev) =>
          prev.map((item) => (item.id === existing.id ? (updated.data as BudgetItem) : item))
        );
      } else {
        const created = await createBudget({
          category: formData.category,
          limit: limitValue,
          spent: 0,
          period,
        });
        setBudgets((prev) => [...prev, created.data as BudgetItem]);
      }
      setFormData((prev) => ({ ...prev, limit: "" }));
      setStatusMessage("Presupuesto guardado correctamente.");
      setOpenNewBudgetDialog(false);
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch (error) {
      console.error(error);
      setStatusMessage("No se pudo guardar el presupuesto.");
    }
  };

  const handlePeriodChange = async (budget: BudgetItem & { spent: number }, newPeriod: BudgetPeriod) => {
    if (budget.id.startsWith("implicit-")) {
      setImplicitPeriodOverrides((prev) => ({ ...prev, [budget.category]: newPeriod }));
      return;
    }
    if (budget.id.startsWith("new-")) return;
    try {
      const updated = await updateBudget(budget.id, { period: newPeriod });
      setBudgets((prev) =>
        prev.map((item) => (item.id === budget.id ? (updated.data as BudgetItem) : item))
      );
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch (error) {
      console.error(error);
      setStatusMessage("No se pudo actualizar el tipo.");
    }
  };

  const handleRemove = async (id: string) => {
    if (id.startsWith("new-")) {
      return;
    }
    await deleteBudget(id);
    setBudgets((prev) => prev.filter((item) => item.id !== id));
    if (editingBudgetId === id) setEditingBudgetId(null);
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const handleStartEdit = (budget: BudgetItem & { period?: string }) => {
    setEditingBudgetId(budget.id);
    setEditingLimit(String(budget.limit));
    setEditingPeriod(
      budget.id.startsWith("new-") ? null : normalizePeriod(budget.period)
    );
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditingLimit("");
    setEditingPeriod(null);
  };

  const handleSaveEdit = async () => {
    if (!editingBudgetId) return;
    const limitValue = Number(editingLimit);
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      setStatusMessage("Introduce un límite válido.");
      return;
    }
    const isNew = editingBudgetId.startsWith("new-");
    const isImplicit = editingBudgetId.startsWith("implicit-");
    const categoryName = isNew
      ? editingBudgetId.replace(/^new-/, "")
      : isImplicit
        ? editingBudgetId.replace(/^implicit-/, "")
        : undefined;
    const periodForImplicit = isImplicit && categoryName
      ? (implicitPeriodOverrides[categoryName] ?? "variable")
      : "variable";
    try {
      if ((isNew || isImplicit) && categoryName) {
        const created = await createBudget({
          category: categoryName,
          limit: limitValue,
          spent: 0,
          period: isImplicit ? periodForImplicit : (editingPeriod ?? "variable"),
        });
        setBudgets((prev) => [...prev, created.data as BudgetItem]);
        setImplicitPeriodOverrides((prev) => {
          const next = { ...prev };
          delete next[categoryName];
          return next;
        });
        setStatusMessage("Presupuesto creado.");
      } else {
        const newPeriod = editingPeriod ?? (displayBudgets.find((b) => b.id === editingBudgetId)?.period ?? "variable");
        const normalizedPeriod = normalizePeriod(newPeriod?.toString());
        const updated = await updateBudget(editingBudgetId, { limit: limitValue, period: normalizedPeriod });
        const updatedItem = updated.data as BudgetItem;
        setBudgets((prev) =>
          prev.map((item) => (item.id === editingBudgetId ? updatedItem : item))
        );
        setStatusMessage("Presupuesto actualizado.");
      }
      setEditingBudgetId(null);
      setEditingLimit("");
      setEditingPeriod(null);
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch (error) {
      console.error(error);
      setStatusMessage("No se pudo guardar el presupuesto.");
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const oldestDate = new Date(currentYear, currentMonthIdx - MAX_MONTHS_BACK, 1);
  const canGoPrev = selectedMonth.year > oldestDate.getFullYear() || (selectedMonth.year === oldestDate.getFullYear() && selectedMonth.month > oldestDate.getMonth());
  const canGoNext = selectedMonth.year < currentYear || (selectedMonth.year === currentYear && selectedMonth.month < currentMonthIdx);
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth.month]} ${selectedMonth.year}`;

  const renderBudgetCard = (budget: (typeof displayBudgets)[0]) => {
    const limitNum = budget.limit || 0;
    const percent = limitNum > 0 ? Math.min((budget.spent / limitNum) * 100, 130) : 0;
    const isOver = (limitNum > 0 && budget.spent > limitNum) || (limitNum === 0 && budget.spent > 0);
    const categoryMeta = categoryMap.get(budget.category);
    const meta = categoryMeta
      ? { icon: categoryMeta.icon as CategoryIconKey, color: categoryMeta.color }
      : FALLBACK_CATEGORY_META[budget.category];
    const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
    const categoryColor = meta?.color || "#64748b";
    const isEditing = editingBudgetId === budget.id;
    const isExpanded = expandedBudgetId === budget.id;
    const budgetMovements = movementsByBudgetId.get(budget.id) ?? [];
    return (
      <div
        key={budget.id}
        className={cn(
          "rounded-2xl shadow-sm transition-all hover:shadow-md",
          inline ? "p-3" : "p-4"
        )}
        style={{
          borderTop: `1px solid ${categoryColor}30`,
          borderRight: `1px solid ${categoryColor}30`,
          borderBottom: `1px solid ${categoryColor}30`,
          borderLeft: `1px solid ${categoryColor}30`,
          backgroundColor: `${categoryColor}08`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {inline && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => setExpandedBudgetId((id) => (id === budget.id ? null : budget.id))}
                aria-label={isExpanded ? "Cerrar desglose" : "Ver desglose de movimientos"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            {Icon && (
              <span
                className={cn(
                  "flex items-center justify-center rounded-md shrink-0",
                  inline ? "h-6 w-6" : "h-7 w-7"
                )}
                style={{
                  backgroundColor: meta ? `${meta.color}25` : "hsl(var(--muted))",
                  color: meta?.color,
                }}
              >
                <Icon className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{budget.category}</p>
              {isEditing ? (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Límite (€)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={editingLimit}
                        onChange={(e) => setEditingLimit(e.target.value)}
                        className="h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                      />
                      <Button variant="default" size="sm" className="h-9 text-xs" onClick={handleSaveEdit}>
                        Guardar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleCancelEdit}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  € {Number(budget.spent).toFixed(2)} de € {Number(budget.limit || 0).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
              {PERIOD_OPTIONS.map(({ value: p, label }) => {
                const rowPeriod = normalizePeriod(budget.period);
                const isSelected = rowPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodChange(budget, p)}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md transition",
                      isSelected
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleStartEdit(budget)}
                  aria-label="Editar límite"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!budget.id.startsWith("new-") && !budget.id.startsWith("implicit-") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(budget.id)}
                    aria-label="Quitar presupuesto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {!isEditing && (
          <>
            <Progress
              value={isOver ? 100 : percent}
              className={cn("mt-2", inline && "h-1.5", isOver && "[&>div]:bg-rose-500")}
            />
            {isOver && (
              <p className={cn("text-xs font-medium text-rose-500", inline ? "mt-1.5" : "mt-2")}>
                {limitNum > 0
                  ? `Has superado el límite en € ${(budget.spent - (budget.limit || 0)).toFixed(2)}`
                  : `Has gastado € ${Number(budget.spent).toFixed(2)} sin presupuesto definido`}
              </p>
            )}
            {inline && isExpanded && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-xs font-medium text-muted-foreground mb-2">Desglose de {selectedMonthLabel}</p>
                {budgetMovements.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay movimientos en {selectedMonthLabel} en esta categoría.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {budgetMovements.map((m) => (
                      <li
                        key={m.id ?? `${m.fecha}-${m.concepto}-${m.cantidad}`}
                        className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-background/60"
                      >
                        {getTipoIcon(m.tipo)}
                        <span className="min-w-0 truncate flex-1" title={m.concepto}>
                          {m.concepto}
                        </span>
                        <span className="text-muted-foreground shrink-0">{formatMovementDate(m.fecha)}</span>
                        <span className="font-medium tabular-nums shrink-0">
                          € {Math.abs(m.cantidad).toFixed(2)}
                        </span>
                        {m.metodoPago && (
                          <span className="text-xs text-muted-foreground shrink-0 truncate max-w-16" title={m.metodoPago}>
                            {m.metodoPago}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const newBudgetFormContent = (
    <>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Categoría</label>
        <div className="relative" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
                  style={{
                    backgroundColor: `${selectedCategory.color}25`,
                    color: selectedCategory.color,
                  }}
                >
                  {(() => {
                    const Icon = CATEGORY_ICON_MAP[selectedCategory.icon as CategoryIconKey];
                    return Icon ? <Icon className="h-3 w-3" /> : <span className="text-xs">€</span>;
                  })()}
                </span>
                <span className="text-left truncate">{selectedCategory.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecciona una categoría</span>
            )}
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCategoryDropdownOpen && "rotate-180")} />
          </button>
          {isCategoryDropdownOpen && budgetableCategories.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto">
              {budgetableCategories.map((category) => {
                const Icon = CATEGORY_ICON_MAP[category.icon as CategoryIconKey];
                const isSelected = formData.category === category.name;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, category: category.name }));
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted transition-colors",
                      isSelected && "bg-muted"
                    )}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
                      style={{
                        backgroundColor: `${category.color}25`,
                        color: category.color,
                      }}
                    >
                      {Icon ? <Icon className="h-3 w-3" /> : <span className="text-xs">€</span>}
                    </span>
                    <span className="text-left">{category.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {budgetableCategories.length === 0 && (
            <div className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground text-center">
              Sin categorías de gasto, inversión o ahorro. Crea categorías en Ajustes.
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Periodo</label>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
          {PERIOD_OPTIONS.map(({ value: p, label }) => (
            <button
              key={p}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, period: p }))}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md transition",
                formData.period === p
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Input
        label="Límite (€)"
        type="number"
        value={formData.limit}
        onChange={(event) =>
          setFormData((prev) => ({ ...prev, limit: event.target.value }))
        }
        placeholder="300"
      />
      <Button onClick={handleAddBudget}>Guardar presupuesto</Button>
      {statusMessage && (
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
      )}
    </>
  );

  const content = (
    <div className={cn(
      "space-y-6",
      inline && "w-full rounded-2xl border border-border bg-white dark:bg-[#18181b] p-6 ring-1 ring-border/50 shadow"
    )}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {inline && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Mes</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canGoPrev}
                onClick={() => {
                  setSelectedMonth((prev) => {
                    const d = new Date(prev.year, prev.month, 1);
                    d.setMonth(d.getMonth() - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  });
                }}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[8rem] text-center text-sm font-semibold tabular-nums">
                {selectedMonthLabel}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canGoNext}
                onClick={() => {
                  setSelectedMonth((prev) => {
                    const d = new Date(prev.year, prev.month, 1);
                    d.setMonth(d.getMonth() + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  });
                }}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <Button onClick={() => setOpenNewBudgetDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo presupuesto
        </Button>
      </div>

      {inline && (
        <div className="w-full rounded-2xl border border-border bg-card shadow p-4">
          <div className="flex items-center justify-between mt-0">
            <p className="text-4xl font-semibold tabular-nums">€ {Number(totalSpent).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">/ € {Number(totalLimit).toFixed(2)}</p>
          </div>
          <Progress value={Math.min((totalSpent / (totalLimit || 1)) * 100, 100)} className="mt-2 h-2" />
        </div>
      )}

      {displayBudgets.length === 0 ? (
        <div className="max-w-md mx-auto">
          <EmptyState
            title="No hay presupuestos"
            description="Crea uno con el botón Nuevo presupuesto"
            icon={<Pencil className="h-10 w-10 text-muted-foreground" />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cn("space-y-3", inline && "space-y-2")}>
            <h3 className="text-sm font-semibold text-foreground">Presupuestos fijos</h3>
            {fixedBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay presupuestos fijos.</p>
            ) : (
              <div className={cn(
                "overflow-y-auto pr-1",
                inline ? "space-y-2" : "space-y-3",
                !inline && "max-h-[18rem] md:max-h-[28rem]"
              )}>
                {fixedBudgets.map(renderBudgetCard)}
              </div>
            )}
          </div>
          <div className={cn("space-y-3", inline && "space-y-2")}>
            <h3 className="text-sm font-semibold text-foreground">Presupuestos variables</h3>
            {variableBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay presupuestos variables.</p>
            ) : (
              <div className={cn(
                "overflow-y-auto pr-1",
                inline ? "space-y-2" : "space-y-3",
                !inline && "max-h-[18rem] md:max-h-[28rem]"
              )}>
                {variableBudgets.map(renderBudgetCard)}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={openNewBudgetDialog} onOpenChange={setOpenNewBudgetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
            <DialogDescription>
              Selecciona una categoría (gasto, inversión o ahorro) y su límite mensual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {newBudgetFormContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (inline && loadingSource) {
    return (
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-[120px] w-full rounded-2xl" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
      </div>
    );
  }

  if (inline) {
    return <div className="min-w-0">{content}</div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant ?? (hasLabel ? "outline" : "ghost")}
          size={triggerSize ?? (hasLabel ? "sm" : "icon")}
          className={cn(hasLabel ? "w-full" : "h-8 w-8 p-0", triggerClassName)}
          aria-label={hasLabel ? undefined : "Gestionar presupuestos"}
        >
          {hasLabel ? triggerLabel : <Pencil className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="shrink-0 sticky top-0 z-10 bg-background border-b pr-12 pt-4 pb-3 pl-4">
          <DialogHeader>
            <DialogTitle>Presupuestos mensuales</DialogTitle>
            <DialogDescription>
              Define límites por categoría y visualiza tu consumo actual. Cada fila indica si es Fijo o Variable.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
