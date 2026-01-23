"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { sumFilteredMonths, percentChangeByPeriod } from "@/lib/dashboard/selectors";
import { formatNumber } from "@/lib/format";
import { usePeriod } from "@/contexts/PeriodContext";
import { GoalEditorDialog, type EditableGoal } from "@/components/dashboard/GoalEditorDialog";
import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { createGoal, updateGoal } from "@/lib/api/goals";
import { Pencil } from "lucide-react";

// Componente individual para Ingresos
export function IncomeCard() {
  const { period, getMonthCount } = usePeriod();
  const { data } = useDashboardData();
  const { ingresosMensuales } = data;
  
  const monthCount = getMonthCount();
  const total = sumFilteredMonths(ingresosMensuales, monthCount);
  const percentChange = percentChangeByPeriod(ingresosMensuales, ingresosMensuales, monthCount);
  
  const periodText = period === "Mes" ? "este mes" : "este año";
  
  return (
    <Card className="p-6 overflow-hidden">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Ingresos</h3>
        <motion.div 
          key={`income-${period}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-2xl font-bold text-primary"
        >
          {formatNumber(total)} €
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
}

// Componente individual para Gastos
export function ExpensesCard() {
  const { period, getMonthCount } = usePeriod();
  const { data } = useDashboardData();
  const { gastosMensuales } = data;
  
  const monthCount = getMonthCount();
  const total = sumFilteredMonths(gastosMensuales, monthCount);
  const percentChange = percentChangeByPeriod(gastosMensuales, gastosMensuales, monthCount);
  
  const periodText = period === "Mes" ? "este mes" : "este año";
  
  return (
    <Card className="p-6 overflow-hidden">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Gastos</h3>
        <motion.div 
          key={`expenses-${period}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-2xl font-bold text-primary"
        >
          {formatNumber(total)} €
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
}

// Componente individual para Objetivo Principal
export function GoalCard() {
  const { data } = useDashboardData();
  const [currentGoal, setCurrentGoal] = useState<EditableGoal | null>(null);

  useEffect(() => {
    const primaryId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("finanzapp:primary-goal")
        : null;
    const selected = data.goals.find((goal) => goal.id === primaryId) ?? data.goals[0] ?? null;
    setCurrentGoal(selected ? { ...selected } : null);
  }, [data.goals]);

  const handleSaveGoal = async (updatedGoal: EditableGoal) => {
    if (updatedGoal.id) {
      await updateGoal(updatedGoal.id, updatedGoal);
    } else {
      await createGoal(updatedGoal);
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

  const porcentaje = currentGoal.target ? (currentGoal.saved / currentGoal.target) * 100 : 0;

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
          trigger={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      <div className="text-2xl font-bold">
        {formatNumber(currentGoal.saved)} €{" "}
        <span className="text-sm text-muted-foreground">
          / {formatNumber(currentGoal.target)} €
        </span>
      </div>
      <AnimatedProgress value={Math.min(porcentaje, 100)} />
      <div className="text-xs text-muted-foreground">{Math.round(porcentaje)}% completado</div>
    </Card>
  );
}

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