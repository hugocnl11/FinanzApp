"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";

type CalendarEvent = { id: string; title: string; date: string; kind: "goal" | "recurring" };

export function FinanceCalendar() {
  const { data } = useDashboardData();

  const events = useMemo(() => {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 60);

    const recurring = (data.recurringMovements ?? [])
      .filter((r) => r.nextDate)
      .map((r) => ({
        id: `rec-${r.id ?? r.concepto}-${r.nextDate}`,
        title: `Pago recurrente: ${r.concepto}`,
        date: r.nextDate,
        kind: "recurring" as const,
      }));

    const goals = (data.goals ?? [])
      .filter((g) => g.dueDate)
      .map((g) => ({
        id: `goal-${g.id}`,
        title: `Objetivo: ${g.title}`,
        date: g.dueDate as string,
        kind: "goal" as const,
      }));

    return [...recurring, ...goals]
      .filter((e) => {
        const d = new Date(e.date);
        return !Number.isNaN(d.getTime()) && d >= now && d <= limit;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [data.recurringMovements, data.goals]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold">Calendario financiero</h3>
        <span className="text-xs text-muted-foreground">Próximos 60 días</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay vencimientos próximos.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
              <p className="text-sm truncate pr-3">{event.title}</p>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(event.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
