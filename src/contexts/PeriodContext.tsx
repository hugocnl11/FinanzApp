"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Period = "Mes" | "Año";

type PeriodContextType = {
  period: Period;
  setPeriod: (period: Period) => void;
  getMonthCount: () => number;
};

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>("Mes");

  const getMonthCount = () => {
    switch (period) {
      case "Mes":
        return 1;
      case "Año":
        return 12;
      default:
        return 1;
    }
  };

  return (
    <PeriodContext.Provider value={{ period, setPeriod, getMonthCount }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
