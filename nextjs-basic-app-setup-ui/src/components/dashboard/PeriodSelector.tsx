"use client";

import { motion } from "framer-motion";
import { usePeriod, type Period } from "@/contexts/PeriodContext";

const periods: Period[] = ["Mes", "Año"];

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod();

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className="relative px-3 py-1 text-xs font-medium text-muted-foreground transition"
        >
          {period === p && (
            <motion.span
              layoutId="period-pill"
              className="absolute inset-0 rounded-full bg-background shadow"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={period === p ? "relative text-foreground" : "relative"}>
            {p}
          </span>
        </button>
      ))}
    </div>
  );
}