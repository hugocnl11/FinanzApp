"use client";

import { Progress } from "@/components/ui/progress";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flag } from "lucide-react";
import type { GoalMilestone } from "@/lib/dashboard/types";

type GoalProgressWithMilestonesProps = {
  /** Progreso actual en porcentaje (0–100). */
  value: number;
  /** Objetivo total (para calcular la posición de cada hito). */
  target: number;
  /** Hitos a marcar en la barra. */
  milestones?: GoalMilestone[];
  /** Usar barra animada (p. ej. en el widget del dashboard). */
  animated?: boolean;
  className?: string;
};

/**
 * Barra de progreso de un objetivo con banderitas que marcan la posición de cada hito.
 * Cada hito se sitúa en la barra según (amount / target) * 100.
 */
export function GoalProgressWithMilestones({
  value,
  target,
  milestones = [],
  animated = false,
  className,
}: GoalProgressWithMilestonesProps) {
  const Bar = animated ? AnimatedProgress : Progress;
  const sortedMilestones = [...milestones].sort((a, b) => Number(a.amount) - Number(b.amount));

  return (
    <div className={className}>
      <div className="relative">
        <Bar value={Math.min(value, 100)} className="h-2" />
        {sortedMilestones.length > 0 && target > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="absolute inset-0 flex items-stretch" aria-hidden>
              {sortedMilestones.map((m, i) => {
                const pct = Math.min(100, Math.max(0, (Number(m.amount) / target) * 100));
                const amount = Math.round(Number(m.amount)).toLocaleString("es-ES");
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full bg-primary-foreground p-0.5 shadow-sm ring-2 ring-primary/50 cursor-default pointer-events-auto"
                        style={{ left: `${pct}%` }}
                      >
                        <Flag className="h-3 w-3 text-primary stroke-[2]" strokeWidth={2} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      Hito: {amount} €
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
