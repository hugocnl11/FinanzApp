"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { Pencil } from "lucide-react";
import { motion } from "framer-motion";

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
};

const initialBudgets: BudgetItem[] = [
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

const categories = [
  "Vivienda",
  "Garaje",
  "Gimnasio",
  "Seguros",
  "Servicios",
  "Comida",
  "Ocio",
  "Ropa",
  "Transporte",
  "Salud",
  "Educación",
  "Viajes",
  "Regalos",
];

type BudgetType = "Fijo" | "Variable";

// Categorías fijas y variables
const FIXED_CATEGORIES = ["Vivienda", "Alquiler", "Garaje", "Gimnasio", "Inversiones", "Seguros", "Servicios", "Suscripciones"];
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
  "Ahorro",
];

export function BudgetManager() {
  const [budgets, setBudgets] = useState<BudgetItem[]>(initialBudgets);
  const [budgetType, setBudgetType] = useState<BudgetType>("Fijo");
  const [formData, setFormData] = useState({
    category: categories[0],
    limit: "",
  });

  // Filtrar presupuestos según tipo
  const filteredBudgets = useMemo(() => {
    const categoriesToShow = budgetType === "Fijo" ? FIXED_CATEGORIES : VARIABLE_CATEGORIES;
    return budgets.filter((budget) => 
      categoriesToShow.some((cat) => 
        budget.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(budget.category.toLowerCase())
      )
    );
  }, [budgets, budgetType]);

  const totalLimit = useMemo(
    () => filteredBudgets.reduce((acc, item) => acc + item.limit, 0),
    [filteredBudgets]
  );

  const totalSpent = useMemo(
    () => filteredBudgets.reduce((acc, item) => acc + item.spent, 0),
    [filteredBudgets]
  );

  useEffect(() => {
    const stored = loadFromStorage<BudgetItem[]>("budgets", initialBudgets);
    if (stored.length > 0) {
      setBudgets(stored);
    }
  }, []);

  useEffect(() => {
    if (budgets.length > 0) {
      saveToStorage("budgets", budgets);
    }
  }, [budgets]);

  const handleAddBudget = () => {
    const limitValue = Number(formData.limit);
    if (!formData.category || !limitValue) return;
    const existing = budgets.find((item) => item.category === formData.category);
    if (existing) {
      setBudgets((prev) =>
        prev.map((item) =>
          item.category === formData.category ? { ...item, limit: limitValue } : item
        )
      );
    } else {
      setBudgets((prev) => [
        ...prev,
        { id: `bud-${Date.now()}`, category: formData.category, limit: limitValue, spent: 0 },
      ]);
    }
    setFormData((prev) => ({ ...prev, limit: "" }));
  };

  const handleRemove = (id: string) => {
    setBudgets((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
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
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((budget) => {
                  const percent = Math.min((budget.spent / budget.limit) * 100, 130);
                  const isOver = budget.spent > budget.limit;
                  return (
                    <div key={budget.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{budget.category}</p>
                          <p className="text-xs text-muted-foreground">
                            € {budget.spent} de € {budget.limit}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(budget.id)}>
                          Quitar
                        </Button>
                      </div>
                      <Progress
                        value={percent}
                        className={`mt-2 ${isOver ? "[&>div]:bg-rose-500" : ""}`}
                      />
                      {isOver && (
                        <p className="mt-2 text-xs font-medium text-rose-500">
                          Has superado el límite en € {budget.spent - budget.limit}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No hay presupuestos {budgetType.toLowerCase()}s configurados
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
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={formData.category}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
