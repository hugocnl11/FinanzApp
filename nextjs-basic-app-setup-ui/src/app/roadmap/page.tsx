"use client";

import Link from "next/link";
import { AppLogo } from "@/components/brand/AppLogo";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type RoadmapItem = {
  title: string;
  description: string;
  available?: boolean;
};

const roadmapSections: { title: string; items: RoadmapItem[] }[] = [
  {
    title: "Ajustes y cuenta",
    items: [
      {
        title: "Preferencias",
        description: "Configuración de tema, notificaciones y preferencias de visualización.",
      },
      {
        title: "Seguridad",
        description: "Verificación en dos pasos (2FA), gestión de sesiones activas y recuperación de contraseña.",
      },
      {
        title: "Datos",
        description: "Exportar movimientos (CSV/Excel), respaldo y restauración de datos.",
      },
    ],
  },
  {
    title: "Integraciones",
    items: [
      {
        title: "Notion",
        description: "Sincronización de movimientos desde bases de datos de Notion. Disponible actualmente.",
        available: true,
      },
      {
        title: "Google Sheets",
        description: "Importar o sincronizar datos con hojas de cálculo de Google.",
      },
    ],
  },
  {
    title: "Gráficas y análisis",
    items: [
      {
        title: "Modularidad de gráficos",
        description: "Paneles configurables: activar o desactivar widgets y personalizar el orden.",
      },
      {
        title: "Nuevas visualizaciones",
        description: "Comparativa anual, proyecciones y más tipos de gráficos.",
      },
      {
        title: "Exportar gráficas",
        description: "Exportar gráficas a imagen o PDF para informes.",
      },
    ],
  },
  {
    title: "Producto",
    items: [
      {
        title: "PWA y uso móvil",
        description: "Progressive Web App y experiencia optimizada en móvil.",
      },
      {
        title: "Notificaciones push",
        description: "Recordatorios y alertas de presupuesto en tiempo real.",
      },
      {
        title: "Multi-moneda",
        description: "Soporte para varias monedas y conversión.",
      },
      {
        title: "Objetivos con hitos",
        description: "Hitos intermedios en objetivos de ahorro.",
      },
      {
        title: "Presupuestos personalizados",
        description: "Periodos y reglas de presupuesto configurables.",
      },
      {
        title: "Categorías por defecto",
        description: "Plantillas de categorías para nuevos usuarios.",
      },
      {
        title: "Accesibilidad y rendimiento",
        description: "Mejoras de accesibilidad (a11y) y optimización de carga.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f7] dark:bg-[#111112]">
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
              <div className="sticky top-0 z-10 bg-[#f6f6f7] dark:bg-[#111112] py-1 -mx-1">
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {item.title}
                            {item.available && (
                              <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                Disponible
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
