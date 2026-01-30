"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { Pencil, ChevronDown, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getUserId } from "@/lib/auth";
import { fetchBudgets, createBudget, updateBudget, deleteBudget } from "@/lib/api/budgets";
import { fetchCategories } from "@/lib/api/categories";
import type { Category } from "@/lib/dashboard/types";
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

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period?: string;
};

const initialBudgets: BudgetItem[] = [];

const categories: string[] = [];

type BudgetType = "Fijo" | "Variable";

type BudgetManagerProps = {
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
};

export function BudgetManager({
  triggerLabel,
  triggerVariant,
  triggerSize,
  triggerClassName,
}: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<BudgetItem[]>(initialBudgets);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [budgetType, setBudgetType] = useState<BudgetType>("Fijo");
  const [formData, setFormData] = useState({
    category: categories[0] ?? "",
    limit: "",
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<"fixed" | "variable" | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const hasLabel = Boolean(triggerLabel);
  const expenseCategories = categoriesData.filter((category) => category.type === "expense");

  // Mapa de categorías para búsqueda rápida
  const categoryMap = useMemo(() => {
    return new Map(categoriesData.map((cat) => [cat.name, cat]));
  }, [categoriesData]);

  // Filtrar presupuestos según tipo (period): solo los que coinciden con la pestaña (Fijo = fixed, Variable = variable)
  const periodKey = budgetType === "Fijo" ? "fixed" : "variable";
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => budget.period === periodKey);
  }, [budgets, budgetType]);

  // Lista para mostrar: solo presupuestos reales creados por el usuario (sin filas "0 de 0")
  const displayBudgets = filteredBudgets;

  const totalLimit = useMemo(
    () => filteredBudgets.reduce((acc, item) => acc + item.limit, 0),
    [filteredBudgets]
  );

  const totalSpent = useMemo(
    () => filteredBudgets.reduce((acc, item) => acc + item.spent, 0),
    [filteredBudgets]
  );

  useEffect(() => {
    const load = async () => {
      const uid = getUserId();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BudgetManager.tsx:load',message:'load start',data:{hasUserId:!!uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      if (!uid) {
        setBudgets([]);
        setCategoriesData([]);
        return;
      }
      try {
        const [budgetsRes, categoriesRes] = await Promise.all([
          fetchBudgets(),
          fetchCategories(),
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BudgetManager.tsx:load',message:'load success',data:{budgetsLen:budgetsRes?.data?.length,categoriesLen:categoriesRes?.data?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        setBudgets(budgetsRes.data as BudgetItem[]);
        setCategoriesData(categoriesRes.data as Category[]);
      } catch (error) {
        // #region agent log
        const err = error instanceof Error ? error : new Error(String(error));
        fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BudgetManager.tsx:load',message:'load catch',data:{errorMessage:err.message.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
        // #endregion
        console.error(error);
        setBudgets([]);
        setCategoriesData([]);
        setStatusMessage("No se pudieron cargar los presupuestos.");
      }
    };
    void load();
  }, []);

  // Todas las categorías de gasto para el desplegable "Nuevo presupuesto" (Fijo y Variable)
  const selectedCategory = expenseCategories.find((cat) => cat.name === formData.category);

  useEffect(() => {
    if (!formData.category && expenseCategories.length > 0) {
      setFormData((prev) => ({ ...prev, category: expenseCategories[0].name }));
    }
    if (formData.category && !expenseCategories.some((c) => c.name === formData.category)) {
      setFormData((prev) => ({
        ...prev,
        category: expenseCategories[0]?.name ?? "",
      }));
    }
  }, [expenseCategories, formData.category]);

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
      const existing = budgets.find(
        (item) => item.category === formData.category && item.period === (budgetType === "Fijo" ? "fixed" : "variable")
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
          period: budgetType === "Fijo" ? "fixed" : "variable",
        });
        setBudgets((prev) => [...prev, created.data as BudgetItem]);
      }
      setFormData((prev) => ({ ...prev, limit: "" }));
      setStatusMessage("Presupuesto guardado correctamente.");
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch (error) {
      console.error(error);
      setStatusMessage("No se pudo guardar el presupuesto.");
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

  const handleStartEdit = (budget: BudgetItem) => {
    setEditingBudgetId(budget.id);
    setEditingLimit(String(budget.limit));
    setEditingPeriod(
      budget.id.startsWith("new-") ? null : (budget.period === "fixed" ? "fixed" : "variable")
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
    const categoryName = isNew ? editingBudgetId.replace(/^new-/, "") : undefined;
    try {
      if (isNew && categoryName) {
        const created = await createBudget({
          category: categoryName,
          limit: limitValue,
          spent: 0,
          period: budgetType === "Fijo" ? "fixed" : "variable",
        });
        setBudgets((prev) => [...prev, created.data as BudgetItem]);
        setStatusMessage("Presupuesto creado.");
      } else {
        const newPeriod = editingPeriod ?? periodKey;
        const updated = await updateBudget(editingBudgetId, { limit: limitValue, period: newPeriod });
        const updatedItem = updated.data as BudgetItem;
        setBudgets((prev) =>
          prev.map((item) => (item.id === editingBudgetId ? updatedItem : item))
        );
        setStatusMessage("Presupuesto actualizado.");
        if (newPeriod !== periodKey) {
          setBudgetType(newPeriod === "fixed" ? "Fijo" : "Variable");
        }
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Presupuestos mensuales</DialogTitle>
              <DialogDescription>
                Define límites por categoría y visualiza tu consumo actual.
              </DialogDescription>
            </div>
            {/* Selector Fijo/Variable */}
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
              {(["Fijo", "Variable"] as BudgetType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBudgetType(type)}
                  className="relative px-3 py-1 text-xs font-medium text-muted-foreground transition"
                >
                  {budgetType === type && (
                    <motion.span
                      layoutId="budget-manager-pill"
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
          </div>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Presupuesto total</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-semibold">€ {totalLimit.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Gastado € {totalSpent.toFixed(0)}</p>
              </div>
              <Progress value={Math.min((totalSpent / (totalLimit || 1)) * 100, 100)} />
            </div>

            <div className="space-y-3">
              {displayBudgets.length > 0 ? (
                displayBudgets.map((budget) => {
                  const limitNum = budget.limit || 0;
                  const percent = limitNum > 0 ? Math.min((budget.spent / limitNum) * 100, 130) : 0;
                  const isOver = limitNum > 0 && budget.spent > limitNum;
                  const categoryMeta = categoryMap.get(budget.category);
                  const meta = categoryMeta 
                    ? { icon: categoryMeta.icon as CategoryIconKey, color: categoryMeta.color }
                    : FALLBACK_CATEGORY_META[budget.category];
                  const Icon = meta ? CATEGORY_ICON_MAP[meta.icon] : null;
                  const categoryColor = meta?.color || "#64748b";
                  const isEditing = editingBudgetId === budget.id;
                  return (
                    <div 
                      key={budget.id} 
                      className="rounded-2xl p-4 shadow-sm transition-all hover:shadow-md"
                      style={{ 
                        borderTop: `1px solid ${categoryColor}30`,
                        borderRight: `1px solid ${categoryColor}30`,
                        borderBottom: `1px solid ${categoryColor}30`,
                        borderLeft: `1px solid ${categoryColor}30`,
                        backgroundColor: `${categoryColor}08`
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {Icon && (
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                              style={{ 
                                backgroundColor: meta ? `${meta.color}25` : "hsl(var(--muted))", 
                                color: meta?.color 
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{budget.category}</p>
                            {isEditing ? (
                              <div className="mt-2 flex flex-col gap-3">
                                {!budget.id.startsWith("new-") && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                                    <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
                                      {(["fixed", "variable"] as const).map((p) => (
                                        <button
                                          key={p}
                                          type="button"
                                          onClick={() => setEditingPeriod(p)}
                                          className={cn(
                                            "px-2 py-1 text-xs font-medium rounded-md transition",
                                            editingPeriod === p
                                              ? "bg-background shadow-sm text-foreground"
                                              : "text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          {p === "fixed" ? "Fijo" : "Variable"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
                                € {budget.spent} de € {budget.limit || 0}
                              </p>
                            )}
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStartEdit(budget)}
                              aria-label="Editar límite"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!budget.id.startsWith("new-") && (
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
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <>
                          <Progress
                            value={percent}
                            className={`mt-2 ${isOver ? "[&>div]:bg-rose-500" : ""}`}
                          />
                          {isOver && (
                            <p className="mt-2 text-xs font-medium text-rose-500">
                              Has superado el límite en € {budget.spent - budget.limit}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No hay presupuestos en {budgetType === "Fijo" ? "fijo" : "variable"}. Crea uno con el formulario de la derecha.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold">Nuevo presupuesto</h3>
              <p className="text-xs text-muted-foreground">
                Selecciona una categoría y su límite mensual.
              </p>
            </div>

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
                          color: selectedCategory.color 
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
                {isCategoryDropdownOpen && expenseCategories.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-auto">
                    {expenseCategories.map((category) => {
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
                              color: category.color 
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
                {expenseCategories.length === 0 && (
                  <div className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground text-center">
                    Sin categorías de gasto. Crea categorías en Ajustes.
                  </div>
                )}
              </div>
            </div>

            <Input
              label="Límite mensual (€)"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
