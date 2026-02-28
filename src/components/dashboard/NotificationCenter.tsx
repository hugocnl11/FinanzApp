"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { last, previous, percentChange } from "@/lib/dashboard/selectors";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  type: "success" | "warning" | "info";
  read: boolean;
};

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: TrendingUp,
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const { data } = useDashboardData();

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const primaryGoalId =
      typeof window !== "undefined" ? window.localStorage.getItem("finanzapp:primary-goal") : "";

    // 1. Presupuestos
    const budgets = (data.budgets ?? []) as { id: string; category: string; limit: number; spent: number }[];
    budgets.forEach((b) => {
      if (b.limit <= 0) return;
      const pct = (b.spent / b.limit) * 100;
      if (pct > 100) {
        items.push({
          id: `budget-exceeded-${b.id}`,
          title: "Presupuesto superado",
          description: `${b.category} superado en ${Math.round(pct - 100)}%`,
          type: "warning",
          read: readIds.has(`budget-exceeded-${b.id}`),
        });
      } else if (pct >= 80) {
        items.push({
          id: `budget-warning-${b.id}`,
          title: "Presupuesto al límite",
          description: `${b.category} al ${Math.round(pct)}% del límite mensual`,
          type: "warning",
          read: readIds.has(`budget-warning-${b.id}`),
        });
      }
    });

    // 2. Objetivos
    const goals = (data.goals ?? []) as { id: string; title: string; target: number; saved: number }[];
    goals.forEach((g) => {
      if (g.target <= 0) return;
      const pct = (g.saved / g.target) * 100;
      const isPrimary = g.id === primaryGoalId;
      if (pct >= 100) {
        items.push({
          id: `goal-completed-${g.id}`,
          title: "Objetivo completado",
          description: `Has alcanzado tu meta: ${g.title}`,
          type: "success",
          read: readIds.has(`goal-completed-${g.id}`),
        });
      } else if (pct >= 50 && isPrimary) {
        items.push({
          id: `goal-progress-${g.id}`,
          title: "Buen progreso",
          description: `${g.title}: ${Math.round(pct)}% alcanzado`,
          type: "info",
          read: readIds.has(`goal-progress-${g.id}`),
        });
      }
    });

    // 3. Tendencias de ingresos
    const currentIncome = last(data.ingresosMensuales)?.valor ?? 0;
    const prevIncome = previous(data.ingresosMensuales)?.valor ?? 0;
    const incomeChange = percentChange(currentIncome, prevIncome);
    if (prevIncome > 0 && incomeChange > 15) {
      items.push({
        id: "income-growth",
        title: "Crecimiento positivo",
        description: `Tus ingresos crecieron un ${Math.round(incomeChange)}% este mes`,
        type: "info",
        read: readIds.has("income-growth"),
      });
    }

    return items;
  }, [data.budgets, data.goals, data.ingresosMensuales, readIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const markRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        className="relative"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 mt-2 w-80 border border-border p-4 shadow-lg z-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Notificaciones</p>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Marcar todo como leído
              </Button>
            )}
          </div>
          <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay notificaciones
              </p>
            ) : (
              notifications.map((notification) => {
                const Icon = iconMap[notification.type];
                const isRead = readIds.has(notification.id);
                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && markRead(notification.id)}
                    onClick={() => markRead(notification.id)}
                    className={`flex gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted/50 ${
                      isRead ? "border-border/40 text-muted-foreground" : "border-border"
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-xs">{notification.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
