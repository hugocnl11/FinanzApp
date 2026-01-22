"use client";

import Link from "next/link";

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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-black dark:via-slate-950 dark:to-black">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
            FZ
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">FinanzApp</span>
            <span className="text-xs text-muted-foreground">Gestión financiera</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Nueva versión 2.0 disponible
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white md:text-5xl">
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
              <Link
                href="/dashboard"
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Ver demo
              </Link>
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
          <div className="rounded-3xl border border-border bg-white/80 p-6 shadow-xl backdrop-blur dark:bg-slate-900/80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance actual</p>
                  <p className="text-2xl font-bold">€ 12.480</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  +12.4%
                </span>
              </div>
              <div className="h-32 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20" />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-white/70 p-4 dark:bg-slate-900/60">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="text-lg font-semibold text-emerald-600">€ 6.320</p>
                </div>
                <div className="rounded-2xl border border-border bg-white/70 p-4 dark:bg-slate-900/60">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-semibold text-rose-500">€ 4.110</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:bg-slate-900/80"
            >
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl bg-primary/10 p-8 text-center">
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
              className="rounded-full border border-primary/30 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
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
