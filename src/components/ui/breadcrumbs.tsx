"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  movimientos: "Movimientos",
  graficas: "Gráficas",
  presupuestos: "Presupuestos",
  objetivos: "Objetivos",
  ajustes: "Ajustes",
  perfil: "Perfil",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  if (!pathname?.startsWith("/dashboard")) return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length <= 1) {
    return (
      <nav
        className={cn("hidden md:flex items-center gap-1 text-sm text-muted-foreground mb-4", className)}
        aria-label="Ruta de navegación"
      >
        <span className="font-medium text-foreground">{SEGMENT_LABELS.dashboard}</span>
      </nav>
    );
  }

  const [, segment] = segments;
  const label = SEGMENT_LABELS[segment] ?? segment;

  return (
    <nav
      className={cn("hidden md:flex items-center gap-1 text-sm text-muted-foreground mb-4", className)}
      aria-label="Ruta de navegación"
    >
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        {SEGMENT_LABELS.dashboard}
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium text-foreground">{label}</span>
    </nav>
  );
}
