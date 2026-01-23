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
import { GoalEditorDialog, type EditableGoal } from "@/components/dashboard/GoalEditorDialog";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "@/lib/api/goals";
import { getUserId } from "@/lib/auth";

type GoalItem = EditableGoal;

const initialGoals: GoalItem[] = [];

const typeLabels = {
  ahorro: "Ahorro",
  "reducir-gasto": "Reducir gastos",
  "aumentar-ingreso": "Aumentar ingresos",
};

export function GoalsManager() {
  const [goals, setGoals] = useState<GoalItem[]>(initialGoals);
  const [primaryGoalId, setPrimaryGoalId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    target: "",
    type: "ahorro" as GoalItem["type"],
    dueDate: "",
  });

  const progressStats = useMemo(() => {
    const completed = goals.filter((goal) => goal.saved >= goal.target).length;
    return { total: goals.length, completed };
  }, [goals]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!getUserId()) {
          setGoals([]);
          return;
        }
        const response = await fetchGoals();
        setGoals(response.data as GoalItem[]);
        const storedPrimary =
          typeof window !== "undefined"
            ? window.localStorage.getItem("finanzapp:primary-goal")
            : "";
        setPrimaryGoalId(storedPrimary || response.data[0]?.id || "");
      } catch {
        setGoals([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!primaryGoalId && goals.length > 0) {
        setPrimaryGoalId(goals[0]?.id ?? "");
    }
  }, [goals, primaryGoalId]);

  useEffect(() => {
    if (primaryGoalId) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("finanzapp:primary-goal", primaryGoalId);
      }
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    }
  }, [primaryGoalId]);

  const handleAddGoal = async () => {
    const target = Number(formData.target);
    if (!formData.title.trim() || !target || !formData.dueDate) return;
    const created = await createGoal({
      title: formData.title.trim(),
      target,
      saved: 0,
      type: formData.type,
      dueDate: formData.dueDate,
    });
    setGoals((prev) => [...prev, created.data as GoalItem]);
    if (!primaryGoalId) {
      setPrimaryGoalId((created.data as GoalItem).id);
    }
    setFormData({ title: "", target: "", type: "ahorro", dueDate: "" });
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const handleUpdateSaved = async (id: string, value: number) => {
    const updated = await updateGoal(id, { saved: value });
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? (updated.data as GoalItem) : goal))
    );
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const handleEditGoal = async (updated: GoalItem) => {
    const saved = await updateGoal(updated.id, updated);
    setGoals((prev) => prev.map((goal) => (goal.id === updated.id ? (saved.data as GoalItem) : goal)));
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const handleRemove = async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Gestionar Objetivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Objetivos financieros</DialogTitle>
          <DialogDescription>
            Define metas, visualiza el progreso y recibe alertas al cumplir hitos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                Total: {progressStats.total}
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                Completados: {progressStats.completed}
              </span>
            </div>

            <div className="space-y-3">
              {goals.map((goal) => {
                const percent = Math.min((goal.saved / goal.target) * 100, 100);
                return (
                  <div key={goal.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[goal.type]} · Vence {goal.dueDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={primaryGoalId === goal.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPrimaryGoalId(goal.id)}
                        >
                          {primaryGoalId === goal.id ? "Principal" : "Hacer principal"}
                        </Button>
                        <GoalEditorDialog
                          goal={goal}
                          onSave={handleEditGoal}
                          trigger={
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          }
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(goal.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>€ {goal.saved} de € {goal.target}</span>
                      <span>{percent.toFixed(0)}%</span>
                    </div>
                    <Progress value={percent} className="mt-2" />
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        label="Aporte"
                        type="number"
                        value={goal.saved}
                        onChange={(event) =>
                          handleUpdateSaved(goal.id, Number(event.target.value))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold">Nuevo objetivo</h3>
              <p className="text-xs text-muted-foreground">
                Define el objetivo y su fecha de cumplimiento.
              </p>
            </div>

            <Input
              label="Título"
              placeholder="Ej. Viaje a Japón"
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            />

            <Input
              label="Cantidad objetivo (€)"
              type="number"
              value={formData.target}
              onChange={(event) => setFormData((prev) => ({ ...prev, target: event.target.value }))}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={formData.type}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, type: event.target.value as GoalItem["type"] }))
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
              value={formData.dueDate}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, dueDate: event.target.value }))
              }
            />

            <Button onClick={handleAddGoal}>Crear objetivo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
