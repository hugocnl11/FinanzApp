"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowRightLeft, LineChart } from "lucide-react";
import { getSession, isDemoUser, updateSessionUser } from "@/lib/auth";
import { updateProfile } from "@/lib/api/auth";
import type { UserPreferences } from "@/lib/api/types";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

const WIZARD_STORAGE_KEY = "finanzapp:onboardingWizardSeen";

const STEPS = [
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Aquí verás un resumen de ingresos, gastos, presupuestos y tu objetivo principal. Usa el selector de período para cambiar el rango de fechas.",
    icon: LayoutDashboard,
  },
  {
    id: "movimientos",
    title: "Movimientos",
    description:
      "Registra y consulta todos tus movimientos: ingresos, gastos, inversiones y ahorros. Puedes filtrar por categoría y fecha desde la página Movimientos.",
    icon: ArrowRightLeft,
  },
  {
    id: "graficas",
    title: "Gráficas",
    description:
      "En Gráficas encontrarás análisis detallados: flujo de caja, tasa de ahorro, evolución del patrimonio y desglose por categorías. Puedes exportar las gráficas como imagen.",
    icon: LineChart,
  },
] as const;

export function WelcomeWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);

  const markSeen = useCallback(() => {
    setOpen(false);
    if (isDemoUser()) {
      saveToStorage(WIZARD_STORAGE_KEY, true);
      return;
    }
    const session = getSession();
    const prefs = (session?.user?.preferences ?? {}) as UserPreferences;
    updateProfile({ preferences: { ...prefs, onboardingWizardSeen: true } })
      .then((res) => {
        if (res?.data?.user?.preferences) {
          updateSessionUser({ preferences: res.data.user.preferences });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (checked) return;
    if (isDemoUser()) {
      const seen = loadFromStorage(WIZARD_STORAGE_KEY, false);
      setOpen(!seen);
      setChecked(true);
      return;
    }
    // Usuarios reales: solo mostrar la primera vez. Preferencias desde sesión (restaurada de cookie) o API.
    const session = getSession();
    if (!session) {
      setChecked(true);
      return;
    }
    const prefsFromSession = (session.user?.preferences ?? {}) as UserPreferences;
    if (prefsFromSession.onboardingWizardSeen === true) {
      setOpen(false);
      setChecked(true);
      return;
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const prefs = data?.data?.user?.preferences as UserPreferences | undefined;
        if (prefs) {
          updateSessionUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            ...session.user,
            preferences: prefs,
          });
        }
        const seen = prefs?.onboardingWizardSeen === true;
        setOpen(!seen);
      })
      .catch(() => setOpen(false))
      .finally(() => setChecked(true));
  }, [checked]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markSeen();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSkip = () => {
    markSeen();
  };

  if (!current) return null;

  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && markSeen()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Bienvenido a FinanzApp</DialogTitle>
              <DialogDescription>
                Paso {step + 1} de {STEPS.length}: {current.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{current.description}</p>
        <div className="flex gap-2 justify-center py-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i === step ? "bg-primary" : i < step ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            Omitir
          </Button>
          <Button onClick={handleNext}>
            {isLast ? "Empezar" : "Siguiente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
