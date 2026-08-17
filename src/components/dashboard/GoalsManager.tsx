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
import { GoalsRingChart, RING_FALLBACK_COLORS } from "@/components/dashboard/GoalsRingChart";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "@/lib/api/goals";
import { fetchCategories } from "@/lib/api/categories";
import { fetchBudgets } from "@/lib/api/budgets";
import { fetchAssetSnapshotsForDate, fetchAssetSnapshotsLatest } from "@/lib/api/asset-snapshots";
import { getUserId } from "@/lib/auth";
import type { Category } from "@/lib/dashboard/types";
import type { Budget } from "@/lib/dashboard/types";
import { Pencil, Plus, Target } from "lucide-react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);

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
        const [goalsRes, categoriesRes, budgetsRes, snapshotsTodayRes, snapshotsLatestRes] = await Promise.all([
          fetchGoals(),
          fetchCategories(),
          fetchBudgets(),
          fetchAssetSnapshotsForDate(today).catch(() => ({ data: [] as { categoryId: string; categoryName: string; value: number }[] })),
          fetchAssetSnapshotsLatest().catch(() => ({ data: [] as { categoryId: string; categoryName: string; value: number }[] })),
        ]);
        const goalsData = goalsRes.data as GoalItem[];
        setGoals(goalsData);

        const hasPrimary = goalsData.some((g) => g.isPrimary);
        const storedPrimary = typeof window !== "undefined" ? window.localStorage.getItem("finanzapp:primary-goal") : "";
        if (!hasPrimary && (storedPrimary || goalsData[0]?.id)) {
          setPrimaryGoalId(storedPrimary || (goalsData[0]?.id ?? ""));
        }

        const categories = (categoriesRes.data ?? []) as Category[];
        const snapshotsToday = snapshotsTodayRes.data ?? [];
        const snapshotsLatest = snapshotsLatestRes.data ?? [];
        const snapshotByCategoryToday = new Map(snapshotsToday.map((s) => [s.categoryId, s.value]));
        const snapshotByCategoryLatest = new Map(snapshotsLatest.map((s) => [s.categoryId, s.value]));
        const assets: AssetOption[] = categories
          .filter((c) => (c.type === "investment" || c.type === "savings") && c.active !== false)
          .map((c) => ({
            id: c.id,
            name: c.name,
            value: snapshotByCategoryToday.get(c.id) ?? snapshotByCategoryLatest.get(c.id) ?? 0,
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
        ...payload,
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
    setEditingGoal(null);
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const createDraft = useMemo(() => draftNewGoal(), [createOpen]);

  const createDialog = (
    <GoalEditorDialog
      goal={createDraft}
      open={createOpen}
      onOpenChange={setCreateOpen}
      onSave={async (goal) => {
        await handleSaveGoal(goal);
        setCreateOpen(false);
      }}
      title="Crear objetivo"
      description="Elige tipo por activos o por presupuesto, define la meta y la fecha."
      assetOptions={assetOptions}
      budgetOptions={budgetOptions}
      mode="dialog"
    />
  );

  const pickAndEditDialogs = (
    <>
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar objetivo</DialogTitle>
            <DialogDescription>Elige la meta que quieres modificar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {displayGoals.map((goal, index) => (
              <button
                key={goal.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition hover:bg-muted/50"
                onClick={() => {
                  setPickOpen(false);
                  setEditingGoal(goals.find((g) => g.id === goal.id) ?? goal);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: goal.color || RING_FALLBACK_COLORS[index % RING_FALLBACK_COLORS.length] }}
                  />
                  <span className="truncate text-sm font-medium">{goal.title}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {(goal._percent ?? 0).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <GoalEditorDialog
        goal={editingGoal ?? draftNewGoal()}
        open={Boolean(editingGoal)}
        onOpenChange={(open) => {
          if (!open) setEditingGoal(null);
        }}
        onSave={async (updated) => {
          await handleEditGoal(updated);
          setEditingGoal(null);
        }}
        onDelete={editingGoal ? () => void handleRemove(editingGoal.id) : undefined}
        assetOptions={assetOptions}
        budgetOptions={budgetOptions}
        mode="dialog"
      />
    </>
  );

  const compactLegend = displayGoals.map((goal, index) => {
    const isBudget = goal._isBudget ?? false;
    const percent = goal._percent ?? 0;
    const color = goal.color || RING_FALLBACK_COLORS[index % RING_FALLBACK_COLORS.length];
    return (
      <button
        key={goal.id}
        type="button"
        className={cn(
          "w-full rounded-lg px-1 py-2 text-left transition-colors",
          hoveredIndex === index && "bg-muted/50"
        )}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => setEditingGoal(goals.find((g) => g.id === goal.id) ?? goal)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="truncate text-sm font-medium">{goal.title}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{percent.toFixed(0)}%</span>
        </div>
        <p className="mt-0.5 pl-4.5 text-xs text-muted-foreground" style={{ paddingLeft: 18 }}>
          {isBudget
            ? `${Number(goal.saved).toLocaleString("es-ES")} / ${Number(goal.target).toLocaleString("es-ES")} €`
            : `${Number(goal.saved).toLocaleString("es-ES")} / ${Number(goal.target).toLocaleString("es-ES")} €`}
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" style={{ marginLeft: 18 }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
          />
        </div>
      </button>
    );
  });

  const addGoalDialog = (
    <GoalEditorDialog
      goal={draftNewGoal()}
      onSave={handleSaveGoal}
      title="Crear objetivo"
      description="Elige tipo por activos o por presupuesto, define la meta y la fecha."
      assetOptions={assetOptions}
      budgetOptions={budgetOptions}
      mode={inline ? "dialog" : "dialog"}
      trigger={
        <Button className="w-full min-h-[44px]">
          Añadir objetivo
        </Button>
      }
    />
  );

  const content = (
    <div className={cn("grid gap-6 md:grid-cols-[1.2fr_0.8fr]", inline && "w-full")}>
          <div className="space-y-4">
            <div className={cn(
              "flex items-center gap-3",
              inline && "rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
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
                  action={addGoalDialog}
                />
              ) : displayGoals.map((goal) => {
                const isBudget = goal._isBudget ?? false;
                const percent = goal._percent ?? 0;
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-shadow",
                      !goal.color && "border-border",
                      inline && "bg-card shadow-sm hover:shadow"
                    )}
                    style={
                      inline && goal.color
                        ? {
                            borderTop: `1px solid ${goal.color}40`,
                            borderRight: `1px solid ${goal.color}40`,
                            borderBottom: `1px solid ${goal.color}40`,
                            borderLeft: `4px solid ${goal.color}`,
                            backgroundColor: `${goal.color}08`,
                          }
                        : undefined
                    }
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
            inline ? "bg-card shadow-sm" : "bg-muted/30"
          )}>
            <div>
              <h3 className="text-sm font-semibold">Nuevo objetivo</h3>
              <p className="text-xs text-muted-foreground">
                Por activos (meta en €) o por presupuesto (gastar menos del límite).
              </p>
            </div>
            {addGoalDialog}
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
    if (displayGoals.length === 0) {
      return (
        <div className="min-w-0 space-y-4">
          {createDialog}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Total: {progressStats.total}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Completados: {progressStats.completed}
              </span>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo objetivo
            </Button>
          </div>
          <EmptyState
            title="No hay objetivos"
            description="Define metas por activos o por presupuesto y visualiza tu progreso"
            icon={<Target className="h-10 w-10 text-muted-foreground" />}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Nuevo objetivo
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="min-w-0 space-y-4">
        {createDialog}
        {pickAndEditDialogs}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Total: {progressStats.total}
              </span>
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Completados: {progressStats.completed}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Nuevo objetivo
              </Button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[auto_minmax(220px,1fr)] lg:items-center">
            <GoalsRingChart
              items={displayGoals.map((goal) => ({
                id: goal.id,
                label: goal.title,
                percent: goal._percent ?? 0,
                saved: goal.saved,
                color: goal.color,
                milestones: goal.milestones,
                target: goal.target,
                isBudget: goal._isBudget,
              }))}
              completed={progressStats.completed}
              hoveredIndex={hoveredIndex}
              onHoverChange={setHoveredIndex}
            />
            <div className="min-w-0">
              {compactLegend}
            </div>
          </div>
        </div>
      </div>
    );
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
