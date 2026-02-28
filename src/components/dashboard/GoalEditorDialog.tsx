"use client";

import { useEffect, useState } from "react";
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
import type { GoalMilestone } from "@/lib/dashboard/types";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type EditableGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  type: "ahorro" | "reducir-gasto" | "aumentar-ingreso";
  dueDate: string;
  description?: string;
  milestones?: GoalMilestone[];
  linkedCategoryIds?: string[];
  linkedBudgetId?: string;
  isPrimary?: boolean;
};

export type AssetOption = { id: string; name: string; value: number; type?: "investment" | "savings" };
export type BudgetOption = { id: string; category: string; limit: number; spent: number };

const typeLabels = {
  ahorro: "Ahorro",
  "reducir-gasto": "Reducir gastos",
  "aumentar-ingreso": "Aumentar ingresos",
};

export function GoalEditorDialog({
  goal,
  trigger,
  onSave,
  title = "Editar objetivo",
  description = "Actualiza los detalles de tu objetivo financiero.",
  assetOptions = [],
  budgetOptions = [],
}: {
  goal: EditableGoal;
  trigger: React.ReactNode;
  onSave: (goal: EditableGoal) => void;
  title?: string;
  description?: string;
  assetOptions?: AssetOption[];
  budgetOptions?: BudgetOption[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(goal);

  const isAssetGoal = (g: EditableGoal) => Array.isArray(g.linkedCategoryIds) && g.linkedCategoryIds.length > 0;
  const isBudgetGoal = (g: EditableGoal) => Boolean(g.linkedBudgetId?.trim());
  const [goalKind, setGoalKind] = useState<"asset" | "budget">(() =>
    isBudgetGoal(goal) ? "budget" : isAssetGoal(goal) ? "asset" : "asset"
  );

  useEffect(() => {
    setForm(goal);
    setGoalKind(isBudgetGoal(goal) ? "budget" : isAssetGoal(goal) ? "asset" : "asset");
  }, [goal, open]);

  const milestones = form.milestones ?? [];
  const selectedBudget = budgetOptions.find((b) => b.id === form.linkedBudgetId);

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...(prev.milestones ?? []), { amount: 0 }],
    }));
  };

  const updateMilestone = (index: number, field: "date" | "amount", value: string | number) => {
    setForm((prev) => {
      const next = [...(prev.milestones ?? [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: field === "amount" ? Number(value) : value };
      return { ...prev, milestones: next };
    });
  };

  const removeMilestone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      milestones: (prev.milestones ?? []).filter((_, i) => i !== index),
    }));
  };

  const toggleAsset = (categoryId: string) => {
    const current = form.linkedCategoryIds ?? [];
    const next = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    setForm((prev) => ({ ...prev, linkedCategoryIds: next, linkedBudgetId: undefined }));
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.dueDate) return;
    if (goalKind === "asset") {
      if (!(form.linkedCategoryIds?.length) && !form.target) return;
      const out: EditableGoal = {
        ...form,
        title: form.title.trim(),
        linkedCategoryIds: form.linkedCategoryIds?.length ? form.linkedCategoryIds : undefined,
        linkedBudgetId: undefined,
        milestones: form.milestones?.length ? form.milestones : undefined,
      };
      onSave(out);
    } else {
      if (!form.linkedBudgetId) return;
      const out: EditableGoal = {
        ...form,
        title: form.title.trim(),
        linkedCategoryIds: undefined,
        target: selectedBudget?.limit ?? form.target,
        saved: selectedBudget?.spent ?? form.saved,
        milestones: form.milestones?.length ? form.milestones : undefined,
      };
      onSave(out);
    }
    setOpen(false);
  };

  const canSave =
    form.title.trim() &&
    form.dueDate &&
    (goalKind === "asset"
      ? (form.linkedCategoryIds?.length ?? 0) > 0 && form.target >= 0
      : Boolean(form.linkedBudgetId));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo de objetivo</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setGoalKind("asset");
                  setForm((p) => ({ ...p, linkedBudgetId: undefined }));
                }}
                className={cn(
                  "min-h-[44px] px-4 rounded-lg border text-sm font-medium transition",
                  goalKind === "asset"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/50"
                )}
              >
                Por activos
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalKind("budget");
                  setForm((p) => ({ ...p, linkedCategoryIds: undefined }));
                }}
                className={cn(
                  "min-h-[44px] px-4 rounded-lg border text-sm font-medium transition",
                  goalKind === "budget"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted/50"
                )}
              >
                Por presupuesto
              </button>
            </div>
          </div>

          {goalKind === "asset" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Activos (selecciona uno o más)</label>
              {assetOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay activos. Crea categorías de inversión o ahorro en Editar distribución de activos.</p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  {assetOptions.map((asset) => {
                    const selected = (form.linkedCategoryIds ?? []).includes(asset.id);
                    const label = asset.type === "savings" ? "Saldo" : "Valor actual";
                    return (
                      <li key={asset.id}>
                        <label className="flex items-center gap-3 min-h-[44px] rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleAsset(asset.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="flex-1 text-sm">{asset.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{label}: {asset.value.toLocaleString("es-ES")} €</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {goalKind === "budget" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Presupuesto (gastar menos del límite)</label>
              {budgetOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay presupuestos. Crea uno en Gestionar presupuestos.</p>
              ) : (
                <select
                  value={form.linkedBudgetId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || undefined;
                    const b = budgetOptions.find((x) => x.id === id);
                    setForm((p) => ({
                      ...p,
                      linkedBudgetId: id,
                      target: b?.limit ?? p.target,
                      saved: b?.spent ?? p.saved,
                    }));
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un presupuesto</option>
                  {budgetOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.category} — límite {b.limit.toLocaleString("es-ES")} € · gastado {b.spent.toLocaleString("es-ES")} €
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <Input
            label="Título"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="min-h-[44px]"
          />

          {goalKind === "asset" && (
            <Input
              label="Meta (€)"
              type="number"
              min={0}
              value={form.target}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, target: Number(event.target.value) }))
              }
              className="min-h-[44px]"
            />
          )}

          {goalKind === "budget" && selectedBudget && (
            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              <p>Límite: {selectedBudget.limit.toLocaleString("es-ES")} € · Gastado: {selectedBudget.spent.toLocaleString("es-ES")} €</p>
            </div>
          )}

          {goalKind === "asset" && !(form.linkedCategoryIds?.length) && (
            <Input
              label="Ahorro actual (€)"
              type="number"
              min={0}
              value={form.saved}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, saved: Number(event.target.value) }))
              }
              className="min-h-[44px]"
            />
          )}

          {goalKind !== "asset" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                className="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as EditableGoal["type"] }))
                }
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Fecha objetivo"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            className="min-h-[44px]"
          />

          {goalKind !== "asset" && (
            <>
              <Input
                label="Descripción"
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="min-h-[44px]"
              />
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPrimary ?? false}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm font-medium">Marcar como objetivo principal</span>
              </label>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Hitos</label>
              <Button type="button" variant="ghost" size="sm" onClick={addMilestone} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-1" />
                Añadir hito
              </Button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin hitos. Añade cantidades intermedias.</p>
            ) : (
              <ul className="space-y-2">
                {milestones.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border p-2 bg-muted/30">
                    <Input
                      type="number"
                      placeholder="Cantidad (€)"
                      value={m.amount || ""}
                      onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                      className="flex-1 text-sm min-h-[40px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => removeMilestone(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="min-h-[44px]">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
