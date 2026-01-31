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

export type EditableGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  type: "ahorro" | "reducir-gasto" | "aumentar-ingreso";
  dueDate: string;
  description?: string;
  milestones?: GoalMilestone[];
};

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
}: {
  goal: EditableGoal;
  trigger: React.ReactNode;
  onSave: (goal: EditableGoal) => void;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(goal);

  useEffect(() => {
    setForm(goal);
  }, [goal, open]);

  const milestones = form.milestones ?? [];

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...(prev.milestones ?? []), { date: new Date().toISOString().slice(0, 10), amount: 0 }],
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

  const handleSave = () => {
    if (!form.title.trim() || !form.target || !form.dueDate) return;
    onSave({ ...form, title: form.title.trim(), milestones: form.milestones?.length ? form.milestones : undefined });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            label="Título"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            label="Objetivo (€)"
            type="number"
            value={form.target}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, target: Number(event.target.value) }))
            }
          />
          <Input
            label="Ahorro actual (€)"
            type="number"
            value={form.saved}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, saved: Number(event.target.value) }))
            }
          />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
          <Input
            label="Fecha objetivo"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
          <Input
            label="Descripción"
            value={form.description ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Hitos</label>
              <Button type="button" variant="ghost" size="sm" onClick={addMilestone}>
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
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
