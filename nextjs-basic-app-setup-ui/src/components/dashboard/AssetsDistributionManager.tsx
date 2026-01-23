"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { fetchMovements, createMovement, updateMovement } from "@/lib/api/movements";
import { fetchCategories, createCategory, updateCategory } from "@/lib/api/categories";
import { type CategoryIconKey } from "@/lib/category-icons";
import type { Movement, Category } from "@/lib/dashboard/types";
import { getUserId } from "@/lib/auth";

type InvestmentRow = {
  id: string;
  categoryId?: string;
  name: string;
  value: string;
  icon: CategoryIconKey;
  color: string;
  movementId?: string;
};

type SavingsRow = {
  id: string;
  categoryId?: string;
  name: string;
  value: string;
  icon: CategoryIconKey;
  color: string;
  movementId?: string;
};

const DEFAULT_INVESTMENT_ICON: CategoryIconKey = "LineChart";
const DEFAULT_SAVINGS_ICON: CategoryIconKey = "PiggyBank";
const INVESTMENT_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#eab308",
  "#22c55e",
];
const SAVINGS_COLORS = [
  "#16a34a",
  "#059669",
  "#22c55e",
  "#0f766e",
  "#84cc16",
  "#4d7c0f",
  "#15803d",
  "#10b981",
];
const ALL_ASSET_COLORS = [...INVESTMENT_COLORS, ...SAVINGS_COLORS];

const toDateValue = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const buildLatestByCategory = (movements: Movement[], tipo: Movement["tipo"]) => {
  const latestByCategory = new Map<string, Movement>();
  for (const movement of movements) {
    if (movement.tipo !== tipo) continue;
    const current = latestByCategory.get(movement.categoria);
    if (!current || toDateValue(movement.fecha) >= toDateValue(current.fecha)) {
      latestByCategory.set(movement.categoria, movement);
    }
  }
  return latestByCategory;
};

const buildInvestmentRows = (movements: Movement[], categories: Category[]) => {
  const investmentCategories = categories.filter((cat) => cat.type === "investment");
  const latestByCategory = buildLatestByCategory(movements, "Inversión");
  const rows: InvestmentRow[] = investmentCategories.map((category, index) => {
    const movement = latestByCategory.get(category.name);
    return {
      id: movement?.id ?? category.id,
      categoryId: category.id,
      name: category.name,
      value: movement ? Math.abs(movement.cantidad).toString() : "",
      icon: (category.icon as CategoryIconKey) ?? DEFAULT_INVESTMENT_ICON,
      color: category.color ?? INVESTMENT_COLORS[index % INVESTMENT_COLORS.length],
      movementId: movement?.id,
    };
  });

  for (const movement of latestByCategory.values()) {
    if (!rows.some((row) => row.name === movement.categoria)) {
      rows.push({
        id: movement.id ?? `inv-${movement.categoria}`,
        name: movement.categoria,
        value: Math.abs(movement.cantidad).toString(),
        icon: DEFAULT_INVESTMENT_ICON,
        color: INVESTMENT_COLORS[rows.length % INVESTMENT_COLORS.length],
        movementId: movement.id,
      });
    }
  }

  return rows;
};

const buildSavingsRows = (movements: Movement[], categories: Category[]) => {
  const savingsCategories = categories.filter((cat) => cat.type === "savings");
  const latestByCategory = buildLatestByCategory(movements, "Ahorro");
  const rows = savingsCategories.map((category, index) => {
    const movement = latestByCategory.get(category.name);
    return {
      id: movement?.id ?? category.id,
      categoryId: category.id,
      name: category.name,
      value: movement ? Math.abs(movement.cantidad).toString() : "",
      icon: (category.icon as CategoryIconKey) ?? DEFAULT_SAVINGS_ICON,
      color: category.color ?? SAVINGS_COLORS[index % SAVINGS_COLORS.length],
      movementId: movement?.id,
    };
  });

  for (const movement of latestByCategory.values()) {
    if (!rows.some((row) => row.name === movement.categoria)) {
      rows.push({
        id: movement.id ?? `sav-${movement.categoria}`,
        name: movement.categoria,
        value: Math.abs(movement.cantidad).toString(),
        icon: DEFAULT_SAVINGS_ICON,
        color: SAVINGS_COLORS[rows.length % SAVINGS_COLORS.length],
        movementId: movement.id,
      });
    }
  }

  return rows;
};

export function AssetsDistributionManager() {
  const rowCounter = useRef(0);
  const createRowId = useCallback((prefix: string) => {
    rowCounter.current += 1;
    return `${prefix}-${Date.now()}-${rowCounter.current}`;
  }, []);
  const [open, setOpen] = useState(false);
  const [investmentRows, setInvestmentRows] = useState<InvestmentRow[]>([]);
  const [savingsRows, setSavingsRows] = useState<SavingsRow[]>([]);
  const [removedInvestments, setRemovedInvestments] = useState<InvestmentRow[]>([]);
  const [removedSavings, setRemovedSavings] = useState<SavingsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = useMemo(() => Boolean(getUserId()), []);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!getUserId()) {
          setInvestmentRows([]);
          setSavingsRows([]);
          setRemovedInvestments([]);
          setRemovedSavings([]);
          return;
        }
        const [movementsRes, categoriesRes] = await Promise.all([
          fetchMovements(),
          fetchCategories(),
        ]);
        const categories = categoriesRes.data as Category[];
        setInvestmentRows(buildInvestmentRows(movementsRes.data, categories));
        setSavingsRows(buildSavingsRows(movementsRes.data, categories));
        setRemovedInvestments([]);
        setRemovedSavings([]);
      } catch {
        setInvestmentRows([]);
        setSavingsRows([]);
        setError("No se pudieron cargar los activos.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open]);

  const handleInvestmentValueChange = (index: number, value: string) => {
    setInvestmentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, value } : row))
    );
  };

  const handleInvestmentNameChange = (index: number, name: string) => {
    setInvestmentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, name } : row))
    );
  };

  const handleSavingsNameChange = (index: number, name: string) => {
    setSavingsRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, name } : row))
    );
  };

  const handleSavingsValueChange = (index: number, value: string) => {
    setSavingsRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, value } : row))
    );
  };

  const handleAddSavingsRow = () => {
    setSavingsRows((prev) => [
      ...prev,
      {
        id: createRowId("sav"),
        name: "",
        value: "",
        icon: DEFAULT_SAVINGS_ICON,
        color: SAVINGS_COLORS[prev.length % SAVINGS_COLORS.length],
      },
    ]);
  };

  const handleAddInvestmentRow = () => {
    setInvestmentRows((prev) => [
      ...prev,
      {
        id: createRowId("inv"),
        name: "",
        value: "",
        icon: DEFAULT_INVESTMENT_ICON,
        color: INVESTMENT_COLORS[prev.length % INVESTMENT_COLORS.length],
      },
    ]);
  };

  const handleRemoveInvestmentRow = (index: number) => {
    setInvestmentRows((prev) => {
      const row = prev[index];
      if (row?.categoryId || row?.movementId) {
        setRemovedInvestments((existing) => [...existing, row]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveSavingsRow = (index: number) => {
    setSavingsRows((prev) => {
      const row = prev[index];
      if (row?.categoryId || row?.movementId) {
        setRemovedSavings((existing) => [...existing, row]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const persistRemoval = async (
    row: { categoryId?: string; name: string; movementId?: string },
    tipo: "Inversión" | "Ahorro",
    conceptPrefix: string
  ) => {
    const name = row.name.trim();
    if (!name) return;
    const payload = {
      fecha: new Date().toISOString().split("T")[0],
      concepto: `${conceptPrefix}: ${name}`,
      categoria: name,
      categoryId: row.categoryId,
      tipo,
      cantidad: 0,
    };
    if (row.movementId) {
      await updateMovement(row.movementId, payload);
    } else {
      await createMovement(payload);
    }
    if (row.categoryId) {
      await updateCategory(row.categoryId, { active: false });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const today = new Date().toISOString().split("T")[0];

      const usedColors = new Set<string>();
      const resolveColor = (preferred: string) => {
        if (preferred && !usedColors.has(preferred)) {
          usedColors.add(preferred);
          return preferred;
        }
        const next = ALL_ASSET_COLORS.find((color) => !usedColors.has(color)) ?? preferred;
        usedColors.add(next);
        return next;
      };

      for (const row of investmentRows) {
        const name = row.name.trim();
        if (!name) continue;
        const amount = Math.max(0, Number(row.value || 0));
        const resolvedColor = resolveColor(row.color);
        let categoryId = row.categoryId;
        if (!categoryId) {
          const nameMatch = investmentRows.find((item) => item.name.trim() === name && item.categoryId);
          if (nameMatch?.categoryId) {
            categoryId = nameMatch.categoryId;
          }
        }
        if (!categoryId) {
          const created = await createCategory({
            name,
            type: "investment",
            icon: row.icon,
            color: resolvedColor,
            active: true,
          });
          categoryId = (created.data as Category).id;
        }
        await updateCategory(categoryId, { name, icon: row.icon, color: resolvedColor, active: true });
        const payload = {
          fecha: today,
          concepto: `Ajuste activos: ${name}`,
          categoryId,
          tipo: "Inversión" as const,
          cantidad: amount,
        };
        if (row.movementId) {
          await updateMovement(row.movementId, payload);
        } else {
          await createMovement(payload);
        }
      }

      for (const row of savingsRows) {
        const name = row.name.trim();
        if (!name) continue;
        const amount = Math.max(0, Number(row.value || 0));
        const resolvedColor =
          name.toLowerCase() === "fondo de emergencia" ? "#ef4444" : resolveColor(row.color);
        let categoryId = row.categoryId;
        if (!categoryId) {
          const nameMatch = savingsRows.find((item) => item.name.trim() === name && item.categoryId);
          if (nameMatch?.categoryId) {
            categoryId = nameMatch.categoryId;
          }
        }
        if (!categoryId) {
          const created = await createCategory({
            name,
            type: "savings",
            icon: row.icon,
            color: resolvedColor,
            active: true,
          });
          categoryId = (created.data as Category).id;
        }
        await updateCategory(categoryId, { name, icon: row.icon, color: resolvedColor, active: true });
        const payload = {
          fecha: today,
          concepto: `Ajuste ahorro: ${name}`,
          categoryId,
          tipo: "Ahorro" as const,
          cantidad: amount,
        };
        if (row.movementId) {
          await updateMovement(row.movementId, payload);
        } else {
          await createMovement(payload);
        }
      }

      for (const row of removedInvestments) {
        await persistRemoval(row, "Inversión", "Eliminar activo");
      }
      for (const row of removedSavings) {
        await persistRemoval(row, "Ahorro", "Eliminar ahorro");
      }

      window.dispatchEvent(new Event("finanzapp:data-updated"));
      setOpen(false);
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!canEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar distribución de activos</DialogTitle>
          <DialogDescription>
            Actualiza el valor actual de cada activo para reflejar tu cartera.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando activos...</div>
        ) : investmentRows.length === 0 && savingsRows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No hay activos registrados.
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Activos de inversión
                </span>
                <Button variant="outline" size="sm" onClick={handleAddInvestmentRow}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {investmentRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Añade un activo de inversión para registrar su valor actual.
                </div>
              ) : (
                <div className="grid gap-3">
                  {investmentRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
                      {row.categoryId ? (
                        <div className="flex items-center text-sm font-medium">{row.name}</div>
                      ) : (
                        <Input
                          label="Activo"
                          value={row.name}
                          onChange={(event) => handleInvestmentNameChange(index, event.target.value)}
                        />
                      )}
                      <div className="grid grid-cols-[1fr_36px] items-center gap-2">
                        <Input
                          label="Valor (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(event) => handleInvestmentValueChange(index, event.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInvestmentRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cuentas de ahorro
                </span>
                <Button variant="outline" size="sm" onClick={handleAddSavingsRow}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {savingsRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Añade una cuenta de ahorro para registrar su saldo actual.
                </div>
              ) : (
                <div className="grid gap-3">
                  {savingsRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
                      {row.categoryId ? (
                        <div className="flex items-center text-sm font-medium">{row.name}</div>
                      ) : (
                        <Input
                          label="Cuenta"
                          value={row.name}
                          onChange={(event) => handleSavingsNameChange(index, event.target.value)}
                        />
                      )}
                      <div className="grid grid-cols-[1fr_36px] items-center gap-2">
                        <Input
                          label="Saldo (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(event) => handleSavingsValueChange(index, event.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSavingsRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-xs text-rose-500">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || (investmentRows.length === 0 && savingsRows.length === 0)}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
