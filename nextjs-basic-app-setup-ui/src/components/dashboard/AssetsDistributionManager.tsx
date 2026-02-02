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
import { fetchMovements } from "@/lib/api/movements";
import { fetchCategories, createCategory, updateCategory } from "@/lib/api/categories";
import { fetchAssetSnapshotsForDate, createAssetSnapshot } from "@/lib/api/asset-snapshots";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import type { Movement, Category } from "@/lib/dashboard/types";
import { getUserId } from "@/lib/auth";

type InvestmentRow = {
  id: string;
  categoryId?: string;
  name: string;
  value: string;
  currentValue: string;
  icon: CategoryIconKey;
  color: string;
  movementId?: string;
};

type SavingsRow = {
  id: string;
  categoryId?: string;
  name: string;
  value: string;
  currentValue: string;
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
  const investmentCategories = categories.filter(
    (cat) => cat.type === "investment" && cat.active !== false
  );
  const activeNames = new Set(investmentCategories.map((c) => c.name));
  const latestByCategory = buildLatestByCategory(movements, "Inversión");
  const rows: InvestmentRow[] = investmentCategories.map((category, index) => {
    const movement = latestByCategory.get(category.name);
    return {
      id: movement?.id ?? category.id,
      categoryId: category.id,
      name: category.name,
      value: movement ? Math.abs(movement.cantidad).toString() : "",
      currentValue: "",
      icon: (category.icon as CategoryIconKey) ?? DEFAULT_INVESTMENT_ICON,
      color: category.color ?? INVESTMENT_COLORS[index % INVESTMENT_COLORS.length],
      movementId: movement?.id,
    };
  });

  for (const movement of latestByCategory.values()) {
    if (activeNames.has(movement.categoria) && !rows.some((row) => row.name === movement.categoria)) {
      rows.push({
        id: movement.id ?? `inv-${movement.categoria}`,
        name: movement.categoria,
        value: Math.abs(movement.cantidad).toString(),
        currentValue: "",
        icon: DEFAULT_INVESTMENT_ICON,
        color: INVESTMENT_COLORS[rows.length % INVESTMENT_COLORS.length],
        movementId: movement.id,
      });
    }
  }

  return rows;
};

const buildSavingsRows = (movements: Movement[], categories: Category[]) => {
  const savingsCategories = categories.filter(
    (cat) => cat.type === "savings" && cat.active !== false
  );
  const activeNames = new Set(savingsCategories.map((c) => c.name));
  const latestByCategory = buildLatestByCategory(movements, "Ahorro");
  const rows: SavingsRow[] = savingsCategories.map((category, index) => {
    const movement = latestByCategory.get(category.name);
    return {
      id: movement?.id ?? category.id,
      categoryId: category.id,
      name: category.name,
      value: movement ? Math.abs(movement.cantidad).toString() : "",
      currentValue: "",
      icon: (category.icon as CategoryIconKey) ?? DEFAULT_SAVINGS_ICON,
      color: category.color ?? SAVINGS_COLORS[index % SAVINGS_COLORS.length],
      movementId: movement?.id,
    };
  });

  for (const movement of latestByCategory.values()) {
    if (activeNames.has(movement.categoria) && !rows.some((row) => row.name === movement.categoria)) {
      rows.push({
        id: movement.id ?? `sav-${movement.categoria}`,
        name: movement.categoria,
        value: Math.abs(movement.cantidad).toString(),
        currentValue: "",
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
        const today = new Date().toISOString().slice(0, 10);
        const [movementsRes, categoriesRes, snapshotsRes] = await Promise.all([
          fetchMovements(),
          fetchCategories(),
          fetchAssetSnapshotsForDate(today).catch(() => ({ data: [] as { categoryId: string; value: number }[] })),
        ]);
        const categories = categoriesRes.data as Category[];
        const snapshotByCategory = new Map(
          (snapshotsRes.data ?? []).map((s) => [s.categoryId, s.value])
        );
        const invRows = buildInvestmentRows(movementsRes.data, categories).map((row) => ({
          ...row,
          currentValue: row.categoryId && snapshotByCategory.has(row.categoryId)
            ? String(snapshotByCategory.get(row.categoryId))
            : "",
        }));
        const savRows = buildSavingsRows(movementsRes.data, categories).map((row) => ({
          ...row,
          currentValue: row.categoryId && snapshotByCategory.has(row.categoryId)
            ? String(snapshotByCategory.get(row.categoryId))
            : "",
        }));
        setInvestmentRows(invRows);
        setSavingsRows(savRows);
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
        currentValue: "",
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
        currentValue: "",
        icon: DEFAULT_INVESTMENT_ICON,
        color: INVESTMENT_COLORS[prev.length % INVESTMENT_COLORS.length],
      },
    ]);
  };

  const handleInvestmentCurrentValueChange = (index: number, value: string) => {
    setInvestmentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, currentValue: value } : row))
    );
  };

  const handleSavingsCurrentValueChange = (index: number, value: string) => {
    setSavingsRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, currentValue: value } : row))
    );
  };

  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogTarget, setIconDialogTarget] = useState<
    { type: "investment"; index: number } | { type: "savings"; index: number } | null
  >(null);
  const [iconDialogIcon, setIconDialogIcon] = useState<CategoryIconKey>(DEFAULT_INVESTMENT_ICON);
  const [iconDialogColor, setIconDialogColor] = useState(INVESTMENT_COLORS[0]);

  const openIconDialog = (
    type: "investment" | "savings",
    index: number,
    icon: CategoryIconKey,
    color: string
  ) => {
    setIconDialogTarget({ type, index });
    setIconDialogIcon(icon);
    setIconDialogColor(color);
    setIconDialogOpen(true);
  };

  const saveIconDialog = async () => {
    if (!iconDialogTarget) return;
    const { type, index } = iconDialogTarget;
    if (type === "investment") {
      const row = investmentRows[index];
      if (row?.categoryId) {
        await updateCategory(row.categoryId, { icon: iconDialogIcon, color: iconDialogColor });
      }
      setInvestmentRows((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, icon: iconDialogIcon, color: iconDialogColor } : r
        )
      );
    } else {
      const row = savingsRows[index];
      if (row?.categoryId) {
        await updateCategory(row.categoryId, { icon: iconDialogIcon, color: iconDialogColor });
      }
      setSavingsRows((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, icon: iconDialogIcon, color: iconDialogColor } : r
        )
      );
    }
    setIconDialogOpen(false);
    setIconDialogTarget(null);
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
    row: { categoryId?: string; name: string },
    _tipo: "Inversión" | "Ahorro",
    _conceptPrefix: string
  ) => {
    const name = row.name.trim();
    if (!name) return;
    const today = new Date().toISOString().split("T")[0];
    // No tocamos movimientos; solo dejamos valor actual a 0 para hoy y desactivamos la categoría.
    if (row.categoryId) {
      await createAssetSnapshot({ categoryId: row.categoryId, value: 0, date: today });
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
        // La distribución de activos es independiente de los movimientos: solo guardamos el valor actual (snapshot).
        const currentVal = Math.max(0, Number(row.currentValue || 0));
        if (categoryId) {
          await createAssetSnapshot({ categoryId, value: currentVal, date: today });
        }
      }

      for (const row of savingsRows) {
        const name = row.name.trim();
        if (!name) continue;
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
        // La distribución de activos es independiente de los movimientos: solo guardamos el valor actual (snapshot).
        const currentVal = Math.max(0, Number(row.currentValue || 0));
        if (categoryId) {
          await createAssetSnapshot({ categoryId, value: currentVal, date: today });
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
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="shrink-0 sticky top-0 z-10 bg-background border-b pr-12 pt-4 pb-3 pl-4">
          <DialogHeader>
            <DialogTitle>Editar distribución de activos</DialogTitle>
            <DialogDescription>
              Actualiza el valor actual de cada activo para reflejar tu cartera.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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
                  {investmentRows.map((row, index) => {
                    const IconComponent = CATEGORY_ICON_MAP[row.icon];
                    return (
                      <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_36px] sm:items-end">
                        <button
                          type="button"
                          onClick={() => openIconDialog("investment", index, row.icon, row.color)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input transition-colors hover:bg-muted"
                          style={{ backgroundColor: `${row.color}20`, color: row.color }}
                          title="Editar icono y color"
                        >
                          {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                        </button>
                        {row.categoryId ? (
                          <div className="flex items-center text-sm font-medium">{row.name}</div>
                        ) : (
                          <Input
                            label="Activo"
                            value={row.name}
                            onChange={(e) => handleInvestmentNameChange(index, e.target.value)}
                          />
                        )}
                        <Input
                          label="Valor ingresado (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) => handleInvestmentValueChange(index, e.target.value)}
                        />
                        <Input
                          label="Valor actual (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.currentValue}
                          onChange={(e) => handleInvestmentCurrentValueChange(index, e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInvestmentRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
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
                  {savingsRows.map((row, index) => {
                    const IconComponent = CATEGORY_ICON_MAP[row.icon];
                    return (
                      <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_36px] sm:items-end">
                        <button
                          type="button"
                          onClick={() => openIconDialog("savings", index, row.icon, row.color)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input transition-colors hover:bg-muted"
                          style={{ backgroundColor: `${row.color}20`, color: row.color }}
                          title="Editar icono y color"
                        >
                          {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                        </button>
                        {row.categoryId ? (
                          <div className="flex items-center text-sm font-medium">{row.name}</div>
                        ) : (
                          <Input
                            label="Cuenta"
                            value={row.name}
                            onChange={(e) => handleSavingsNameChange(index, e.target.value)}
                          />
                        )}
                        <Input
                          label="Saldo (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.value}
                          onChange={(e) => handleSavingsValueChange(index, e.target.value)}
                        />
                        <Input
                          label="Valor actual (€)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.currentValue}
                          onChange={(e) => handleSavingsCurrentValueChange(index, e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSavingsRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
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
        </div>
      </DialogContent>

      <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Icono y color</DialogTitle>
            <DialogDescription>Elige un icono y un color para este activo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Icono</label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {(Object.keys(CATEGORY_ICON_MAP) as CategoryIconKey[]).map((key) => {
                  const Icon = CATEGORY_ICON_MAP[key];
                  const isSelected = iconDialogIcon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconDialogIcon(key)}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                        isSelected ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
                      }`}
                      style={isSelected ? { color: iconDialogColor } : undefined}
                      title={key}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={iconDialogColor}
                  onChange={(e) => setIconDialogColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">{iconDialogColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIconDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={saveIconDialog}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
