"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePeriod, type Period } from "@/contexts/PeriodContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const periods: Period[] = ["Mes", "Año"];

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelect = (p: Period) => {
    setPeriod(p);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Desktop: pills inline */}
      <div className="hidden md:flex items-center gap-1 rounded-full bg-muted p-1">
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
      {/* Mobile: compact Sheet */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="touch" className="gap-2 min-w-[100px]">
              <Calendar className="h-4 w-4" />
              {period}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>Período</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              {periods.map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="touch"
                  onClick={() => handleSelect(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}