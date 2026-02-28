"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { patrimonioAcumulado, filterMonthsByPeriod, comparativaAnual, proyeccionMensual } from "@/lib/dashboard/selectors";
import { formatNumber } from "@/lib/format";
import { ParentSize } from "@visx/responsive";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint, scaleBand } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { fetchAssetSnapshotsForDate, fetchAssetSnapshotsInMonth } from "@/lib/api/asset-snapshots";
import type { AssetSnapshotLatest, AssetSnapshotInMonth } from "@/lib/api/asset-snapshots";
import { fetchCategories } from "@/lib/api/categories";
import type { Category } from "@/lib/dashboard/types";
import { ImageDown, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getSession, isDemoUser, updateSessionUser } from "@/lib/auth";
import { updateProfile } from "@/lib/api/auth";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import type { ChartWidgetsPref, UserPreferences } from "@/lib/api/types";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const WIDGET_IDS = [
  "flujoCaja",
  "tasaAhorro",
  "presupuestoVsGasto",
  "saldoAcumulado",
  "rentabilidadPorActivo",
  "actividadPorDia",
  "comparativaAnual",
  "proyecciones",
  "ingresosPorCategoria",
  "gastosPorCategoria",
] as const;

const WIDGET_LABELS: Record<(typeof WIDGET_IDS)[number], string> = {
  flujoCaja: "Flujo de Caja Mensual",
  tasaAhorro: "Tasa de Ahorro Mensual",
  presupuestoVsGasto: "Presupuesto vs Gasto",
  saldoAcumulado: "Saldo Acumulado",
  rentabilidadPorActivo: "Rentabilidad por activo",
  actividadPorDia: "Actividad por día",
  comparativaAnual: "Comparativa anual",
  proyecciones: "Proyecciones",
  ingresosPorCategoria: "Ingresos por Categoría",
  gastosPorCategoria: "Gastos por Categoría",
};

const CHART_WIDGETS_KEY = "finanzapp:chartWidgets";

/** Altura fija de la mayoría de gráficas */
const CHART_HEIGHT_PX = 200;
/** Altura fija de cada Card estándar */
const CARD_HEIGHT_PX = 320;
/** Altura de card para Actividad por día (calendario más grande) */
const CARD_HEIGHT_ACTIVIDAD_PX = 400;
/** Altura de card para Presupuesto vs Gasto (más categorías) */
const CARD_HEIGHT_PRESUPUESTO_PX = 360;
/** Márgenes con espacio para eje Y (left mayor para etiquetas) */
const CHART_MARGIN = { top: 16, right: 16, bottom: 32, left: 52 };
/** Tamaño de fuente para ejes y etiquetas */
const CHART_FONT_SIZE_AXIS = 11;
const CHART_FONT_SIZE_LABEL = 11;

/** Formatea valor para eje Y de moneda (k, M) */
function formatAxisCurrency(v: number): string {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + "k";
  return String(Math.round(v));
}

function defaultChartWidgets(): ChartWidgetsPref {
  return { visible: [...WIDGET_IDS], order: [...WIDGET_IDS] };
}

export default function GraficasPage() {
  const { data } = useDashboardData();
  const { ingresosMensuales, gastosMensuales, gastosPorCategoria, ingresosPorCategoria, movimientos } = data;
  const [snapshotsToday, setSnapshotsToday] = useState<AssetSnapshotLatest[]>([]);
  const [snapshotsInMonth, setSnapshotsInMonth] = useState<AssetSnapshotInMonth[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [exporting, setExporting] = useState(false);
  const [chartWidgets, setChartWidgets] = useState<ChartWidgetsPref>(defaultChartWidgets);
  const [chartWidgetsLoaded, setChartWidgetsLoaded] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  const visibleOrder = useMemo(
    () => chartWidgets.order.filter((id) => chartWidgets.visible.includes(id)),
    [chartWidgets]
  );

  const loadChartWidgets = useCallback(async () => {
    if (isDemoUser()) {
      const stored = loadFromStorage(CHART_WIDGETS_KEY, null as ChartWidgetsPref | null);
      if (stored?.visible?.length && stored?.order?.length) {
        setChartWidgets(stored);
      }
      setChartWidgetsLoaded(true);
      return;
    }
    let prefs = (getSession()?.user?.preferences ?? {}) as UserPreferences;
    if (!prefs.chartWidgets?.visible?.length || !prefs.chartWidgets?.order?.length) {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          prefs = (json?.data?.user?.preferences ?? {}) as UserPreferences;
        }
      } catch {
        // keep session prefs or default
      }
    }
    if (prefs?.chartWidgets?.visible?.length && prefs?.chartWidgets?.order?.length) {
      setChartWidgets(prefs.chartWidgets);
    }
    setChartWidgetsLoaded(true);
  }, []);

  useEffect(() => {
    loadChartWidgets();
  }, [loadChartWidgets]);

  const saveChartWidgets = useCallback((next: ChartWidgetsPref) => {
    setChartWidgets(next);
    if (isDemoUser()) {
      saveToStorage(CHART_WIDGETS_KEY, next);
      return;
    }
    const session = getSession();
    const prefs = (session?.user?.preferences ?? {}) as UserPreferences;
    updateProfile({ preferences: { ...prefs, chartWidgets: next } })
        .then((res) => {
          if (res?.data?.user?.preferences) {
            updateSessionUser({ preferences: res.data.user.preferences });
          }
        })
        .catch(() => {});
    },
    []
  );

  const setWidgetVisible = useCallback(
    (id: string, visible: boolean) => {
      const nextVisible = visible
        ? [...chartWidgets.visible, id]
        : chartWidgets.visible.filter((x) => x !== id);
      saveChartWidgets({ ...chartWidgets, visible: nextVisible });
    },
    [chartWidgets, saveChartWidgets]
  );

  const moveWidget = useCallback(
    (id: string, dir: "up" | "down") => {
      const idx = chartWidgets.order.indexOf(id);
      if (idx === -1) return;
      const nextOrder = [...chartWidgets.order];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= nextOrder.length) return;
      [nextOrder[idx], nextOrder[swap]] = [nextOrder[swap], nextOrder[idx]];
      saveChartWidgets({ ...chartWidgets, order: nextOrder });
    },
    [chartWidgets, saveChartWidgets]
  );

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetchAssetSnapshotsForDate(today)
      .then((res) => setSnapshotsToday(res.data ?? []))
      .catch(() => setSnapshotsToday([]));
  }, []);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    Promise.all([
      fetchCategories().then((r) => r.data ?? []),
      fetchAssetSnapshotsInMonth(month).then((r) => r.data ?? []),
    ])
      .then(([cats, snaps]) => {
        setCategoriesList(cats as Category[]);
        setSnapshotsInMonth(snaps as AssetSnapshotInMonth[]);
      })
      .catch(() => {
        setCategoriesList([]);
        setSnapshotsInMonth([]);
      });
  }, []);

  // 1. Flujo de Caja Mensual (últimos 12 meses)
  const flujoCaja = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return ultimos12Ingresos.map((ing, i) => ({
      mes: ing.mes,
      valor: ing.valor - ultimos12Gastos[i].valor,
    }));
  }, [ingresosMensuales, gastosMensuales]);

  // 2. Tasa de Ahorro Mensual (últimos 12 meses)
  const tasaAhorro = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return ultimos12Ingresos.map((ing, i) => {
      const gasto = ultimos12Gastos[i].valor;
      const ahorro = ing.valor - gasto;
      const tasa = ing.valor ? (ahorro / ing.valor) * 100 : 0;
      return {
        mes: ing.mes,
        valor: tasa,
      };
    });
  }, [ingresosMensuales, gastosMensuales]);

  // 3. Presupuesto vs Gasto por Categoría
  const presupuestoVsGasto = useMemo(() => {
    return gastosPorCategoria.map((cat) => ({
      name: cat.name,
      presupuesto: cat.value * 1.2, // Mock: presupuesto 20% más
      gasto: cat.value,
    }));
  }, [gastosPorCategoria]);

  // 4. Tendencia de Saldo Acumulado (últimos 12 meses)
  const saldoAcumulado = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return patrimonioAcumulado(ultimos12Ingresos, ultimos12Gastos);
  }, [ingresosMensuales, gastosMensuales]);

  // Colores para charts
  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"];
  const totalIngresos = useMemo(
    () => ingresosPorCategoria.reduce((acc, item) => acc + item.value, 0),
    [ingresosPorCategoria]
  );
  const totalGastos = useMemo(
    () => gastosPorCategoria.reduce((acc, item) => acc + item.value, 0),
    [gastosPorCategoria]
  );

  // Invertido por categoría: solo movimientos tipo Inversión (no Ahorro)
  const invertidoByCategoryName = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movimientos) {
      if (m.tipo !== "Inversión") continue;
      const current = map.get(m.categoria) ?? 0;
      map.set(m.categoria, current + Math.abs(m.cantidad));
    }
    return map;
  }, [movimientos]);

  // Solo categorías de tipo inversión (excluir ahorro)
  const investmentCategoryNames = useMemo(
    () => new Set(categoriesList.filter((c) => c.type === "investment").map((c) => c.name)),
    [categoriesList]
  );

  // Rentabilidad por día del mes: una serie por activo de inversión (día → %)
  const rentabilidadPorDiaPorActivo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const names = Array.from(investmentCategoryNames).filter(
      (name) => (invertidoByCategoryName.get(name) ?? 0) > 0
    );
    if (names.length === 0) return { daysInMonth, series: [] as { name: string; color: string; points: { day: number; rentabilidad: number }[] }[] };

    // Por categoría: último valor conocido por día (snapshots ordenados por fecha)
    const snapByCategoryAndDate = new Map<string, Map<string, number>>();
    for (const s of snapshotsInMonth) {
      if (!investmentCategoryNames.has(s.categoryName)) continue;
      let byDate = snapByCategoryAndDate.get(s.categoryName);
      if (!byDate) {
        byDate = new Map<string, number>();
        snapByCategoryAndDate.set(s.categoryName, byDate);
      }
      byDate.set(s.date, s.value);
    }

    const series: { name: string; color: string; points: { day: number; rentabilidad: number }[] }[] = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const invertido = invertidoByCategoryName.get(name) ?? 0;
      const byDate = snapByCategoryAndDate.get(name);
      const points: { day: number; rentabilidad: number }[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const datesOnOrBefore = Array.from(byDate?.keys() ?? []).filter((d) => d <= dateStr).sort();
        const value = datesOnOrBefore.length > 0 ? byDate!.get(datesOnOrBefore[datesOnOrBefore.length - 1])! : 0;
        const rentabilidad = invertido > 0 ? ((value - invertido) / invertido) * 100 : 0;
        points.push({ day, rentabilidad });
      }
      series.push({
        name,
        color: COLORS[i % COLORS.length],
        points,
      });
    }
    return { daysInMonth, series };
  }, [movimientos, categoriesList, snapshotsInMonth, investmentCategoryNames, invertidoByCategoryName]);

  const comparativaAnualData = useMemo(() => comparativaAnual(movimientos), [movimientos]);
  const proyeccionesData = useMemo(
    () => proyeccionMensual(ingresosMensuales, gastosMensuales, 3, 6),
    [ingresosMensuales, gastosMensuales]
  );

  // Actividad por día del mes actual: gastado, ingresado, invertido por fecha
  const actividadPorDia = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const byDay = new Map<
      number,
      { gastado: number; ingresado: number; invertido: number }
    >();
    for (let d = 1; d <= daysInMonth; d++) {
      byDay.set(d, { gastado: 0, ingresado: 0, invertido: 0 });
    }
    for (const m of movimientos) {
      const date = new Date(m.fecha);
      if (date.getFullYear() !== year || date.getMonth() !== month) continue;
      const day = date.getDate();
      const entry = byDay.get(day)!;
      if (m.tipo === "Gasto") entry.gastado += Math.abs(m.cantidad);
      else if (m.tipo === "Ingreso") entry.ingresado += m.cantidad;
      else if (m.tipo === "Inversión" || m.tipo === "Ahorro") entry.invertido += Math.abs(m.cantidad);
    }
    return { byDay, firstDay, daysInMonth };
  }, [movimientos]);

  const tooltipContentStyle = {
    backgroundColor: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  };

  const handleExportImage = async () => {
    if (!chartsRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartsRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: undefined,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `graficas-finanzapp-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("No se pudo exportar la imagen.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8" aria-label="Gráficas avanzadas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 id="graficas-titulo" className="text-2xl md:text-3xl font-bold truncate">Gráficas Avanzadas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análisis detallado de tus finanzas
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones de gráficas">
          {chartWidgetsLoaded && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="touch" className="gap-2 md:min-h-0 md:min-w-0 md:h-8 md:px-3 md:py-1.5 md:text-xs" aria-label="Configurar widgets visibles y orden">
                  <Settings2 className="h-4 w-4" aria-hidden />
                  <span className="md:hidden">Configurar</span>
                  <span className="hidden md:inline">Configurar widgets</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto max-h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Widgets visibles y orden</SheetTitle>
                  <SheetDescription>
                    Activa o desactiva gráficas y cambia el orden con las flechas.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {chartWidgets.order.map((id, index) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg border p-3 bg-card"
                    >
                      <input
                        type="checkbox"
                        id={`widget-${id}`}
                        checked={chartWidgets.visible.includes(id)}
                        onChange={(e) => setWidgetVisible(id, e.target.checked)}
                        className="h-5 w-5 rounded border-input touch-manipulation shrink-0"
                        aria-label={`Mostrar u ocultar gráfica: ${WIDGET_LABELS[id as keyof typeof WIDGET_LABELS] ?? id}`}
                      />
                      <span className="flex-1 text-sm font-medium min-w-0 truncate">
                        {WIDGET_LABELS[id as keyof typeof WIDGET_LABELS] ?? id}
                      </span>
                      <div className="flex flex-col gap-0 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="touch-icon"
                          className="h-11 w-11 md:h-7 md:w-7 md:min-h-0 md:min-w-0"
                          onClick={() => moveWidget(id, "up")}
                          disabled={index === 0}
                          aria-label="Subir en el orden"
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="touch-icon"
                          className="h-11 w-11 md:h-7 md:w-7 md:min-h-0 md:min-w-0"
                          onClick={() => moveWidget(id, "down")}
                          disabled={index === chartWidgets.order.length - 1}
                          aria-label="Bajar en el orden"
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Button variant="outline" size="touch" className="gap-2 md:min-h-0 md:min-w-0 md:h-8 md:px-3 md:py-1.5 md:text-xs" onClick={handleExportImage} disabled={exporting} aria-label={exporting ? "Exportando gráficas" : "Exportar gráficas como imagen"}>
            <ImageDown className="h-4 w-4" aria-hidden />
            {exporting ? "Exportando…" : "Exportar imagen"}
          </Button>
        </div>
      </div>

      <section
        ref={chartsRef}
        className="grid min-w-0 gap-3 md:grid-cols-2 overflow-x-hidden"
        style={{ display: "grid" }}
        aria-labelledby="graficas-titulo"
        role="region"
        aria-label="Gráficas de análisis"
      >
        {/* 1. Flujo de Caja Mensual */}
        <div
          className="min-w-0"
          key="flujoCaja"
          style={{
            display: visibleOrder.includes("flujoCaja") ? undefined : "none",
            order: visibleOrder.includes("flujoCaja") ? visibleOrder.indexOf("flujoCaja") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Flujo de Caja Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Diferencia entre ingresos y gastos</p>
            </div>
            {flujoCaja.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
            <div style={{ height: CHART_HEIGHT_PX }}>
              <ParentSize>
                {({ width, height }) => {
                  const margin = CHART_MARGIN;
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scaleBand({
                    domain: flujoCaja.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.3,
                  });

                  const yScale = scaleLinear({
                    domain: [
                      Math.min(...flujoCaja.map((d) => d.valor), 0),
                      Math.max(...flujoCaja.map((d) => d.valor)),
                    ],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const zeroY = yScale(0);
                  const yTicks = yScale.ticks(5);

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Eje Y - ticks */}
                        {yTicks.map((tick) => (
                          <g key={tick}>
                            <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                            <text x={-8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">
                              {formatAxisCurrency(tick)}
                            </text>
                          </g>
                        ))}
                        {/* Línea del cero */}
                        <line
                          x1={0}
                          x2={innerWidth}
                          y1={zeroY}
                          y2={zeroY}
                          stroke="currentColor"
                          strokeWidth={1}
                          strokeDasharray="4 2"
                          className="text-muted-foreground/30"
                        />
                        {/* Barras */}
                        {flujoCaja.map((d, i) => {
                          const barHeight = Math.abs(yScale(d.valor) - zeroY);
                          const barY = d.valor >= 0 ? yScale(d.valor) : zeroY;
                          const labelY = d.valor >= 0 ? barY - 6 : barY + barHeight + 12;
                          return (
                            <motion.rect
                              key={d.mes}
                              x={xScale(d.mes)}
                              y={barY}
                              width={xScale.bandwidth()}
                              height={barHeight}
                              fill={d.valor >= 0 ? "#22c55e" : "#ef4444"}
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 2.0, delay: i * 0.08 }}
                              style={{ transformOrigin: `center ${zeroY}px` }}
                            />
                          );
                        })}
                        {flujoCaja.map((d, i) => {
                          const barHeight = Math.abs(yScale(d.valor) - zeroY);
                          const barY = d.valor >= 0 ? yScale(d.valor) : zeroY;
                          const labelY = d.valor >= 0 ? barY - 6 : barY + barHeight + 12;
                          return (
                            <text
                              key={`value-${i}`}
                              x={(xScale(d.mes) || 0) + xScale.bandwidth() / 2}
                              y={labelY}
                              textAnchor="middle"
                              fontSize={CHART_FONT_SIZE_AXIS}
                              fill="currentColor"
                              className="text-foreground"
                            >
                              {formatNumber(d.valor)}
                            </text>
                          );
                        })}
                        {/* Etiquetas X */}
                        {flujoCaja.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={(xScale(d.mes) || 0) + xScale.bandwidth() / 2}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            )}
          </div>
        </Card>
        </div>

        {/* 2. Tasa de Ahorro Mensual */}
        <div
          className="min-w-0"
          key="tasaAhorro"
          style={{
            display: visibleOrder.includes("tasaAhorro") ? undefined : "none",
            order: visibleOrder.includes("tasaAhorro") ? visibleOrder.indexOf("tasaAhorro") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Tasa de Ahorro Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Porcentaje de ingresos ahorrados</p>
            </div>
            {tasaAhorro.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
            <div style={{ height: CHART_HEIGHT_PX }}>
              <ParentSize>
                {({ width, height }) => {
                  const margin = CHART_MARGIN;
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scalePoint({
                    domain: tasaAhorro.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.5,
                  });

                  const yScale = scaleLinear({
                    domain: [0, Math.max(...tasaAhorro.map((d) => d.valor), 50)],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const linePath = LinePath({
                    data: tasaAhorro,
                    x: (d) => xScale(d.mes) || 0,
                    y: (d) => yScale(d.valor),
                    curve: curveMonotoneX,
                  });
                  const yTicks = yScale.ticks(5);

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Eje Y - ticks */}
                        {yTicks.map((tick) => (
                          <g key={tick}>
                            <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                            <text x={-8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">
                              {tick}%
                            </text>
                          </g>
                        ))}
                        {/* Línea meta 20% */}
                        <line
                          x1={0}
                          x2={innerWidth}
                          y1={yScale(20)}
                          y2={yScale(20)}
                          stroke="#22c55e"
                          strokeWidth={1}
                          strokeDasharray="6 3"
                          opacity={0.4}
                        />
                        <text
                          x={innerWidth - 5}
                          y={yScale(20) - 5}
                          textAnchor="end"
                          fontSize={CHART_FONT_SIZE_AXIS}
                          fill="#22c55e"
                          opacity={0.6}
                        >
                          Meta 20%
                        </text>
                        {/* Línea principal */}
                        <motion.path
                          d={linePath?.props.d || ""}
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeInOut" }}
                        />
                        {/* Puntos */}
                        {tasaAhorro.map((d, i) => (
                          <motion.circle
                            key={i}
                            cx={xScale(d.mes)}
                            cy={yScale(d.valor)}
                            r={4}
                            fill="#8b5cf6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                          />
                        ))}
                        {tasaAhorro.map((d, i) => (
                          <text
                            key={`value-${i}`}
                            x={xScale(d.mes)}
                            y={yScale(d.valor) - 10}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-foreground"
                          >
                            {d.valor.toFixed(0)}%
                          </text>
                        ))}
                        {/* Etiquetas X */}
                        {tasaAhorro.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={xScale(d.mes)}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            )}
          </div>
        </Card>
        </div>

        {/* 3. Presupuesto vs Gasto por Categoría */}
        <div
          className="min-w-0"
          key="presupuestoVsGasto"
          style={{
            display: visibleOrder.includes("presupuestoVsGasto") ? undefined : "none",
            order: visibleOrder.includes("presupuestoVsGasto") ? visibleOrder.indexOf("presupuestoVsGasto") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PRESUPUESTO_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Presupuesto vs Gasto</h3>
              <p className="text-xs text-muted-foreground mt-1">Comparación por categoría</p>
            </div>
            {presupuestoVsGasto.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
            <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 260 }}>
              <div style={{ height: 64 + presupuestoVsGasto.length * 52, minHeight: 200 }}>
                <ParentSize>
                {({ width, height }) => {
                  const margin = { ...CHART_MARGIN, left: 120 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;
                  const maxValue = Math.max(...presupuestoVsGasto.flatMap((d) => [d.presupuesto, d.gasto]));

                  const yScale = scaleBand({
                    domain: presupuestoVsGasto.map((d) => d.name),
                    range: [0, innerHeight],
                    padding: 0.3,
                  });

                  const xScale = scaleLinear({
                    domain: [0, maxValue],
                    range: [0, innerWidth],
                    nice: true,
                  });

                  return (
                    <svg width={width} height={height}>
                      <defs>
                        <linearGradient id="budget-gradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#cbd5f5" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.9" />
                        </linearGradient>
                        {presupuestoVsGasto.map((item, i) => (
                          <linearGradient key={item.name} id={`spend-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.6" />
                          </linearGradient>
                        ))}
                        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.2" />
                        </filter>
                      </defs>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {presupuestoVsGasto.map((d, i) => {
                          const barHeight = Math.max(20, yScale.bandwidth() / 2.5);
                          const gap = 8;
                          const yBase = (yScale(d.name) || 0) + (yScale.bandwidth() - (barHeight * 2 + gap)) / 2;
                          const yBudget = yBase;
                          const ySpent = yBase + barHeight + gap;
                          const labelY = (yScale(d.name) || 0) + yScale.bandwidth() / 2;
                          return (
                            <g key={d.name}>
                              {/* Track background */}
                              <rect
                                x={0}
                                y={yBudget}
                                width={xScale(maxValue)}
                                height={barHeight}
                                rx={4}
                                fill="hsl(var(--muted))"
                                opacity={0.35}
                              />
                              <rect
                                x={0}
                                y={ySpent}
                                width={xScale(maxValue)}
                                height={barHeight}
                                rx={4}
                                fill="hsl(var(--muted))"
                                opacity={0.35}
                              />
                              {/* Barra presupuesto (gris) */}
                              <motion.rect
                                x={0}
                                y={yBudget}
                                width={xScale(d.presupuesto)}
                                height={barHeight}
                                fill="url(#budget-gradient)"
                                rx={4}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2.0, delay: i * 0.1 }}
                                style={{ transformOrigin: "left" }}
                              />
                              <text
                                x={xScale(d.presupuesto) + 6}
                                y={yBudget + barHeight / 2}
                                textAnchor="start"
                                fontSize={CHART_FONT_SIZE_AXIS}
                                fill="currentColor"
                                className="text-muted-foreground"
                                dominantBaseline="middle"
                              >
                                €{formatNumber(d.presupuesto)}
                              </text>
                              {/* Barra gasto (color) */}
                              <motion.rect
                                x={0}
                                y={ySpent}
                                width={xScale(d.gasto)}
                                height={barHeight}
                                fill={`url(#spend-gradient-${i})`}
                                rx={4}
                                filter="url(#soft-shadow)"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2.0, delay: i * 0.1 + 0.15 }}
                                style={{ transformOrigin: "left" }}
                              />
                              <text
                                x={xScale(d.gasto) + 6}
                                y={ySpent + barHeight / 2}
                                textAnchor="start"
                                fontSize={CHART_FONT_SIZE_AXIS}
                                fill="currentColor"
                                className="text-foreground"
                                dominantBaseline="middle"
                              >
                                €{formatNumber(d.gasto)}
                              </text>
                              {/* Etiqueta categoría dentro del margen izquierdo */}
                              <foreignObject x={-116} y={labelY - 12} width={110} height={24} style={{ pointerEvents: "none", overflow: "visible" }}>
                                <div xmlns="http://www.w3.org/1999/xhtml" className="flex h-6 items-center justify-end rounded-md bg-muted/60 px-2 text-[11px] font-medium text-foreground/90 truncate pr-1">
                                  {d.name}
                                </div>
                              </foreignObject>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
              </div>
            </div>
            )}
            <div className="flex gap-4 justify-center text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-400/80" /> Presupuesto
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary" /> Gasto real
              </div>
            </div>
          </div>
        </Card>
        </div>

        {/* 4. Tendencia de Saldo Acumulado */}
        <div
          className="min-w-0"
          key="saldoAcumulado"
          style={{
            display: visibleOrder.includes("saldoAcumulado") ? undefined : "none",
            order: visibleOrder.includes("saldoAcumulado") ? visibleOrder.indexOf("saldoAcumulado") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Saldo Acumulado</h3>
              <p className="text-xs text-muted-foreground mt-1">Evolución del patrimonio neto</p>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(saldoAcumulado[saldoAcumulado.length - 1]?.valor ?? 0)} €
            </div>
            {saldoAcumulado.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
            <div style={{ height: CHART_HEIGHT_PX }}>
              <ParentSize>
                {({ width, height }) => {
                  const margin = CHART_MARGIN;
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scalePoint({
                    domain: saldoAcumulado.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.5,
                  });

                  const yScale = scaleLinear({
                    domain: [0, Math.max(...saldoAcumulado.map((d) => d.valor))],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const linePath = LinePath({
                    data: saldoAcumulado,
                    x: (d) => xScale(d.mes) || 0,
                    y: (d) => yScale(d.valor),
                    curve: curveMonotoneX,
                  });
                  const yTicks = yScale.ticks(5);

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Eje Y - ticks */}
                        {yTicks.map((tick) => (
                          <g key={tick}>
                            <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                            <text x={-8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">
                              {formatAxisCurrency(tick)}
                            </text>
                          </g>
                        ))}
                        {/* Área bajo la línea */}
                        <motion.path
                          d={linePath?.props.d || ""}
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeInOut" }}
                        />
                        {/* Puntos */}
                        {saldoAcumulado.map((d, i) => (
                          <motion.circle
                            key={i}
                            cx={xScale(d.mes)}
                            cy={yScale(d.valor)}
                            r={4}
                            fill="#3b82f6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                          />
                        ))}
                        {saldoAcumulado.map((d, i) => (
                          <text
                            key={`value-${i}`}
                            x={xScale(d.mes)}
                            y={yScale(d.valor) - 10}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-foreground"
                          >
                            {formatNumber(d.valor)}
                          </text>
                        ))}
                        {/* Etiquetas X */}
                        {saldoAcumulado.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={xScale(d.mes)}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            )}
          </div>
        </Card>
        </div>

        {/* Rentabilidad por activo */}
        <div
          className="min-w-0"
          key="rentabilidadPorActivo"
          style={{
            display: visibleOrder.includes("rentabilidadPorActivo") ? undefined : "none",
            order: visibleOrder.includes("rentabilidadPorActivo") ? visibleOrder.indexOf("rentabilidadPorActivo") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Rentabilidad por activo</h3>
              <p className="text-xs text-muted-foreground mt-1">Positiva o negativa respecto al valor ingresado</p>
            </div>
            {rentabilidadPorDiaPorActivo.series.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos suficientes. Añade activos de inversión y valor actual en Editar activos.
              </div>
            ) : (
              <div style={{ height: CHART_HEIGHT_PX }}>
                <ParentSize>
                  {({ width, height }) => {
                    const margin = CHART_MARGIN;
                    const innerWidth = width - margin.left - margin.right;
                    const innerHeight = height - margin.top - margin.bottom;
                    const { daysInMonth, series } = rentabilidadPorDiaPorActivo;
                    const allRent = series.flatMap((s) => s.points.map((p) => p.rentabilidad));
                    const minR = Math.min(...allRent, 0);
                    const maxR = Math.max(...allRent, 0);
                    const padding = Math.max(1, (maxR - minR) * 0.1) || 1;
                    const xScale = scaleLinear({
                      domain: [1, daysInMonth],
                      range: [0, innerWidth],
                      nice: true,
                    });
                    const yScale = scaleLinear({
                      domain: [minR - padding, maxR + padding],
                      range: [innerHeight, 0],
                      nice: true,
                    });
                    const yTicks = yScale.ticks(5);
                    return (
                      <svg width={width} height={height} className="text-foreground">
                        <g transform={`translate(${margin.left},${margin.top})`}>
                          {yTicks.map((tick) => (
                            <g key={tick}>
                              <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
                              <text x={-6} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fill="currentColor" className="text-muted-foreground" fontSize={CHART_FONT_SIZE_AXIS}>
                                {tick}%
                              </text>
                            </g>
                          ))}
                          {series.map((s) => (
                            <g key={s.name}>
                              <LinePath
                                data={s.points}
                                x={(d) => xScale(d.day)}
                                y={(d) => yScale(d.rentabilidad)}
                                curve={curveMonotoneX}
                                stroke={s.color}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                          ))}
                          <line
                            x1={0}
                            x2={innerWidth}
                            y1={yScale(0)}
                            y2={yScale(0)}
                            stroke="currentColor"
                            strokeDasharray="4 2"
                            className="text-muted-foreground/40"
                          />
                          <g className="text-muted-foreground" fontSize={CHART_FONT_SIZE_AXIS}>
                            {[1, Math.ceil(daysInMonth / 2), daysInMonth].filter((d) => d <= daysInMonth).map((day) => (
                              <text
                                key={day}
                                x={xScale(day)}
                                y={innerHeight + 20}
                                textAnchor="middle"
                                fill="currentColor"
                              >
                                {day}
                              </text>
                            ))}
                          </g>
                          <text x={innerWidth / 2} y={innerHeight + 28} textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize={CHART_FONT_SIZE_AXIS}>
                            Día del mes
                          </text>
                        </g>
                      </svg>
                    );
                  }}
                </ParentSize>
                {rentabilidadPorDiaPorActivo.series.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-2 max-h-[84px] overflow-y-auto overflow-x-hidden text-xs">
                    {rentabilidadPorDiaPorActivo.series.map((s) => (
                      <span key={s.name} className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        </div>

        {/* Actividad por día (calendario del mes) */}
        <div
          className="min-w-0"
          key="actividadPorDia"
          style={{
            display: visibleOrder.includes("actividadPorDia") ? undefined : "none",
            order: visibleOrder.includes("actividadPorDia") ? visibleOrder.indexOf("actividadPorDia") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_ACTIVIDAD_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Actividad por día</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gastado, ingresos e inversiones en el mes actual
              </p>
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
            <div className="grid grid-cols-7 gap-2 text-center min-w-[200px]">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-[11px] font-medium text-muted-foreground py-1.5">
                  {wd}
                </div>
              ))}
              {Array.from({ length: (actividadPorDia.firstDay.getDay() + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square min-w-[24px] min-h-[24px]" />
              ))}
              {Array.from({ length: actividadPorDia.daysInMonth }, (_, i) => {
                const day = i + 1;
                const entry = actividadPorDia.byDay.get(day)!;
                const hasActivity = entry.gastado > 0 || entry.ingresado > 0 || entry.invertido > 0;
                return (
                  <div
                    key={day}
                    className="aspect-square min-w-[24px] min-h-[24px] rounded-md border border-border/60 flex flex-col items-center justify-center text-[12px] bg-muted/30 hover:bg-muted/50 transition-colors relative group cursor-default"
                    title={`Día ${day}: Gastado € ${formatNumber(entry.gastado)}, Ingresos € ${formatNumber(entry.ingresado)}, Inversiones € ${formatNumber(entry.invertido)}`}
                  >
                    <span className="font-medium text-foreground leading-tight">{day}</span>
                    {hasActivity && (
                      <div className="flex gap-0.5 mt-0.5">
                        {entry.gastado > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title="Gastado" />}
                        {entry.ingresado > 0 && <span className="w-2 h-2 rounded-full bg-green-500" title="Ingresos" />}
                        {entry.invertido > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title="Inversiones" />}
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 rounded-md bg-popover border border-border shadow-lg text-[11px] opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap transition-opacity">
                      <strong>Día {day}</strong><br />
                      Gastado: € {formatNumber(entry.gastado)}<br />
                      Ingresos: € {formatNumber(entry.ingresado)}<br />
                      Inversiones: € {formatNumber(entry.invertido)}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </Card>
        </div>

        {/* Comparativa anual */}
        <div
          className="min-w-0"
          key="comparativaAnual"
          style={{
            display: visibleOrder.includes("comparativaAnual") ? undefined : "none",
            order: visibleOrder.includes("comparativaAnual") ? visibleOrder.indexOf("comparativaAnual") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Comparativa anual</h3>
              <p className="text-xs text-muted-foreground mt-1">Ingresos y gastos: año actual vs anterior</p>
            </div>
            <div style={{ height: CHART_HEIGHT_PX }}>
              <ParentSize>
                {({ width, height }) => {
                  const margin = CHART_MARGIN;
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;
                  const months = comparativaAnualData.thisYear.map((d) => d.mes);
                  const maxVal = Math.max(
                    ...comparativaAnualData.thisYear.flatMap((d) => [d.ingresos, d.gastos]),
                    ...comparativaAnualData.lastYear.flatMap((d) => [d.ingresos, d.gastos]),
                    1
                  );
                  const xScale = scaleBand({
                    domain: months,
                    range: [0, innerWidth],
                    padding: 0.25,
                  });
                  const yScale = scaleLinear({
                    domain: [0, maxVal],
                    range: [innerHeight, 0],
                    nice: true,
                  });
                  const subBand = xScale.bandwidth() / 3;
                  const yTicks = yScale.ticks(5);
                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Eje Y */}
                        {yTicks.map((tick) => (
                          <g key={tick}>
                            <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                            <text x={-8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">
                              {formatAxisCurrency(tick)}
                            </text>
                          </g>
                        ))}
                        {comparativaAnualData.thisYear.map((d, i) => (
                          <g key={`ty-${i}`}>
                            <motion.rect
                              x={(xScale(d.mes) ?? 0) + subBand * 0}
                              y={yScale(d.ingresos)}
                              width={subBand - 2}
                              height={innerHeight - yScale(d.ingresos)}
                              fill="#22c55e"
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.5, delay: i * 0.03 }}
                              style={{ transformOrigin: `bottom` }}
                            />
                            <motion.rect
                              x={(xScale(d.mes) ?? 0) + subBand * 1}
                              y={yScale(d.gastos)}
                              width={subBand - 2}
                              height={innerHeight - yScale(d.gastos)}
                              fill="#ef4444"
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.5, delay: i * 0.03 + 0.05 }}
                              style={{ transformOrigin: `bottom` }}
                            />
                          </g>
                        ))}
                        {comparativaAnualData.lastYear.map((d, i) => (
                          <motion.rect
                            key={`ly-${i}`}
                            x={(xScale(d.mes) ?? 0) + subBand * 2}
                            y={yScale(d.ingresos - d.gastos)}
                            width={subBand - 2}
                            height={Math.abs(innerHeight - yScale(0) - (yScale(d.ingresos - d.gastos) - yScale(0)))}
                            fill="#8b5cf6"
                            rx={4}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.03 + 0.1 }}
                            style={{ transformOrigin: d.ingresos - d.gastos >= 0 ? "bottom" : "top" }}
                          />
                        ))}
                        {months.map((m, i) => (
                          <text
                            key={i}
                            x={(xScale(m) ?? 0) + xScale.bandwidth() / 2}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={CHART_FONT_SIZE_AXIS}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {m}
                          </text>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            <div className="flex flex-wrap gap-3 justify-center text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Ingresos {new Date().getFullYear()}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Gastos {new Date().getFullYear()}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500" /> Saldo (ingresos − gastos) {new Date().getFullYear() - 1}</span>
            </div>
          </div>
        </Card>
        </div>

        {/* Proyecciones */}
        <div
          className="min-w-0"
          key="proyecciones"
          style={{
            display: visibleOrder.includes("proyecciones") ? undefined : "none",
            order: visibleOrder.includes("proyecciones") ? visibleOrder.indexOf("proyecciones") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Proyecciones</h3>
              <p className="text-xs text-muted-foreground mt-1">Media de los últimos 6 meses aplicada a los próximos 3</p>
            </div>
            {proyeccionesData.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>Sin datos suficientes</div>
            ) : (
            <div style={{ height: CHART_HEIGHT_PX }}>
              <ParentSize>
                {({ width, height }) => {
                  const margin = CHART_MARGIN;
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;
                  const maxVal = Math.max(...proyeccionesData.flatMap((d) => [d.ingresos, d.gastos]), 1);
                  const xScale = scaleBand({
                    domain: proyeccionesData.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.35,
                  });
                  const yScale = scaleLinear({ domain: [0, maxVal], range: [innerHeight, 0], nice: true });
                  const yTicks = yScale.ticks(5);
                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Eje Y */}
                        {yTicks.map((tick) => (
                          <g key={tick}>
                            <line x1={0} x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                            <text x={-8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">
                              {formatAxisCurrency(tick)}
                            </text>
                          </g>
                        ))}
                        {proyeccionesData.map((d, i) => (
                          <g key={i}>
                            <motion.rect
                              x={xScale(d.mes)}
                              y={yScale(d.ingresos)}
                              width={xScale.bandwidth() / 2 - 2}
                              height={innerHeight - yScale(d.ingresos)}
                              fill="#22c55e"
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.4, delay: i * 0.08 }}
                              style={{ transformOrigin: "bottom" }}
                            />
                            <motion.rect
                              x={(xScale(d.mes) ?? 0) + xScale.bandwidth() / 2}
                              y={yScale(d.gastos)}
                              width={xScale.bandwidth() / 2 - 2}
                              height={innerHeight - yScale(d.gastos)}
                              fill="#ef4444"
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.4, delay: i * 0.08 + 0.04 }}
                              style={{ transformOrigin: "bottom" }}
                            />
                          </g>
                        ))}
                        {proyeccionesData.map((d, i) => (
                          <text key={i} x={(xScale(d.mes) ?? 0) + xScale.bandwidth() / 2} y={innerHeight + 20} textAnchor="middle" fontSize={CHART_FONT_SIZE_AXIS} fill="currentColor" className="text-muted-foreground">{d.mes}</text>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            )}
            <div className="flex gap-4 justify-center text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Ingresos proyectados</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Gastos proyectados</span>
            </div>
          </div>
        </Card>
        </div>

        {/* 5. Ingresos por Categoría */}
        <div
          className="min-w-0"
          key="ingresosPorCategoria"
          style={{
            display: visibleOrder.includes("ingresosPorCategoria") ? undefined : "none",
            order: visibleOrder.includes("ingresosPorCategoria") ? visibleOrder.indexOf("ingresosPorCategoria") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Distribución de fuentes de ingreso</p>
            </div>
            {ingresosPorCategoria.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
              <>
                <div className="relative min-h-0" style={{ height: CHART_HEIGHT_PX }}>
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-2xl font-semibold">{formatNumber(totalIngresos)} €</span>
                  </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ingresosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                        innerRadius="60%"
                        outerRadius="88%"
                        paddingAngle={2}
                        cornerRadius={8}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                  >
                    {ingresosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                    cursor={{ fill: "transparent" }}
                    contentStyle={tooltipContentStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-xs max-h-[88px] overflow-y-auto overflow-x-hidden">
                  {[...ingresosPorCategoria].sort((a, b) => b.value - a.value).map((entry) => {
                    const index = ingresosPorCategoria.indexOf(entry);
                    const pct = totalIngresos ? (entry.value / totalIngresos) * 100 : 0;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate text-[11px]">{entry.name}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground text-[11px] shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Card>
        </div>

        {/* 6. Gastos por Categoría (expandido) */}
        <div
          className="min-w-0"
          key="gastosPorCategoria"
          style={{
            display: visibleOrder.includes("gastosPorCategoria") ? undefined : "none",
            order: visibleOrder.includes("gastosPorCategoria") ? visibleOrder.indexOf("gastosPorCategoria") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PX }}>
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gastos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Análisis detallado de gastos</p>
            </div>
            {gastosPorCategoria.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT_PX }}>
                Sin datos disponibles
              </div>
            ) : (
              <>
                <div className="relative min-h-0" style={{ height: CHART_HEIGHT_PX }}>
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-2xl font-semibold">{formatNumber(totalGastos)} €</span>
                  </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                        innerRadius="60%"
                        outerRadius="88%"
                        paddingAngle={2}
                        cornerRadius={8}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                    cursor={{ fill: "transparent" }}
                    contentStyle={tooltipContentStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-xs max-h-[88px] overflow-y-auto overflow-x-hidden">
                  {[...gastosPorCategoria].sort((a, b) => b.value - a.value).map((entry) => {
                    const index = gastosPorCategoria.indexOf(entry);
                    const pct = totalGastos ? (entry.value / totalGastos) * 100 : 0;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate text-[11px]">{entry.name}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground text-[11px] shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Card>
        </div>
      </section>
    </div>
  );
}
