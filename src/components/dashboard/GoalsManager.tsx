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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalEditorDialog, type EditableGoal, type AssetOption, type BudgetOption } from "@/components/dashboard/GoalEditorDialog";
import { GoalProgressWithMilestones } from "@/components/dashboard/GoalProgressWithMilestones";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "@/lib/api/goals";
import { fetchCategories } from "@/lib/api/categories";
import { fetchBudgets } from "@/lib/api/budgets";
import { fetchAssetSnapshotsForDate } from "@/lib/api/asset-snapshots";
import { getUserId } from "@/lib/auth";
import type { Category } from "@/lib/dashboard/types";
import type { Budget } from "@/lib/dashboard/types";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

type GoalItem = EditableGoal;

const initialGoals: GoalItem[] = [];

const typeLabels = {
  ahorro: "Ahorro",
  "reducir-gasto": "Reducir gastos",
  "aumentar-ingreso": "Aumentar ingresos",
};

const NEW_GOAL_ID = "new";

function draftNewGoal(): EditableGoal {
  return {
    id: NEW_GOAL_ID,
    title: "",
    target: 0,
    saved: 0,
    type: "ahorro",
    dueDate: new Date().toISOString().slice(0, 10),
    linkedCategoryIds: undefined,
    linkedBudgetId: undefined,
    isPrimary: false,
  };
}

type GoalsManagerProps = {
  /** Si true, renderiza el contenido directamente en la página sin Dialog */
  inline?: boolean;
};

export function GoalsManager(props?: GoalsManagerProps) {
  const { inline = false } = props ?? {};
  const [goals, setGoals] = useState<GoalItem[]>(initialGoals);
  const [loading, setLoading] = useState(true);
  const [primaryGoalId, setPrimaryGoalId] = useState<string>("");
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [budgetOptions, setBudgetOptions] = useState<BudgetOption[]>([]);

  const primaryFromApi = useMemo(() => goals.find((g) => g.isPrimary)?.id ?? null, [goals]);
  const effectivePrimaryId = primaryFromApi ?? (primaryGoalId || (goals[0]?.id ?? ""));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!getUserId()) {
          setGoals([]);
          setAssetOptions([]);
          setBudgetOptions([]);
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const [goalsRes, categoriesRes, budgetsRes, snapshotsRes] = await Promise.all([
          fetchGoals(),
          fetchCategories(),
          fetchBudgets(),
          fetchAssetSnapshotsForDate(today).catch(() => ({ data: [] as { categoryId: string; categoryName: string; value: number }[] })),
        ]);
        const goalsData = goalsRes.data as GoalItem[];
        setGoals(goalsData);

        const hasPrimary = goalsData.some((g) => g.isPrimary);
        const storedPrimary = typeof window !== "undefined" ? window.localStorage.getItem("finanzapp:primary-goal") : "";
        if (!hasPrimary && (storedPrimary || goalsData[0]?.id)) {
          setPrimaryGoalId(storedPrimary || (goalsData[0]?.id ?? ""));
        }

        const categories = (categoriesRes.data ?? []) as Category[];
        const snapshots = snapshotsRes.data ?? [];
        const snapshotByCategory = new Map(snapshots.map((s) => [s.categoryId, s.value]));
        const assets: AssetOption[] = categories
          .filter((c) => (c.type === "investment" || c.type === "savings") && c.active !== false)
          .map((c) => ({
            id: c.id,
            name: c.name,
            value: snapshotByCategory.get(c.id) ?? 0,
            type: c.type as "investment" | "savings",
          }));
        setAssetOptions(assets);

        const budgets = (budgetsRes.data ?? []) as Budget[];
        setBudgetOptions(budgets.map((b) => ({ id: b.id, category: b.category, limit: b.limit, spent: b.spent })));
      } catch {
        setGoals([]);
        setAssetOptions([]);
        setBudgetOptions([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const assetValueByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    assetOptions.forEach((a) => map.set(a.id, a.value));
    return map;
  }, [assetOptions]);

  const budgetsMap = useMemo(() => {
    const map = new Map<string, BudgetOption>();
    budgetOptions.forEach((b) => map.set(b.id, b));
    return map;
  }, [budgetOptions]);

  const displayGoals = useMemo(() => {
    return goals.map((goal) => {
      if (goal.linkedBudgetId) {
        const budget = budgetsMap.get(goal.linkedBudgetId);
        if (budget) {
          const limit = budget.limit;
          const spent = budget.spent;
          const percent = limit > 0 ? Math.min(100, Math.max(0, ((limit - spent) / limit) * 100)) : 0;
          return { ...goal, target: limit, saved: spent, _percent: percent, _isBudget: true };
        }
      }
      if (goal.linkedCategoryIds?.length) {
        const savedFromAssets = goal.linkedCategoryIds.reduce(
          (sum, cid) => sum + (assetValueByCategoryId.get(cid) ?? 0),
          0
        );
        const saved = savedFromAssets;
        const target = goal.target;
        const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
        return { ...goal, saved, _percent: percent, _isBudget: false };
      }
      const percent = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
      return { ...goal, _percent: percent, _isBudget: false };
    });
  }, [goals, budgetsMap, assetValueByCategoryId]);

  useEffect(() => {
    if (effectivePrimaryId && typeof window !== "undefined") {
      window.localStorage.setItem("finanzapp:primary-goal", effectivePrimaryId);
    }
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  }, [effectivePrimaryId]);

  const progressStats = useMemo(() => {
    const total = displayGoals.length;
    const completed = displayGoals.filter((g) =>
      g._isBudget ? (g.saved <= g.target) : (g.saved >= g.target)
    ).length;
    return { total, completed };
  }, [displayGoals]);

  const handleSetPrimary = async (id: string) => {
    try {
      await updateGoal(id, { isPrimary: true });
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, isPrimary: true } : { ...g, isPrimary: false }))
      );
      setPrimaryGoalId(id);
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch {
      // keep previous state
    }
  };

  const handleSaveGoal = async (updated: GoalItem) => {
    if (updated.id === NEW_GOAL_ID) {
      const { id: _id, ...payload } = updated;
      const created = await createGoal({
        title: payload.title,
        target: payload.target,
        saved: payload.saved,
        type: payload.type,
        dueDate: payload.dueDate,
        description: payload.description,
        milestones: payload.milestones,
        linkedCategoryIds: payload.linkedCategoryIds,
        linkedBudgetId: payload.linkedBudgetId,
        isPrimary: payload.isPrimary ?? false,
      });
      setGoals((prev) => [...prev, created.data as GoalItem]);
    } else {
      const saved = await updateGoal(updated.id, updated);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? (saved.data as GoalItem) : g)));
    }
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
    await handleSaveGoal(updated);
  };

  const handleRemove = async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const content = (
    <div className={cn("grid gap-6 md:grid-cols-[1.2fr_0.8fr]", inline && "w-full")}>
          <div className="space-y-4">
            <div className={cn(
              "flex items-center gap-3",
              inline && "rounded-xl border border-border bg-muted/30 px-4 py-3"
            )}>
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Total: {progressStats.total}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Completados: {progressStats.completed}
              </span>
            </div>

            <div className="space-y-3">
              {displayGoals.length === 0 ? (
                <EmptyState
                  title="No hay objetivos"
                  description="Define metas por activos o por presupuesto y visualiza tu progreso"
                  icon={<Target className="h-10 w-10 text-muted-foreground" />}
                  action={
                    <GoalEditorDialog
                      goal={draftNewGoal()}
                      onSave={handleSaveGoal}
                      title="Crear objetivo"
                      description="Elige tipo por activos o por presupuesto, define la meta y la fecha."
                      assetOptions={assetOptions}
                      budgetOptions={budgetOptions}
                      mode={inline ? "sheet" : "dialog"}
                      trigger={
                        <Button>
                          Añadir objetivo
                        </Button>
                      }
                    />
                  }
                />
              ) : displayGoals.map((goal) => {
                const isBudget = goal._isBudget ?? false;
                const percent = goal._percent ?? 0;
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-2xl border border-border p-4 transition-shadow",
                      inline && "hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[goal.type]} · Vence {goal.dueDate}
                          {isBudget && " · Gastar menos del límite"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={effectivePrimaryId === goal.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSetPrimary(goal.id)}
                        >
                          {effectivePrimaryId === goal.id ? "Principal" : "Hacer principal"}
                        </Button>
                        <GoalEditorDialog
                          goal={goal}
                          onSave={handleEditGoal}
                          assetOptions={assetOptions}
                          budgetOptions={budgetOptions}
                          mode={inline ? "sheet" : "dialog"}
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
                      {isBudget ? (
                        <span>Gastado {Number(goal.saved).toLocaleString("es-ES")} € de {Number(goal.target).toLocaleString("es-ES")} € (límite)</span>
                      ) : (
                        <span>€ {Number(goal.saved).toLocaleString("es-ES")} de € {Number(goal.target).toLocaleString("es-ES")}</span>
                      )}
                      <span>{percent.toFixed(0)}%</span>
                    </div>
                    <GoalProgressWithMilestones
                      value={percent}
                      target={goal.target}
                      milestones={goal.milestones}
                      className="mt-2"
                    />
                    {!isBudget && !(goal.linkedCategoryIds?.length) && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn(
            "space-y-4 rounded-2xl border border-border p-4",
            inline ? "bg-muted/20 ring-1 ring-border/50" : "bg-muted/30"
          )}>
            <div>
              <h3 className="text-sm font-semibold">Nuevo objetivo</h3>
              <p className="text-xs text-muted-foreground">
                Por activos (meta en €) o por presupuesto (gastar menos del límite).
              </p>
            </div>
            <GoalEditorDialog
              goal={draftNewGoal()}
              onSave={handleSaveGoal}
              title="Crear objetivo"
              description="Elige tipo por activos o por presupuesto, define la meta y la fecha."
              assetOptions={assetOptions}
              budgetOptions={budgetOptions}
              mode={inline ? "sheet" : "dialog"}
              trigger={
                <Button className="w-full min-h-[44px]">
                  Añadir objetivo
                </Button>
              }
            />
          </div>
        </div>
  );

  if (inline && loading) {
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
        <Button variant="outline" size="sm" className="w-full">
          Gestionar Objetivos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Objetivos financieros</DialogTitle>
          <DialogDescription>
            Define metas por activos o por presupuesto, visualiza el progreso y recibe alertas al cumplir hitos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
