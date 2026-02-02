"use client";

import { useEffect, useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sumFilteredMonths, percentChangeByPeriod } from "@/lib/dashboard/selectors";
import { formatNumber, formatCurrency } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import { usePeriod } from "@/contexts/PeriodContext";
import { GoalEditorDialog, type EditableGoal } from "@/components/dashboard/GoalEditorDialog";
import { GoalProgressWithMilestones } from "@/components/dashboard/GoalProgressWithMilestones";
import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { createGoal, updateGoal } from "@/lib/api/goals";
import { Pencil } from "lucide-react";

// Componente individual para Ingresos (memoizado para evitar re-renders innecesarios)
export const IncomeCard = memo(function IncomeCard() {
  const currency = useCurrency();
  const { period, getMonthCount } = usePeriod();
  const { data } = useDashboardData();
  const { ingresosMensuales } = data;
  
  const monthCount = getMonthCount();
  const total = sumFilteredMonths(ingresosMensuales, monthCount);
  const percentChange = percentChangeByPeriod(ingresosMensuales, ingresosMensuales, monthCount);
  
  const periodText = period === "Mes" ? "este mes" : "este año";
  
  return (
    <Card className="p-6 overflow-hidden min-w-0">
      <div className="flex flex-col space-y-2 min-w-0">
        <h3 className="text-sm font-medium text-muted-foreground">Ingresos</h3>
        <motion.div 
          key={`income-${period}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-xl md:text-2xl font-bold text-primary truncate"
        >
          {formatCurrency(total, currency)}
        </motion.div>
        <motion.div 
          key={`income-percent-${period}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`text-xs mt-1 font-medium ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
        >
          {percentChange >= 0 ? '+' : ''}{Math.round(percentChange)}% {periodText}
        </motion.div>
      </div>
    </Card>
  );
});

// Componente individual para Gastos (memoizado)
export const ExpensesCard = memo(function ExpensesCard() {
  const currency = useCurrency();
  const { period, getMonthCount } = usePeriod();
  const { data } = useDashboardData();
  const { gastosMensuales } = data;
  
  const monthCount = getMonthCount();
  const total = sumFilteredMonths(gastosMensuales, monthCount);
  const percentChange = percentChangeByPeriod(gastosMensuales, gastosMensuales, monthCount);
  
  const periodText = period === "Mes" ? "este mes" : "este año";
  
  return (
    <Card className="p-6 overflow-hidden min-w-0">
      <div className="flex flex-col space-y-2 min-w-0">
        <h3 className="text-sm font-medium text-muted-foreground">Gastos</h3>
        <motion.div 
          key={`expenses-${period}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-xl md:text-2xl font-bold text-primary truncate"
        >
          {formatCurrency(total, currency)}
        </motion.div>
        <motion.div 
          key={`expenses-percent-${period}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`text-xs mt-1 font-medium ${percentChange < 0 ? 'text-green-500' : 'text-red-500'}`}
        >
          {percentChange >= 0 ? '+' : ''}{Math.round(percentChange)}% {periodText}
        </motion.div>
      </div>
    </Card>
  );
});

// Componente individual para Objetivo Principal (memoizado)
export const GoalCard = memo(function GoalCard() {
  const currency = useCurrency();
  const { data } = useDashboardData();
  const [currentGoal, setCurrentGoal] = useState<EditableGoal | null>(null);

  useEffect(() => {
    const primaryId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("finanzapp:primary-goal")
        : null;
    const selected =
      data.goals.find((goal) => goal.isPrimary) ??
      data.goals.find((goal) => goal.id === primaryId) ??
      data.goals[0] ??
      null;
    setCurrentGoal(selected ? { ...selected } : null);
  }, [data.goals]);

  const handleSaveGoal = async (updatedGoal: EditableGoal) => {
    if (updatedGoal.id && updatedGoal.id !== "new") {
      await updateGoal(updatedGoal.id, updatedGoal);
    } else {
      await createGoal(updatedGoal as Omit<EditableGoal, "id">);
    }
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  if (!currentGoal) {
    return (
      <Card className="p-6 space-y-3">
        <div className="text-sm text-muted-foreground">Cargando objetivo...</div>
      </Card>
    );
  }

  const isBudgetGoal = Boolean(currentGoal.linkedBudgetId);
  const budget = isBudgetGoal && data.budgets?.length
    ? data.budgets.find((b) => b.id === currentGoal.linkedBudgetId)
    : null;
  const target = isBudgetGoal && budget ? budget.limit : (currentGoal.target ?? 0);
  const saved = isBudgetGoal && budget ? budget.spent : (currentGoal.saved ?? 0);
  const porcentaje = isBudgetGoal && target > 0
    ? Math.min(100, Math.max(0, ((target - saved) / target) * 100))
    : target ? (saved / target) * 100 : 0;

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Objetivo principal</p>
          <h3 className="text-sm font-semibold">{currentGoal.title}</h3>
        </div>
        <GoalEditorDialog
          goal={currentGoal}
          onSave={handleSaveGoal}
          budgetOptions={(data.budgets ?? []).map((b) => ({ id: b.id, category: b.category, limit: b.limit, spent: b.spent }))}
          trigger={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Editar objetivo">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      <div className="text-2xl font-bold">
        {formatCurrency(saved, currency)}{" "}
        <span className="text-sm text-muted-foreground">
          / {formatCurrency(target, currency)}
          {isBudgetGoal && " (límite)"}
        </span>
      </div>
      <GoalProgressWithMilestones
        value={Math.min(100, porcentaje)}
        target={target}
        milestones={currentGoal.milestones}
        animated
      />
      <div className="text-xs text-muted-foreground">
        {isBudgetGoal ? `${Math.round(porcentaje)}% resto disponible` : `${Math.round(porcentaje)}% completado`}
      </div>
    </Card>
  );
});

// Componente compuesto original (mantiene compatibilidad)
export function Widgets({
  layout = "grid",
}: {
  layout?: "grid" | "stack";
}) {
  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-4"
          : "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4"
      }
      id="resumen"
    >
      <IncomeCard />
      <ExpensesCard />
      <GoalCard />
    </div>
  );
} 