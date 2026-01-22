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

export type EditableGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  type: "ahorro" | "reducir-gasto" | "aumentar-ingreso";
  dueDate: string;
  description?: string;
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

  const handleSave = () => {
    if (!form.title.trim() || !form.target || !form.dueDate) return;
    onSave({ ...form, title: form.title.trim() });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
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
