"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    title: "Dashboard y análisis",
    description: "Resumen de ingresos, gastos, objetivos y presupuestos. Gráficas de patrimonio, activos e ingresos vs gastos por categoría.",
  },
  {
    title: "Movimientos y presupuestos",
    description: "Registro y listado de ingresos, gastos, inversiones y ahorros. Presupuestos por categoría (fijo/variable) y objetivos con seguimiento.",
  },
  {
    title: "Gráficas avanzadas",
    description: "Flujo de caja, tasa de ahorro, saldo acumulado, rentabilidad por activo, calendario por día e ingresos y gastos por categoría.",
  },
  {
    title: "Categorías y activos",
    description: "Categorías personalizables. Gestión de inversiones y ahorros con valor actual por día para analizar rentabilidad.",
  },
];

type StatsData = {
  totalMovimientos?: number;
  totalUsuarios?: number;
  ahorroMedioPorcentaje?: number | null;
} | null;

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

const demoInversiones = [
  { dia: "1", valor: 0 },
  { dia: "5", valor: 200 },
  { dia: "10", valor: 150 },
  { dia: "15", valor: 400 },
  { dia: "20", valor: 300 },
  { dia: "25", valor: 250 },
  { dia: "30", valor: 0 },
];

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StatsData) => data && setStats(data))
      .catch(() => {});
  }, []);

  const handleDemoClick = () => {
    startDemoSession();
    router.push("/dashboard");
  };
  return (
    <div className="min-h-screen bg-[#f6f6f7] dark:bg-[#111112]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto w-full max-w-6xl px-6 pb-12">
        <section className="grid items-center gap-8 py-8 md:grid-cols-2">
          <div className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              En desarrollo · Versión Alfa
            </span>
            <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Gestiona tu dinero con claridad: movimientos, patrimonio y objetivos en un solo lugar
            </h1>
            <p className="text-sm text-muted-foreground leading-snug md:text-base">
              Dashboard, movimientos, gráficas avanzadas, presupuestos por categoría, objetivos de ahorro e inversión, y activos con seguimiento. Integración con Notion para sincronizar datos. Todo en un solo lugar para una gestión financiera clara y real.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                Empezar gratis
              </Link>
              <button
                onClick={handleDemoClick}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Ver demo
              </button>
            </div>
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">
                  {stats?.totalMovimientos != null ? formatNumber(stats.totalMovimientos) : "—"}
                </span>
                <span>Movimientos registrados</span>
              </div>
              <span className="self-center text-muted-foreground/60" aria-hidden>|</span>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">
                  {stats?.totalUsuarios != null ? formatNumber(stats.totalUsuarios) : "—"}
                </span>
                <span>Usuarios activos</span>
              </div>
              <span className="self-center text-muted-foreground/60" aria-hidden>|</span>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-foreground">
                  {stats?.ahorroMedioPorcentaje != null ? `${stats.ahorroMedioPorcentaje} %` : "—"}
                </span>
                <span>Ahorro medio</span>
              </div>
            </div>
          </div>
          <Card className="rounded-xl p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance actual</p>
                  <p className="text-xl font-bold text-primary">€ 11.880</p>
                </div>
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  +12.4%
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="text-base font-semibold text-primary">€ 5.500</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full w-[75%] rounded-full bg-green-500" />
                  </div>
                </Card>
                <Card className="rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-base font-semibold text-primary">€ 3.620</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full w-[66%] rounded-full bg-red-500" />
                  </div>
                </Card>
              </div>
              <Card className="rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Gastos vs Ingresos del mes</p>
                <div className="flex gap-4 items-end mb-1.5 flex-wrap text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Ingresos </span>
                    <span className="font-bold text-green-600 dark:text-green-500">{formatNumber(demoIngresos.reduce((a, b) => a + b.valor, 0))} €</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Gastos </span>
                    <span className="font-bold text-red-500 dark:text-red-400">{formatNumber(demoGastos.reduce((a, b) => a + b.valor, 0))} €</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Inversiones </span>
                    <span className="font-bold text-blue-600 dark:text-blue-500">{formatNumber(demoInversiones.reduce((a, b) => a + b.valor, 0))} €</span>
                  </div>
                </div>
                <div className="mt-2 h-40">
                  <ParentSize>
                    {({ width, height }) => {
                      const margin = { top: 20, right: 20, bottom: 30, left: 20 };
                      const innerWidth = width - margin.left - margin.right;
                      const innerHeight = height - margin.top - margin.bottom;
                      const labels = demoIngresos.map((d) => d.dia);
                      const ingresosVals = demoIngresos.map((d) => d.valor);
                      const gastosVals = demoGastos.map((d) => d.valor);
                      const inversionesVals = demoInversiones.map((d) => d.valor);
                      const maxY = Math.max(...ingresosVals, ...gastosVals, ...inversionesVals) * 1.15;

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

                      const inversionesLine = LinePath({
                        data: demoInversiones,
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
                            {/* Línea inversiones */}
                            <motion.path
                              d={inversionesLine?.props.d || ""}
                              stroke="#3b82f6"
                              strokeWidth={2.5}
                              fill="none"
                              strokeDasharray="4 2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.4 }}
                            />
                            {/* Puntos inversiones */}
                            {demoInversiones.map((d, i) => (
                              <motion.circle
                                key={`inversion-${i}`}
                                cx={xScale(d.dia)}
                                cy={yScale(d.valor)}
                                r={d.valor > 0 ? 4 : 0}
                                fill="#3b82f6"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 + i * 0.1 }}
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
                <div className="flex gap-4 mt-1.5 justify-center flex-wrap text-xs">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Ingresos
                  </div>
                  <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Gastos
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Inversiones
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 py-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md hover:border-border"
            >
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl bg-muted/50 p-6 text-center">
          <h2 className="text-xl font-bold md:text-2xl">Empieza hoy a tomar el control</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea tu cuenta en minutos y descubre cómo mejorar tus finanzas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ¿Qué viene después? <Link href="/roadmap" className="underline hover:text-foreground">Roadmap de desarrollo</Link>.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© 2026 FinanzApp. Todos los derechos reservados.</span>
          <a
            href="https://github.com/hugocnl11"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white dark:bg-white/90 border border-border p-0.5">
              <img src="https://cdn.simpleicons.org/github" alt="" width={16} height={16} className="size-4" />
            </span>
            hugocnl11
          </a>
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
            <Link href="/roadmap" className="hover:text-foreground">
              Roadmap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
