"use client";

import Link from "next/link";
import {
  Accessibility,
  BarChart2,
  Bell,
  CircleDollarSign,
  Database,
  Image,
  LayoutGrid,
  Mail,
  Receipt,
  Server,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Tags,
  Target,
} from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type RoadmapItem = {
  title: string;
  description: string;
  /** Marcado como disponible (implementado). */
  available?: boolean;
  /** Estado: disponible, en desarrollo o no definido (previsto). */
  status?: "available" | "in_progress";
  icon?: "notion" | "googlesheets" | "settings" | "shield" | "database" | "layoutgrid" | "barchart2" | "image" | "smartphone" | "bell" | "coins" | "target" | "wallet" | "tags" | "accessibility" | "mail" | "server" | "sparkles";
};

const roadmapSections: { title: string; items: RoadmapItem[] }[] = [
  {
    title: "Ajustes y cuenta",
    items: [
      { title: "Preferencias", description: "Configuración de tema, notificaciones y preferencias de visualización.", status: "available", icon: "settings" },
      { title: "Seguridad", description: "Verificación en dos pasos (2FA), gestión de sesiones activas y recuperación de contraseña.", status: "available", icon: "shield" },
      { title: "Datos", description: "Exportar movimientos (CSV/Excel), respaldo y restauración de datos.", status: "available", icon: "database" },
      { title: "Cambiar correo de verificación de cuentas", description: "Cambiar el correo electrónico que envia las verificaciones por otro dedicado a FinanzApp.", icon: "mail" },
    ],
  },
  {
    title: "Integraciones",
    items: [
      { title: "Notion", description: "Sincronización de movimientos desde bases de datos de Notion.", status: "available", icon: "notion" },
      { title: "Google Sheets", description: "Importar o sincronizar datos con hojas de cálculo de Google.", icon: "googlesheets" },
    ],
  },
  {
    title: "Gráficas y análisis",
    items: [
      { title: "Modularidad de gráficos", description: "Paneles configurables: activar o desactivar widgets y personalizar el orden.", status: "available", icon: "layoutgrid" },
      { title: "Nuevas visualizaciones", description: "Comparativa anual, proyecciones y más tipos de gráficos.", status: "available", icon: "barchart2" },
      { title: "Exportar gráficas", description: "Exportar gráficas a imagen o PDF para informes.", status: "available", icon: "image" },
    ],
  },
  {
    title: "Producto",
    items: [
      { title: "Wizards de bienvenida", description: "Asistentes paso a paso que explican el funcionamiento de la app para usuarios nuevos.", status: "available", icon: "sparkles" },
      { title: "PWA y uso móvil", description: "Progressive Web App y experiencia optimizada en móvil.", status: "available", icon: "smartphone" },
      { title: "Notificaciones push", description: "Recordatorios y alertas de presupuesto en tiempo real.", icon: "bell" },
      { title: "Multi-moneda", description: "Soporte para varias monedas y conversión.", status: "available", icon: "coins" },
      { title: "Objetivos con hitos", description: "Hitos intermedios en objetivos de ahorro.", status: "available", icon: "target" },
      { title: "Presupuestos (Fijo y Mensual)", description: "Presupuestos por categoría con período fijo o mensual.", status: "available", icon: "wallet" },
      { title: "Categorías por defecto", description: "Plantillas de categorías para nuevos usuarios.", status: "available", icon: "tags" },
      { title: "Accesibilidad y rendimiento", description: "Mejoras de accesibilidad (a11y) y optimización de carga.", status: "available", icon: "accessibility" },
      { title: "Alojar aplicación en un servidor físico propio", description: "Desplegar FinanzApp en infraestructura propia (on-premise) para mayor control y privacidad.", icon: "server" },
    ],
  },
];

const lucideIconMap: Record<Exclude<RoadmapItem["icon"], "notion" | "googlesheets" | undefined>, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  shield: Shield,
  database: Database,
  layoutgrid: LayoutGrid,
  barchart2: BarChart2,
  image: Image,
  smartphone: Smartphone,
  bell: Bell,
  coins: CircleDollarSign,
  target: Target,
  wallet: Receipt,
  tags: Tags,
  accessibility: Accessibility,
  mail: Mail,
  server: Server,
  sparkles: Sparkles,
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <AppLogo size="md" showText={true} variant="default" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Inicio
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="py-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Roadmap de desarrollo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Mejoras y funcionalidades previstas para FinanzApp. Sin fechas fijas; el orden puede variar.
          </p>
        </div>

        <div className="relative space-y-10">
          {roadmapSections.map((section, sectionIndex) => (
            <section key={section.title} className="relative">
              <div className="sticky top-0 z-10 bg-background py-1 -mx-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
              </div>
              <div className="mt-3 relative pl-6 border-l-2 border-border space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div key={item.title} className="relative">
                    <span
                      className="absolute left-0 top-4 -translate-x-[calc(0.5rem+5px)] size-2.5 rounded-full bg-primary border-2 border-background"
                      aria-hidden
                    />
                    <Card className="rounded-xl border border-border bg-card p-4 shadow-sm ml-0 transition hover:shadow-md">
                      <div className="flex items-start gap-3">
                        {item.icon && (
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border p-1.5 ${item.icon === "notion" || item.icon === "googlesheets" ? "bg-white dark:bg-white/90" : ""}`}>
                            {item.icon === "notion" && (
                              <img src="https://cdn.simpleicons.org/notion" alt="" width={20} height={20} className="size-5" />
                            )}
                            {item.icon === "googlesheets" && (
                              <img src="https://cdn.simpleicons.org/googlesheets" alt="" width={20} height={20} className="size-5" />
                            )}
                            {item.icon !== "notion" && item.icon !== "googlesheets" && lucideIconMap[item.icon as keyof typeof lucideIconMap] && (() => {
                              const Icon = lucideIconMap[item.icon as keyof typeof lucideIconMap];
                              return Icon ? <Icon className="size-5 text-muted-foreground" /> : null;
                            })()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-foreground">
                            {item.title}
                            {(item.status === "available" || item.available) && (
                              <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                Disponible
                              </span>
                            )}
                            {item.status === "in_progress" && (
                              <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                En desarrollo
                              </span>
                            )}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/60 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Volver a la página de inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
