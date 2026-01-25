"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/brand/AppLogo";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { startDemoSession } from "@/lib/auth";
import { ParentSize } from "@visx/responsive";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";

const features = [
  {
    title: "Control total de tus finanzas",
    description: "Visualiza ingresos, gastos y patrimonio con dashboards claros.",
  },
  {
    title: "Presupuestos inteligentes",
    description: "Define límites por categoría y recibe alertas preventivas.",
  },
  {
    title: "Objetivos con seguimiento",
    description: "Ahorra para tus metas con progreso automático.",
  },
  {
    title: "Reportes exportables",
    description: "Descarga informes en CSV o PDF para tus análisis.",
  },
];

const stats = [
  { label: "Movimientos mensuales", value: "+2.4k" },
  { label: "Ahorro promedio", value: "18%" },
  { label: "Usuarios activos", value: "12.6k" },
];

// Datos de ejemplo para el gráfico de ingresos vs gastos diarios del mes
const demoIngresos = [
  { dia: "1", valor: 0 },
  { dia: "5", valor: 1200 },
  { dia: "10", valor: 0 },
  { dia: "15", valor: 2800 },
  { dia: "20", valor: 0 },
  { dia: "25", valor: 1500 },
  { dia: "30", valor: 0 },
];

const demoGastos = [
  { dia: "1", valor: 450 },
  { dia: "5", valor: 320 },
  { dia: "10", valor: 680 },
  { dia: "15", valor: 520 },
  { dia: "20", valor: 890 },
  { dia: "25", valor: 410 },
  { dia: "30", valor: 350 },
];

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export default function Home() {
  const router = useRouter();

  const handleDemoClick = () => {
    startDemoSession();
    router.push("/dashboard");
  };
  return (
    <div className="min-h-screen bg-[#f6f6f7] dark:bg-[#111112]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <AppLogo size="md" showText={true} variant="default" />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
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

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              Nueva versión 2.0 disponible
            </span>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Gestiona tu dinero con claridad y objetivos reales
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              FinanzApp te ayuda a entender tu flujo de caja, controlar tus presupuestos
              y avanzar hacia tus metas financieras con datos claros y acciones rápidas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                Empezar gratis
              </Link>
              <button
                onClick={handleDemoClick}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Ver demo
              </button>
            </div>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-muted-foreground">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-xl font-semibold text-foreground">{stat.value}</span>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance actual</p>
                  <p className="text-2xl font-bold text-primary">€ 11.880</p>
                </div>
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  +12.4%
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="text-lg font-semibold text-primary">€ 5.500</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full w-[75%] rounded-full bg-green-500" />
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-semibold text-primary">€ 3.620</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full w-[66%] rounded-full bg-red-500" />
                  </div>
                </Card>
              </div>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Gastos vs Ingresos del mes</p>
                <div className="flex gap-4 items-end mb-2">
                  <div className="text-lg font-bold text-green-600 dark:text-green-500">{formatNumber(demoIngresos.reduce((a, b) => a + b.valor, 0))} €</div>
                  <div className="text-lg font-bold text-red-500 dark:text-red-400">{formatNumber(demoGastos.reduce((a, b) => a + b.valor, 0))} €</div>
                </div>
                <div className="mt-3 h-48">
                  <ParentSize>
                    {({ width, height }) => {
                      const margin = { top: 20, right: 20, bottom: 30, left: 20 };
                      const innerWidth = width - margin.left - margin.right;
                      const innerHeight = height - margin.top - margin.bottom;
                      const labels = demoIngresos.map((d) => d.dia);
                      const ingresosVals = demoIngresos.map((d) => d.valor);
                      const gastosVals = demoGastos.map((d) => d.valor);
                      const maxY = Math.max(...ingresosVals, ...gastosVals) * 1.15;

                      const xScale = scalePoint({
                        domain: labels,
                        range: [0, innerWidth],
                        padding: 0.5,
                      });

                      const yScale = scaleLinear({
                        domain: [0, maxY],
                        range: [innerHeight, 0],
                        nice: true,
                      });

                      const ingresosLine = LinePath({
                        data: demoIngresos,
                        x: (d) => xScale(d.dia) || 0,
                        y: (d) => yScale(d.valor),
                        curve: curveMonotoneX,
                      });

                      const gastosLine = LinePath({
                        data: demoGastos,
                        x: (d) => xScale(d.dia) || 0,
                        y: (d) => yScale(d.valor),
                        curve: curveMonotoneX,
                      });

                      return (
                        <svg width={width} height={height}>
                          <g transform={`translate(${margin.left},${margin.top})`}>
                            {/* Línea ingresos */}
                            <motion.path
                              d={ingresosLine?.props.d || ""}
                              stroke="#22c55e"
                              strokeWidth={2.5}
                              fill="none"
                              strokeDasharray="4 2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.9, ease: "easeInOut" }}
                            />
                            {/* Puntos ingresos */}
                            {demoIngresos.map((d, i) => (
                              <motion.circle
                                key={`ingreso-${i}`}
                                cx={xScale(d.dia)}
                                cy={yScale(d.valor)}
                                r={d.valor > 0 ? 4 : 0}
                                fill="#22c55e"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                              />
                            ))}
                            {/* Línea gastos */}
                            <motion.path
                              d={gastosLine?.props.d || ""}
                              stroke="#ef4444"
                              strokeWidth={2.5}
                              fill="none"
                              strokeDasharray="4 2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.2 }}
                            />
                            {/* Puntos gastos */}
                            {demoGastos.map((d, i) => (
                              <motion.circle
                                key={`gasto-${i}`}
                                cx={xScale(d.dia)}
                                cy={yScale(d.valor)}
                                r={4}
                                fill="#ef4444"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 + i * 0.1 }}
                              />
                            ))}
                            {/* Etiquetas del eje X */}
                            {labels.map((label, i) => (
                              <text
                                key={`label-${i}`}
                                x={xScale(label)}
                                y={innerHeight + 20}
                                textAnchor="middle"
                                fontSize={10}
                                fill="currentColor"
                                className="text-muted-foreground"
                              >
                                {label}
                              </text>
                            ))}
                          </g>
                        </svg>
                      );
                    }}
                  </ParentSize>
                </div>
                <div className="flex gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Ingresos
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Gastos
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 py-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl bg-muted/50 p-8 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Empieza hoy a tomar el control</h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Crea tu cuenta en minutos y descubre cómo mejorar tus finanzas.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© 2026 FinanzApp. Todos los derechos reservados.</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="hover:text-foreground">
              Acceder
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Registro
            </Link>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
