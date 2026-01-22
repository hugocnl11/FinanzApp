"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";
import { sumFilteredMonths, percentChangeByPeriod, sumByMonth, last, previous, percentChange } from "@/lib/dashboard/selectors";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { formatNumber } from "@/lib/format";
import { usePeriod } from "@/contexts/PeriodContext";
import { GoalEditorDialog, type EditableGoal } from "@/components/dashboard/GoalEditorDialog";
import { Pencil } from "lucide-react";
import { motion } from "framer-motion";

export type WidgetsData = {
  ingresos: { valor: number; porcentaje: number };
  gastos: { valor: number; porcentaje: number };
  saldo: { valor: number; porcentaje: number };
  objetivo: { valor: number; ahorrado: number };
};

export const DEFAULT_WIDGETS_DATA: WidgetsData = (() => {
  const { ingresosMensuales, gastosMensuales, goal } = DASHBOARD_MOCK;

  const totalIngresos = sumByMonth(ingresosMensuales);
  const totalGastos = sumByMonth(gastosMensuales);
  const saldo = totalIngresos - totalGastos;

  const ingresoActual = last(ingresosMensuales)?.valor ?? 0;
  const ingresoPrevio = previous(ingresosMensuales)?.valor ?? 0;
  const gastosActual = last(gastosMensuales)?.valor ?? 0;
  const gastosPrevios = previous(gastosMensuales)?.valor ?? 0;

  return {
    ingresos: {
      valor: totalIngresos,
      porcentaje: percentChange(ingresoActual, ingresoPrevio),
    },
    gastos: {
      valor: totalGastos,
      porcentaje: percentChange(gastosActual, gastosPrevios),
    },
    saldo: {
      valor: saldo,
      porcentaje: 0, // se puede calcular más adelante si quieres
    },
    objetivo: {
      valor: goal.objetivo,
      ahorrado: goal.ahorrado,
    },
  };
})();

// Componente individual para Ingresos
export function IncomeCard() {
  const { period, getMonthCount } = usePeriod();
  const { ingresosMensuales } = DASHBOARD_MOCK;
  
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
  const { gastosMensuales } = DASHBOARD_MOCK;
  
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
  const [currentGoal, setCurrentGoal] = useState<EditableGoal | null>(null);

  useEffect(() => {
    const loadGoalFromStorage = () => {
      const storedGoals = loadFromStorage<EditableGoal[]>("goals", []);
      const primaryId = loadFromStorage<string>("primaryGoalId", "");
      const fallback = DASHBOARD_MOCK.goal;
      
      if (storedGoals.length > 0) {
        const primary = storedGoals.find((goal) => goal.id === primaryId) ?? storedGoals[0];
        setCurrentGoal(primary);
      } else {
        // Crear objetivo desde fallback
        const defaultGoal: EditableGoal = {
          id: fallback.id,
          title: fallback.title,
          target: fallback.objetivo,
          saved: fallback.ahorrado,
          type: "ahorro",
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: fallback.description,
        };
        setCurrentGoal(defaultGoal);
      }
    };

    loadGoalFromStorage();
    const handler = () => loadGoalFromStorage();
    window.addEventListener("finanzapp:goals-updated", handler);
    return () => window.removeEventListener("finanzapp:goals-updated", handler);
  }, []);

  const handleSaveGoal = (updatedGoal: EditableGoal) => {
    const storedGoals = loadFromStorage<EditableGoal[]>("goals", []);
    const updatedGoals = storedGoals.map((goal) =>
      goal.id === updatedGoal.id ? updatedGoal : goal
    );
    
    // Si no existe, agregarlo
    if (!storedGoals.find((g) => g.id === updatedGoal.id)) {
      updatedGoals.push(updatedGoal);
    }
    
    saveToStorage("goals", updatedGoals);
    setCurrentGoal(updatedGoal);
    window.dispatchEvent(new Event("finanzapp:goals-updated"));
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
      <Progress value={Math.min(porcentaje, 100)} />
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