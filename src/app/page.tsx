"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/brand/AppLogo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { startDemoSession } from "@/lib/auth";
import { ParentSize } from "@visx/responsive";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { ArrowRight, LineChart, PieChart, Target, Wallet } from "lucide-react";

const pillars = [
  {
    icon: Wallet,
    title: "Control del día a día",
    description:
      "Movimientos, presupuestos fijos y variables, y alertas cuando una categoría se desvía.",
  },
  {
    icon: LineChart,
    title: "Visión a largo plazo",
    description:
      "Evolución del patrimonio, activos y gráficas que se adaptan al periodo que elijas.",
  },
  {
    icon: Target,
    title: "Objetivos con sentido",
    description:
      "Metas de ahorro o gasto con hitos, vinculadas a categorías o presupuestos reales.",
  },
  {
    icon: PieChart,
    title: "Datos donde ya los tienes",
    description:
      "Sincroniza con Notion y mantén tu panel al día sin duplicar el trabajo.",
  },
];

type StatsData = {
  totalMovimientos?: number;
  totalUsuarios?: number;
  ahorroMedioPorcentaje?: number | null;
} | null;

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

const formatNumber = (num: number) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Atmosphere — sutil, sin pelear con el texto */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-40 dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 90% 55% at 20% -15%, hsl(162 42% 42% / 0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, hsl(200 35% 50% / 0.12), transparent 45%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "linear-gradient(180deg, black, transparent 55%)",
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <AppLogo size="md" showText={true} variant="default" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/roadmap"
            className="hidden text-sm font-medium text-foreground/80 dark:text-foreground/90 transition hover:text-foreground sm:inline"
          >
            Roadmap
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/80 dark:text-foreground/90 transition hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[min(86vh,800px)] w-full max-w-6xl items-center gap-12 px-6 pb-12 pt-4 lg:grid-cols-2 lg:gap-16 lg:pb-16">
          <motion.div
            className="relative z-10 max-w-xl space-y-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-5xl font-bold leading-none tracking-tight text-foreground sm:text-6xl md:text-7xl">
              FinanzApp
            </p>
            <h1 className="max-w-lg text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
              Claridad financiera sin ruido.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-foreground/75 dark:text-foreground/85 sm:text-lg">
              Una sola vista para movimientos, patrimonio, presupuestos y objetivos — con el ritmo de tu mes real.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleDemoClick}
                className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Ver demo
              </button>
            </div>
            <p className="text-sm text-foreground/60 dark:text-foreground/75">Versión alfa · En desarrollo activo</p>
          </motion.div>

          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg dark:shadow-none sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/60 dark:text-foreground/75">
                    Este mes
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                    11.880 €
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    +12,4% vs mes anterior
                  </p>
                </div>
                <div className="text-right text-sm text-foreground/70 dark:text-foreground/82">
                  <p className="font-medium text-foreground/80 dark:text-foreground/90">Ingresos · Gastos · Inversión</p>
                  <p className="mt-1">Últimos 31 días</p>
                </div>
              </div>

              <div className="mt-6 h-[200px] w-full sm:h-[220px]">
                <ParentSize>
                  {({ width, height }) => {
                    const margin = { top: 12, right: 8, bottom: 24, left: 8 };
                    const innerWidth = Math.max(width - margin.left - margin.right, 1);
                    const innerHeight = Math.max(height - margin.top - margin.bottom, 1);
                    const labels = demoIngresos.map((d) => d.dia);
                    const maxY =
                      Math.max(
                        ...demoIngresos.map((d) => d.valor),
                        ...demoGastos.map((d) => d.valor),
                        ...demoInversiones.map((d) => d.valor),
                        1
                      ) * 1.12;
                    const xScale = scalePoint({
                      domain: labels,
                      range: [0, innerWidth],
                      padding: 0.4,
                    });
                    const yScale = scaleLinear({
                      domain: [0, maxY],
                      range: [innerHeight, 0],
                      nice: true,
                    });
                    const mkLine = (data: { dia: string; valor: number }[]) =>
                      LinePath({
                        data,
                        x: (d) => xScale(d.dia) || 0,
                        y: (d) => yScale(d.valor),
                        curve: curveMonotoneX,
                      });
                    const ingresosLine = mkLine(demoIngresos);
                    const gastosLine = mkLine(demoGastos);
                    const inversionesLine = mkLine(demoInversiones);

                    return (
                      <svg width={width} height={height}>
                        <g transform={`translate(${margin.left},${margin.top})`}>
                          <motion.path
                            d={ingresosLine?.props.d || ""}
                            stroke="#10b981"
                            strokeWidth={2.25}
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                          />
                          <motion.path
                            d={gastosLine?.props.d || ""}
                            stroke="#f43f5e"
                            strokeWidth={2.25}
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.15, ease: "easeInOut" }}
                          />
                          <motion.path
                            d={inversionesLine?.props.d || ""}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="none"
                            strokeDasharray="5 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.28, ease: "easeInOut" }}
                          />
                          {labels.map((label, i) =>
                            i % 2 === 0 || i === labels.length - 1 ? (
                              <text
                                key={label}
                                x={xScale(label)}
                                y={innerHeight + 16}
                                textAnchor="middle"
                                fontSize={11}
                                fill="currentColor"
                                className="fill-foreground/60 dark:fill-foreground/75"
                              >
                                {label}
                              </text>
                            ) : null
                          )}
                        </g>
                      </svg>
                    );
                  }}
                </ParentSize>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-foreground/75 dark:text-foreground/85">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Ingresos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Gastos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Inversión
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-4 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 divide-x divide-border border-y border-border"
          >
            {[
              {
                value:
                  stats?.totalMovimientos != null
                    ? formatNumber(stats.totalMovimientos)
                    : "—",
                label: "Movimientos registrados",
              },
              {
                value:
                  stats?.totalUsuarios != null ? formatNumber(stats.totalUsuarios) : "—",
                label: "Personas usando la app",
              },
              {
                value:
                  stats?.ahorroMedioPorcentaje != null
                    ? `${stats.ahorroMedioPorcentaje}%`
                    : "—",
                label: "Ahorro medio del mes",
              },
            ].map((stat) => (
              <div key={stat.label} className="px-3 py-8 text-center sm:px-6 sm:py-10 sm:text-left">
                <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs leading-snug text-foreground/65 dark:text-foreground/80 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4 }}
              className="lg:sticky lg:top-24"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Qué incluye
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Todo lo esencial, sin fragmentar tu dinero.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-foreground/75 dark:text-foreground/85 sm:text-lg">
                Deja de saltar entre hojas, apps y capturas. FinanzApp concentra el seguimiento que usas de verdad.
              </p>
            </motion.div>

            <div className="flex flex-col">
              {pillars.map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="group flex gap-4 border-t border-border py-6 last:border-b sm:gap-5 sm:py-7"
                >
                  <span className="mt-0.5 w-8 shrink-0 font-mono text-sm font-medium tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <pillar.icon
                        className="h-4 w-4 text-foreground/55 transition group-hover:text-primary dark:text-foreground/70"
                        strokeWidth={1.75}
                      />
                      <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/75 dark:text-foreground/85 sm:text-[15px]">
                      {pillar.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-12 sm:py-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Empieza con una cuenta clara.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-foreground/75 dark:text-foreground/85">
              Configura presupuestos y revisa tu avance desde el primer día. Sin compromiso.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-6 text-sm text-foreground/60 dark:text-foreground/75">
              Próximos pasos en el{" "}
              <Link href="/roadmap" className="font-medium text-foreground underline underline-offset-2">
                roadmap de desarrollo
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-foreground/70 dark:text-foreground/82 md:flex-row md:items-center md:justify-between">
          <span>© 2026 FinanzApp</span>
          <a
            href="https://github.com/hugocnl11"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-foreground"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded border border-border bg-white p-0.5 dark:bg-white/90">
              <img
                src="https://cdn.simpleicons.org/github"
                alt=""
                width={16}
                height={16}
                className="size-4"
              />
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
            <Link href="/roadmap" className="hover:text-foreground">
              Roadmap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
