"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { last, previous, percentChange } from "@/lib/dashboard/selectors";
import { AlertTriangle, TrendingUp, TrendingDown, Target, Sparkles, CheckCircle2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

type AlertType = "warning" | "success" | "info" | "danger" | "recommendation";

type Alert = {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  icon: React.ElementType;
};

type BudgetItem = {
  id: string;
  category: string;
  limit: number;
  spent: number;
};

type GoalItem = {
  id: string;
  title: string;
  target: number;
  saved: number;
  dueDate?: string;
};

export function SmartAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { data } = useDashboardData();

  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts: Alert[] = [];

      // 1. Análisis de Presupuestos
      const budgets = (data.budgets ?? []) as BudgetItem[];
      budgets.forEach((budget) => {
        const percentage = (budget.spent / budget.limit) * 100;
        
        if (percentage > 100) {
          newAlerts.push({
            id: `budget-exceeded-${budget.id}`,
            type: "danger",
            title: "¡Presupuesto superado!",
            message: `Has superado el límite de ${budget.category} en ${Math.round(percentage - 100)}%`,
            icon: AlertTriangle,
          });
        } else if (percentage >= 80) {
          newAlerts.push({
            id: `budget-warning-${budget.id}`,
            type: "warning",
            title: "Presupuesto cerca del límite",
            message: `Has gastado el ${Math.round(percentage)}% de tu presupuesto en ${budget.category}`,
            icon: AlertTriangle,
          });
        }
      });

      // 2. Análisis de Objetivos
      const goals = (data.goals ?? []) as GoalItem[];
      const primaryGoalId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("finanzapp:primary-goal")
          : "";
      
      goals.forEach((goal) => {
        const percentage = (goal.saved / goal.target) * 100;
        const isPrimary = goal.id === primaryGoalId;

        if (percentage >= 100) {
          newAlerts.push({
            id: `goal-completed-${goal.id}`,
            type: "success",
            title: "¡Objetivo completado!",
            message: `Has alcanzado tu objetivo: ${goal.title}`,
            icon: CheckCircle2,
          });
        } else if (percentage >= 50 && percentage < 75 && isPrimary) {
          newAlerts.push({
            id: `goal-halfway-${goal.id}`,
            type: "success",
            title: "¡Buen progreso!",
            message: `Has completado el ${Math.round(percentage)}% de "${goal.title}"`,
            icon: Target,
          });
        } else if (percentage >= 75 && percentage < 100 && isPrimary) {
          newAlerts.push({
            id: `goal-almost-${goal.id}`,
            type: "info",
            title: "¡Casi lo logras!",
            message: `Solo te faltan €${(goal.target - goal.saved).toFixed(0)} para "${goal.title}"`,
            icon: Target,
          });
        }

        // Sugerencia basada en fecha de vencimiento
        if (goal.dueDate && percentage < 100) {
          const daysUntilDue = Math.ceil(
            (new Date(goal.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilDue > 0 && daysUntilDue <= 30) {
            const remaining = goal.target - goal.saved;
            const suggestedMonthly = remaining / Math.max(1, Math.ceil(daysUntilDue / 30));
            
            newAlerts.push({
              id: `goal-suggestion-${goal.id}`,
              type: "recommendation",
              title: "Recomendación de ahorro",
              message: `Para alcanzar "${goal.title}", ahorra €${suggestedMonthly.toFixed(0)}/mes`,
              icon: Sparkles,
            });
          }
        }
      });

      // 3. Análisis de Tendencias de Ingresos
      const { ingresosMensuales } = data;
      const currentIncome = last(ingresosMensuales)?.valor ?? 0;
      const previousIncome = previous(ingresosMensuales)?.valor ?? 0;
      const incomeChange = percentChange(currentIncome, previousIncome);

      if (incomeChange > 15) {
        newAlerts.push({
          id: "income-increase",
          type: "success",
          title: "¡Ingresos aumentados!",
          message: `Tus ingresos han aumentado un ${Math.round(incomeChange)}% este mes`,
          icon: TrendingUp,
        });
      } else if (incomeChange < -15) {
        newAlerts.push({
          id: "income-decrease",
          type: "warning",
          title: "Reducción en ingresos",
          message: `Tus ingresos han bajado un ${Math.abs(Math.round(incomeChange))}% este mes`,
          icon: TrendingDown,
        });
      }

      // 4. Análisis de Tendencias de Gastos
      const { gastosMensuales } = data;
      const currentExpenses = last(gastosMensuales)?.valor ?? 0;
      const previousExpenses = previous(gastosMensuales)?.valor ?? 0;
      const expensesChange = percentChange(currentExpenses, previousExpenses);

      if (expensesChange > 20) {
        newAlerts.push({
          id: "expenses-spike",
          type: "warning",
          title: "Aumento en gastos",
          message: `Tus gastos han aumentado un ${Math.round(expensesChange)}% respecto al mes anterior`,
          icon: TrendingUp,
        });
      } else if (expensesChange < -20) {
        newAlerts.push({
          id: "expenses-reduction",
          type: "success",
          title: "¡Gastos reducidos!",
          message: `Has reducido tus gastos en un ${Math.abs(Math.round(expensesChange))}% este mes`,
          icon: TrendingDown,
        });
      }

      // 5. Recomendaciones Personalizadas
      const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
      const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
      const potentialSavings = totalBudget - totalSpent;

      if (potentialSavings > 100 && budgets.length > 0) {
        const primaryGoal = goals.find(g => g.id === primaryGoalId) || goals[0];
        if (primaryGoal && primaryGoal.saved < primaryGoal.target) {
          newAlerts.push({
            id: "savings-opportunity",
            type: "recommendation",
            title: "Oportunidad de ahorro",
            message: `Puedes ahorrar hasta €${potentialSavings.toFixed(0)} más este mes para "${primaryGoal.title}"`,
            icon: Sparkles,
          });
        }
      }

      // Análisis de eficiencia
      if (currentIncome > 0 && currentExpenses > 0) {
        const savingsRate = ((currentIncome - currentExpenses) / currentIncome) * 100;
        
        if (savingsRate < 10 && savingsRate > 0) {
          newAlerts.push({
            id: "low-savings-rate",
            type: "recommendation",
            title: "Mejora tu tasa de ahorro",
            message: `Solo estás ahorrando el ${savingsRate.toFixed(1)}%. Intenta alcanzar al menos el 20%`,
            icon: Sparkles,
          });
        } else if (savingsRate >= 30) {
          newAlerts.push({
            id: "excellent-savings",
            type: "success",
            title: "¡Excelente gestión!",
            message: `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos`,
            icon: CheckCircle2,
          });
        }
      }

      // 6. Análisis de Gastos Diarios Promedio
      if (currentExpenses > 0) {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const dailyAverage = currentExpenses / dayOfMonth;
        const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - dayOfMonth;
        
        if (daysRemaining > 0) {
          const projectedExpenses = currentExpenses + (dailyAverage * daysRemaining);
          const lastMonthExpenses = previous(data.gastosMensuales)?.valor ?? currentExpenses;
          
          if (projectedExpenses > lastMonthExpenses * 1.15) {
            newAlerts.push({
              id: "projected-overspending",
              type: "warning",
              title: "Proyección de gastos alta",
              message: `Al ritmo actual, gastarás €${projectedExpenses.toFixed(0)} este mes (${Math.round((projectedExpenses/lastMonthExpenses - 1) * 100)}% más que el anterior)`,
              icon: TrendingUp,
            });
          }
        }
      }

      // 7. Análisis de Categoría con Mayor Gasto
      if (budgets.length > 0) {
        const maxBudget = budgets.reduce((max, b) => b.spent > max.spent ? b : max, budgets[0]);
        const maxPercentage = (maxBudget.spent / maxBudget.limit) * 100;
        
        if (maxPercentage > 70 && maxPercentage < 100) {
          newAlerts.push({
            id: "category-high-usage",
            type: "info",
            title: "Categoría cerca del límite",
            message: `${maxBudget.category} está al ${Math.round(maxPercentage)}% de su presupuesto`,
            icon: AlertTriangle,
          });
        }
      }

      // 8. Días sin movimientos
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const recentMovements = data.movimientos.filter((m) => {
        const movDate = new Date(m.fecha);
        return movDate.getMonth() === currentMonth && 
               movDate.getFullYear() === currentYear &&
               movDate.getDate() >= now.getDate() - 3;
      });

      if (recentMovements.length === 0) {
        newAlerts.push({
          id: "no-recent-movements",
          type: "info",
          title: "Sin movimientos recientes",
          message: "No has registrado movimientos en los últimos 3 días. ¿Todo al día?",
          icon: CheckCircle2,
        });
      }

      // Limitar a las 8 alertas más importantes
      setAlerts(newAlerts.slice(0, 8));
    };

    generateAlerts();
    
    // Escuchar cambios en los datos
    const handler = () => generateAlerts();
    window.addEventListener("finanzapp:data-updated", handler);
    
    return () => {
      window.removeEventListener("finanzapp:data-updated", handler);
    };
  }, [data]);

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case "danger":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "recommendation":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      default:
        return "bg-muted";
    }
  };

  const getTextStyles = (type: AlertType) => {
    switch (type) {
      case "danger":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      case "recommendation":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-foreground";
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 mx-auto opacity-50" />
          <p className="text-sm">Todo en orden. No hay alertas en este momento.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <Card
            key={alert.id}
            className={`p-4 flex gap-3 border ${getAlertStyles(alert.type)}`}
          >
            <div className={`flex-shrink-0 ${getTextStyles(alert.type)}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className={`text-sm font-semibold ${getTextStyles(alert.type)}`}>
                {alert.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {alert.message}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
