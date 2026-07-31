"use client";

import Link from "next/link";
import {
  Accessibility,
  BarChart2,
  Bell,
  Check,
  LayoutGrid,
  Lock,
  Mail,
  Receipt,
  Server,
  Shield,
  Target,
  Workflow,
} from "lucide-react";
import { DM_Sans } from "next/font/google";
import { AppLogo } from "@/components/brand/AppLogo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing",
  weight: ["400", "500", "600", "700"],
});

type Phase = "done" | "now" | "next";

type RoadmapItem = {
  title: string;
  description: string;
  phase: Phase;
  icon?:
    | "notion"
    | "googlesheets"
    | "shield"
    | "layoutgrid"
    | "barchart2"
    | "bell"
    | "target"
    | "wallet"
    | "accessibility"
    | "mail"
    | "server"
    | "lock"
    | "workflow";
};

const timeline: RoadmapItem[] = [
  {
    title: "Dashboard y presupuestos Fijo / Variable",
    description: "Estado general, seguimiento por categoría y arrastre entre fijo y variable.",
    phase: "done",
    icon: "wallet",
  },
  {
    title: "Gráficas con rango fijo",
    description: "Últimos 31 días o 12 meses, separador al cruzar mes/año y etiquetas legibles en móvil.",
    phase: "done",
    icon: "barchart2",
  },
  {
    title: "Patrimonio y distribución de activos",
    description: "Evolución del patrimonio y desglose por cuenta en el dashboard.",
    phase: "done",
    icon: "layoutgrid",
  },
  {
    title: "Notion",
    description: "Sincronización de movimientos desde bases de datos de Notion.",
    phase: "done",
    icon: "notion",
  },
  {
    title: "Objetivos, multi-moneda, PWA y export",
    description: "Hitos, monedas, app instalable y export de datos/gráficas.",
    phase: "done",
    icon: "target",
  },
  {
    title: "Cuenta, seguridad y respaldo",
    description: "Tema, 2FA, sesiones, recuperación de contraseña y export/restore.",
    phase: "done",
    icon: "shield",
  },
  {
    title: "Hardening de seguridad",
    description: "Rate limiting en auth, contraseñas más estrictas y revisión de endpoints.",
    phase: "now",
    icon: "lock",
  },
  {
    title: "CI y calidad",
    description: "Pipeline automático de lint, tests y build en cada cambio.",
    phase: "now",
    icon: "workflow",
  },
  {
    title: "Alertas de presupuesto más precisas",
    description: "Avisos al acercarte o superar el límite, mejor señal en notificaciones.",
    phase: "now",
    icon: "bell",
  },
  {
    title: "Google Sheets",
    description: "Importar o sincronizar datos con hojas de cálculo de Google.",
    phase: "next",
    icon: "googlesheets",
  },
  {
    title: "Notificaciones push",
    description: "Recordatorios y alertas de presupuesto en el dispositivo.",
    phase: "next",
    icon: "bell",
  },
  {
    title: "Correo dedicado de verificación",
    description: "Verificaciones y recuperación desde un dominio propio de FinanzApp.",
    phase: "next",
    icon: "mail",
  },
  {
    title: "Hosting en infraestructura propia",
    description: "Despliegue on-premise para más control y privacidad.",
    phase: "next",
    icon: "server",
  },
  {
    title: "Accesibilidad y rendimiento",
    description: "Mejoras a11y y tiempos de carga más bajos en móvil.",
    phase: "next",
    icon: "accessibility",
  },
];

const lucideIconMap: Record<
  Exclude<RoadmapItem["icon"], "notion" | "googlesheets" | undefined>,
  React.ComponentType<{ className?: string }>
> = {
  shield: Shield,
  layoutgrid: LayoutGrid,
  barchart2: BarChart2,
  bell: Bell,
  target: Target,
  wallet: Receipt,
  accessibility: Accessibility,
  mail: Mail,
  server: Server,
  lock: Lock,
  workflow: Workflow,
};

const phaseMeta: Record<
  Phase,
  { label: string; line: string; node: string; badge: string; card: string }
> = {
  done: {
    label: "Hecho",
    line: "bg-emerald-500",
    node: "border-emerald-500 bg-emerald-500 text-white",
    badge: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    card: "border-border dark:border-white/15",
  },
  now: {
    label: "Estamos aquí",
    line: "bg-amber-400",
    node: "border-amber-400 bg-amber-400 text-amber-950 ring-4 ring-amber-400/25 dark:ring-amber-400/35",
    badge: "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    card: "border-amber-400/45 shadow-[0_0_0_1px_hsl(43_96%_56%/0.12)] dark:border-amber-400/55 dark:shadow-[0_0_0_1px_hsl(43_96%_56%/0.2)]",
  },
  next: {
    label: "Siguiente",
    line: "bg-border dark:bg-white/20",
    node: "border-border dark:border-white/20 bg-background text-foreground/50 dark:text-foreground/70",
    badge: "bg-muted text-foreground/65 dark:bg-white/10 dark:text-foreground/85",
    card: "border-border dark:border-white/12",
  },
};

const phasesOrder: Phase[] = ["done", "now", "next"];

export default function RoadmapPage() {
  return (
    <div
      className={`${dmSans.variable} min-h-screen bg-background text-foreground antialiased`}
      style={{ fontFamily: "var(--font-landing), ui-sans-serif, system-ui, sans-serif" }}
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30 dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 10% -5%, hsl(162 42% 42% / 0.2), transparent 55%)",
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <AppLogo size="md" showText={true} variant="default" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-sm font-medium text-foreground/80 dark:text-foreground/90 transition hover:text-foreground"
          >
            Inicio
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/80 dark:text-foreground/90 transition hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Producto
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Roadmap
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-foreground/75 dark:text-foreground/85">
            Línea temporal de izquierda a derecha: lo entregado, dónde estamos y lo que viene.
            Desliza en horizontal si hace falta.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {(
              [
                ["done", "Hecho"],
                ["now", "Estamos aquí"],
                ["next", "Siguiente"],
              ] as const
            ).map(([phase, label]) => (
              <span key={phase} className="inline-flex items-center gap-2 text-foreground/75 dark:text-foreground/85">
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-full border-2",
                    phaseMeta[phase].node
                  )}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Horizontal timeline */}
        <div className="-mx-6 overflow-x-auto px-6 pb-4 [scrollbar-width:thin]">
          <div className="relative min-w-max pr-8">
            <ol className="relative flex gap-4 sm:gap-5">
              {timeline.map((item, index) => {
                const meta = phaseMeta[item.phase];
                const next = timeline[index + 1];
                const showPhaseLabel =
                  index === 0 || timeline[index - 1].phase !== item.phase;
                const Icon =
                  item.icon && item.icon !== "notion" && item.icon !== "googlesheets"
                    ? lucideIconMap[item.icon]
                    : null;

                const railToNext =
                  next == null
                    ? null
                    : item.phase === "done" && next.phase === "done"
                      ? "bg-emerald-500"
                      : item.phase === "done" && next.phase === "now"
                        ? "bg-gradient-to-r from-emerald-500 to-amber-400"
                        : item.phase === "now" && next.phase === "now"
                          ? "bg-amber-400"
                          : item.phase === "now" && next.phase === "next"
                            ? "bg-gradient-to-r from-amber-400 to-zinc-400 dark:to-zinc-500"
                            : "bg-zinc-300 dark:bg-zinc-600";

                return (
                  <li
                    key={item.title}
                    className="relative flex w-[220px] shrink-0 flex-col sm:w-[240px]"
                  >
                    {/* Node + connector to next ball */}
                    <div className="relative z-[1] mb-4 flex h-9 items-center sm:h-10">
                      {railToNext && (
                        <span
                          className={cn(
                            // Del centro de esta bola al centro de la siguiente (incluye el gap)
                            "absolute top-1/2 z-0 h-0.5 -translate-y-1/2 left-4 w-[calc(100%+1rem)] sm:left-[1.125rem] sm:w-[calc(100%+1.25rem)]",
                            railToNext
                          )}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 sm:h-9 sm:w-9",
                          meta.node
                        )}
                        aria-hidden
                      >
                        {item.phase === "done" ? (
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        ) : item.phase === "now" ? (
                          <span className="h-2 w-2 rounded-full bg-amber-950" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-foreground/40 dark:bg-foreground/55" />
                        )}
                      </span>
                    </div>

                    {showPhaseLabel && (
                      <p
                        className={cn(
                          "mb-2 text-[11px] font-bold uppercase tracking-[0.14em]",
                          item.phase === "done" && "text-emerald-700 dark:text-emerald-300",
                          item.phase === "now" && "text-amber-700 dark:text-amber-200",
                          item.phase === "next" && "text-foreground/55 dark:text-foreground/75"
                        )}
                      >
                        {meta.label}
                      </p>
                    )}
                    {!showPhaseLabel && <div className="mb-2 h-[16px]" aria-hidden />}

                    <div
                      className={cn(
                        "flex min-h-[168px] flex-col rounded-xl border bg-card dark:bg-zinc-900 p-3.5 sm:p-4",
                        meta.card
                      )}
                    >
                      <div className="mb-2 flex items-start gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/12",
                            item.icon === "notion" || item.icon === "googlesheets"
                              ? "bg-white dark:bg-white/90"
                              : "bg-background"
                          )}
                        >
                          {item.icon === "notion" && (
                            <img
                              src="https://cdn.simpleicons.org/notion"
                              alt=""
                              width={16}
                              height={16}
                              className="size-4"
                            />
                          )}
                          {item.icon === "googlesheets" && (
                            <img
                              src="https://cdn.simpleicons.org/googlesheets"
                              alt=""
                              width={16}
                              height={16}
                              className="size-4"
                            />
                          )}
                          {Icon ? <Icon className="size-4 text-foreground/65 dark:text-foreground/80" /> : null}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            meta.badge
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-foreground/75 dark:text-foreground/85">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Phase summary strips for quick scan */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {phasesOrder.map((phase) => {
            const count = timeline.filter((t) => t.phase === phase).length;
            const meta = phaseMeta[phase];
            return (
              <div
                key={phase}
                className="rounded-xl border border-border dark:border-white/12 bg-card/70 dark:bg-white/[0.05] px-4 py-3"
              >
                <p
                  className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    phase === "done" && "text-emerald-700 dark:text-emerald-300",
                    phase === "now" && "text-amber-700 dark:text-amber-200",
                    phase === "next" && "text-foreground/55 dark:text-foreground/75"
                  )}
                >
                  {meta.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{count}</p>
                <p className="text-xs text-foreground/60 dark:text-foreground/75">hitos</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-foreground/75 dark:text-foreground/85 transition hover:text-foreground"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
