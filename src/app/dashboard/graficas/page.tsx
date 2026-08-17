"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { patrimonioAcumulado, filterMonthsByPeriod } from "@/lib/dashboard/selectors";
import { buildComposedCashFlow } from "@/lib/dashboard/advanced-charts";
import { formatNumber } from "@/lib/format";
import { ParentSize } from "@visx/responsive";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint, scaleBand } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { CategoryDistributionCard } from "@/components/dashboard/CategoryDistributionCard";
import { CashFlowComposedChart } from "@/components/dashboard/CashFlowComposedChart";
import { MoneyFlowSankey } from "@/components/dashboard/MoneyFlowSankey";
import { ActivityYearHeatmap } from "@/components/dashboard/ActivityYearHeatmap";
import { fetchAssetSnapshotsForDate, fetchAssetSnapshotsInMonth } from "@/lib/api/asset-snapshots";
import type { AssetSnapshotLatest, AssetSnapshotInMonth } from "@/lib/api/asset-snapshots";
import { fetchCategories } from "@/lib/api/categories";
import type { Category } from "@/lib/dashboard/types";
import { ImageDown, Settings2, ChevronUp, ChevronDown, FileText } from "lucide-react";
import {
  buildReportData,
  toInformeHtml,
  toInformeCsv,
  printInformePdf,
  downloadInformeCsv,
} from "@/lib/reports/informe";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "@/lib/toast";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import type { ChartWidgetsPref, UserPreferences } from "@/lib/api/types";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const WIDGET_IDS = [
  "flujoCaja",
  "saldoAcumulado",
  "tasaAhorro",
  "ingresosPorCategoria",
  "gastosPorCategoria",
  "flujoDinero",
  "rentabilidadPorActivo",
  "actividadAnual",
  "actividadPorDia",
] as const;

/** Sube este número al cambiar el orden por defecto para migrar layouts guardados. */
const CHART_LAYOUT_REVISION = 5;

const WIDGET_LABELS: Record<(typeof WIDGET_IDS)[number], string> = {
  flujoCaja: "Flujo de Caja Mensual",
  tasaAhorro: "Tasa de Ahorro Mensual",
  saldoAcumulado: "Saldo Acumulado",
  rentabilidadPorActivo: "Rentabilidad por activo",
  actividadPorDia: "Actividad por día",
  ingresosPorCategoria: "Ingresos por Categoría",
  gastosPorCategoria: "Gastos por Categoría",
  flujoDinero: "Flujo de dinero",
  actividadAnual: "Actividad anual",
};

const CHART_WIDGETS_KEY = "finanzapp:chartWidgets";

/** Altura fija de la mayoría de gráficas */
const CHART_HEIGHT_PX = 200;
/** Altura fija de cada Card estándar */
const CARD_HEIGHT_PX = 320;
/** Altura fija del card Actividad por día (calendario usa todo el espacio) */
const CARD_ACTIVIDAD_PX = 340;
/** Altura de card para Pie charts (donut + leyenda) */
const CARD_HEIGHT_PIE_PX = 380;
/** Altura del donut en Pie charts */
const PIE_CHART_HEIGHT_PX = 240;
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
  return { visible: [...WIDGET_IDS], order: [...WIDGET_IDS], layoutRevision: CHART_LAYOUT_REVISION };
}

type RentabilidadPeriod = "month" | "3m" | "6m" | "12m";
const RENTABILIDAD_PERIODS: { value: RentabilidadPeriod; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "Año" },
];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function GraficasPage() {
  const { data, loading } = useDashboardData();
  const { ingresosMensuales, gastosMensuales, gastosPorCategoria, ingresosPorCategoria, movimientos } = data;
  const [snapshotsToday, setSnapshotsToday] = useState<AssetSnapshotLatest[]>([]);
  const [snapshotsInMonth, setSnapshotsInMonth] = useState<AssetSnapshotInMonth[]>([]);
  const [snapshotsHistorical, setSnapshotsHistorical] = useState<AssetSnapshotInMonth[]>([]);
  const [rentabilidadPeriod, setRentabilidadPeriod] = useState<RentabilidadPeriod>("month");
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
    const validIds = new Set(WIDGET_IDS);
    const normalizePrefs = (prefs: ChartWidgetsPref): { value: ChartWidgetsPref; migrated: boolean } => {
      const visible = prefs.visible.filter((id) => validIds.has(id as (typeof WIDGET_IDS)[number]));
      const orderFromPrefs = prefs.order.filter((id) => validIds.has(id as (typeof WIDGET_IDS)[number]));
      const missing = WIDGET_IDS.filter((id) => !orderFromPrefs.includes(id));
      const needsLayoutMigration = prefs.layoutRevision !== CHART_LAYOUT_REVISION;
      const order = needsLayoutMigration ? [...WIDGET_IDS] : [...orderFromPrefs, ...missing];
      const value: ChartWidgetsPref = {
        visible: visible.length ? visible : [...WIDGET_IDS],
        order,
        layoutRevision: CHART_LAYOUT_REVISION,
        rentabilidadHiddenAssets: prefs.rentabilidadHiddenAssets ?? [],
      };
      const migrated =
        needsLayoutMigration ||
        !visible.length ||
        !orderFromPrefs.length ||
        missing.length > 0;
      return { value, migrated };
    };
    if (isDemoUser()) {
      const stored = loadFromStorage(CHART_WIDGETS_KEY, null as ChartWidgetsPref | null);
      if (stored?.visible?.length && stored?.order?.length) {
        const { value, migrated } = normalizePrefs(stored);
        setChartWidgets(value);
        if (migrated) saveToStorage(CHART_WIDGETS_KEY, value);
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
      const { value, migrated } = normalizePrefs(prefs.chartWidgets);
      setChartWidgets(value);
      if (migrated) {
        const session = getSession();
        const currentPrefs = (session?.user?.preferences ?? {}) as UserPreferences;
        updateProfile({ preferences: { ...currentPrefs, chartWidgets: value } })
          .then((res) => {
            if (res?.data?.user?.preferences) {
              updateSessionUser({ preferences: res.data.user.preferences });
            }
          })
          .catch(() => {});
      }
    }
    setChartWidgetsLoaded(true);
  }, []);

  useEffect(() => {
    loadChartWidgets();
  }, [loadChartWidgets]);

  const saveChartWidgets = useCallback((next: ChartWidgetsPref) => {
    const payload: ChartWidgetsPref = { ...next, layoutRevision: CHART_LAYOUT_REVISION };
    setChartWidgets(payload);
    if (isDemoUser()) {
      saveToStorage(CHART_WIDGETS_KEY, payload);
      return;
    }
    const session = getSession();
    const prefs = (session?.user?.preferences ?? {}) as UserPreferences;
    updateProfile({ preferences: { ...prefs, chartWidgets: payload } })
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

  const toggleRentabilidadAsset = useCallback(
    (name: string) => {
      const hidden = new Set(chartWidgets.rentabilidadHiddenAssets ?? []);
      if (hidden.has(name)) hidden.delete(name);
      else hidden.add(name);
      saveChartWidgets({ ...chartWidgets, rentabilidadHiddenAssets: Array.from(hidden) });
    },
    [chartWidgets, saveChartWidgets]
  );

  const setRentabilidadAssetsHidden = useCallback(
    (hiddenNames: string[]) => {
      saveChartWidgets({ ...chartWidgets, rentabilidadHiddenAssets: hiddenNames });
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

  // Histórico rentabilidad: cargar snapshots de los últimos N meses cuando el periodo no es "month"
  useEffect(() => {
    if (rentabilidadPeriod === "month") {
      setSnapshotsHistorical([]);
      return;
    }
    const n = rentabilidadPeriod === "3m" ? 3 : rentabilidadPeriod === "6m" ? 6 : 12;
    const now = new Date();
    const monthsToFetch: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsToFetch.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    Promise.all(monthsToFetch.map((m) => fetchAssetSnapshotsInMonth(m).then((r) => r.data ?? [])))
      .then((arrays) => setSnapshotsHistorical(arrays.flat() as AssetSnapshotInMonth[]))
      .catch(() => setSnapshotsHistorical([]));
  }, [rentabilidadPeriod]);

  // 1. Flujo compuesto: ingresos, gastos y saldo (últimos 12 meses)
  const composedCashFlow = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return buildComposedCashFlow(ultimos12Ingresos, ultimos12Gastos);
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

  // 3. Tendencia de Saldo Acumulado (últimos 12 meses)
  const saldoAcumulado = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return patrimonioAcumulado(ultimos12Ingresos, ultimos12Gastos);
  }, [ingresosMensuales, gastosMensuales]);

  // Colores para charts
  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"];

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

  // Valor ingresado por categoría de inversión: priorizar investedAmount de la categoría (lo que el usuario pone en "Valor ingresado")
  const valorIngresadoByCategoryName = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoriesList) {
      if (c.type !== "investment") continue;
      const fromMovements = invertidoByCategoryName.get(c.name) ?? 0;
      const valorIngresado = c.investedAmount != null && c.investedAmount > 0 ? Number(c.investedAmount) : fromMovements;
      map.set(c.name, valorIngresado);
    }
    return map;
  }, [categoriesList, invertidoByCategoryName]);

  // Solo categorías de tipo inversión (excluir ahorro)
  const investmentCategoryNames = useMemo(
    () => new Set(categoriesList.filter((c) => c.type === "investment").map((c) => c.name)),
    [categoriesList]
  );

  const rentabilidadAssetNames = useMemo(
    () =>
      Array.from(investmentCategoryNames).filter(
        (name) => (valorIngresadoByCategoryName.get(name) ?? 0) > 0
      ),
    [investmentCategoryNames, valorIngresadoByCategoryName]
  );

  const rentabilidadHiddenSet = useMemo(
    () => new Set(chartWidgets.rentabilidadHiddenAssets ?? []),
    [chartWidgets.rentabilidadHiddenAssets]
  );

  // Rentabilidad por activo: vista "Mes" (día a día) o histórico (3m/6m/12m por mes). Rentabilidad = (valor_actual - valor_ingresado) / valor_ingresado * 100
  const rentabilidadPorDiaPorActivo = useMemo(() => {
    const names = rentabilidadAssetNames;
    if (names.length === 0) {
      return { mode: "day" as const, numPoints: 31, xLabels: undefined, xAxisLabel: "Día del mes", series: [] as { name: string; color: string; points: { x: number; rentabilidad: number }[] }[] };
    }

    if (rentabilidadPeriod === "month") {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();

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

      const series: { name: string; color: string; points: { x: number; rentabilidad: number }[] }[] = [];
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (rentabilidadHiddenSet.has(name)) continue;
        const valorIngresado = valorIngresadoByCategoryName.get(name) ?? 0;
        const byDate = snapByCategoryAndDate.get(name);
        const points: { x: number; rentabilidad: number }[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const datesOnOrBefore = Array.from(byDate?.keys() ?? []).filter((d) => d <= dateStr).sort();
          const value = datesOnOrBefore.length > 0 ? byDate!.get(datesOnOrBefore[datesOnOrBefore.length - 1])! : 0;
          const rentabilidad = valorIngresado > 0 ? ((value - valorIngresado) / valorIngresado) * 100 : 0;
          points.push({ x: day, rentabilidad });
        }
        series.push({ name, color: COLORS[i % COLORS.length], points });
      }
      return { mode: "day" as const, numPoints: daysInMonth, xLabels: undefined, xAxisLabel: "Día del mes", series };
    }

    // Histórico: agrupar snapshots por mes (YYYY-MM), último valor por categoría por mes
    const n = rentabilidadPeriod === "3m" ? 3 : rentabilidadPeriod === "6m" ? 6 : 12;
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const xLabels = monthKeys.map((mk) => {
      const [, m] = mk.split("-");
      return MONTH_SHORT[parseInt(m, 10) - 1];
    });

    const byMonthCategory = new Map<string, Map<string, number>>();
    for (const monthKey of monthKeys) {
      const inMonth = snapshotsHistorical.filter((s) => s.date.startsWith(monthKey) && investmentCategoryNames.has(s.categoryName));
      const latestPerCat = new Map<string, number>();
      for (const catName of new Set(inMonth.map((x) => x.categoryName))) {
        const entries = inMonth.filter((x) => x.categoryName === catName).sort((a, b) => a.date.localeCompare(b.date));
        if (entries.length > 0) latestPerCat.set(catName, entries[entries.length - 1].value);
      }
      byMonthCategory.set(monthKey, latestPerCat);
    }
    const series: { name: string; color: string; points: { x: number; rentabilidad: number }[] }[] = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (rentabilidadHiddenSet.has(name)) continue;
      const valorIngresado = valorIngresadoByCategoryName.get(name) ?? 0;
      const points: { x: number; rentabilidad: number }[] = [];
      for (let xi = 0; xi < monthKeys.length; xi++) {
        const monthKey = monthKeys[xi];
        const byCat = byMonthCategory.get(monthKey);
        const value = byCat?.get(name) ?? 0;
        const rentabilidad = valorIngresado > 0 ? ((value - valorIngresado) / valorIngresado) * 100 : 0;
        points.push({ x: xi, rentabilidad });
      }
      series.push({ name, color: COLORS[i % COLORS.length], points });
    }
    return { mode: "month" as const, numPoints: monthKeys.length, xLabels, xAxisLabel: "Mes", series };
  }, [rentabilidadPeriod, snapshotsInMonth, snapshotsHistorical, investmentCategoryNames, valorIngresadoByCategoryName, rentabilidadAssetNames, rentabilidadHiddenSet]);

  // Actividad por día del mes actual gastado, ingresado, invertido por fecha
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

  const handleExportImage = async () => {
    if (!chartsRef.current || exporting) return;
    setExporting(true);
    try {
      const bgVar = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      const backgroundColor = bgVar ? `hsl(${bgVar})` : "#ffffff";
      const canvas = await html2canvas(chartsRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `graficas-finanzapp-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Gráficas exportadas correctamente.");
    } catch {
      toast.error("No se pudo exportar la imagen.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportInformePdf = () => {
    const informe = buildReportData(data);
    const html = toInformeHtml(informe);
    printInformePdf(html);
    toast.success("Informe listo para imprimir o guardar como PDF.");
  };

  const handleExportInformeCsv = () => {
    const informe = buildReportData(data);
    const csv = toInformeCsv(informe);
    downloadInformeCsv(csv);
    toast.success("Informe CSV descargado.");
  };

  return (
    <div className="space-y-6" aria-label="Gráficas avanzadas">
      <DashboardPageHeader
        eyebrow="Análisis"
        title="Gráficas avanzadas"
        titleId="graficas-titulo"
        description="Análisis detallado de tus finanzas."
        actions={
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
              <SheetContent className="overflow-y-auto max-h-[85vh] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Configurar gráficas</SheetTitle>
                  <SheetDescription>
                    Activa o desactiva gráficas y cambia su orden con las flechas.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => saveChartWidgets({ ...chartWidgets, visible: [...chartWidgets.order] })}
                  >
                    Mostrar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => saveChartWidgets({ ...chartWidgets, visible: [] })}
                  >
                    Ocultar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => saveChartWidgets(defaultChartWidgets())}
                  >
                    Restablecer orden
                  </Button>
                </div>
                <div className="mt-6 divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {chartWidgets.order.map((id, index) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="tabular-nums text-xs text-muted-foreground w-5 shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="checkbox"
                        id={`widget-${id}`}
                        checked={chartWidgets.visible.includes(id)}
                        onChange={(e) => setWidgetVisible(id, e.target.checked)}
                        className="h-4 w-4 rounded border-input touch-manipulation shrink-0"
                        aria-label={`Mostrar u ocultar gráfica: ${WIDGET_LABELS[id as keyof typeof WIDGET_LABELS] ?? id}`}
                      />
                      <span className="flex-1 text-sm font-medium min-w-0 truncate">
                        {WIDGET_LABELS[id as keyof typeof WIDGET_LABELS] ?? id}
                      </span>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveWidget(id, "up")}
                          disabled={index === 0}
                          aria-label="Subir"
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveWidget(id, "down")}
                          disabled={index === chartWidgets.order.length - 1}
                          aria-label="Bajar"
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
          <Button variant="outline" size="touch" className="gap-2 md:min-h-0 md:min-w-0 md:h-8 md:px-3 md:py-1.5 md:text-xs" onClick={handleExportInformePdf} aria-label="Exportar informe como PDF">
            <FileText className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Informe PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button variant="outline" size="touch" className="gap-2 md:min-h-0 md:min-w-0 md:h-8 md:px-3 md:py-1.5 md:text-xs" onClick={handleExportInformeCsv} aria-label="Descargar informe CSV">
            <FileText className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Informe CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
        }
      />

      {!chartWidgetsLoaded ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-2" ref={chartsRef}>
          <Skeleton className="h-[320px] w-full rounded-lg" />
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </div>
      ) : (
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
          className="min-w-0 md:col-span-2"
          key="flujoCaja"
          style={{
            display: visibleOrder.includes("flujoCaja") ? undefined : "none",
            order: visibleOrder.includes("flujoCaja") ? visibleOrder.indexOf("flujoCaja") : 999,
          }}
        >
          <CashFlowComposedChart data={composedCashFlow} />
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
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PIE_PX }}>
          <div className="flex flex-col flex-1 min-h-0">
            <div className="shrink-0">
              <h3 className="text-sm font-medium text-muted-foreground">Tasa de Ahorro Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Porcentaje de ingresos ahorrados</p>
            </div>
            {tasaAhorro.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="flex-1 min-h-0 mt-2">
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

        {/* 3. Tendencia de Saldo Acumulado */}
        <div
          className="min-w-0"
          key="saldoAcumulado"
          style={{
            display: visibleOrder.includes("saldoAcumulado") ? undefined : "none",
            order: visibleOrder.includes("saldoAcumulado") ? visibleOrder.indexOf("saldoAcumulado") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_HEIGHT_PIE_PX }}>
          <div className="flex flex-col flex-1 min-h-0">
            <div className="shrink-0">
              <h3 className="text-sm font-medium text-muted-foreground">Saldo Acumulado</h3>
              <p className="text-xs text-muted-foreground mt-1">Evolución del patrimonio neto</p>
            </div>
            <div className="shrink-0 text-2xl font-bold text-blue-600">
              {formatNumber(saldoAcumulado[saldoAcumulado.length - 1]?.valor ?? 0)} €
            </div>
            {saldoAcumulado.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="flex-1 min-h-0 mt-2">
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
          className="min-w-0 md:col-span-2"
          key="rentabilidadPorActivo"
          style={{
            display: visibleOrder.includes("rentabilidadPorActivo") ? undefined : "none",
            order: visibleOrder.includes("rentabilidadPorActivo") ? visibleOrder.indexOf("rentabilidadPorActivo") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_ACTIVIDAD_PX }}>
          <div className="flex flex-col flex-1 min-h-0">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Rentabilidad por activo</h3>
                <p className="text-xs text-muted-foreground mt-1">Positiva o negativa respecto al valor ingresado</p>
              </div>
              <div className="flex rounded-full bg-muted/50 p-0.5 border border-border/60">
                {RENTABILIDAD_PERIODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRentabilidadPeriod(value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      rentabilidadPeriod === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {rentabilidadAssetNames.length > 0 && (
              <div className="shrink-0 flex flex-wrap items-center gap-1.5 mt-3">
                <button
                  type="button"
                  onClick={() => setRentabilidadAssetsHidden([])}
                  className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setRentabilidadAssetsHidden(rentabilidadAssetNames)}
                  className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  Ninguno
                </button>
                {rentabilidadAssetNames.map((name, i) => {
                  const active = !rentabilidadHiddenSet.has(name);
                  const color = COLORS[i % COLORS.length];
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleRentabilidadAsset(name)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active
                          ? "border-border bg-background text-foreground shadow-sm"
                          : "border-border/50 bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: active ? color : "transparent", boxShadow: `inset 0 0 0 1.5px ${color}` }}
                      />
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
            {rentabilidadAssetNames.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos suficientes. Añade activos de inversión y valor actual en Editar activos.
              </div>
            ) : rentabilidadPorDiaPorActivo.series.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
                No hay activos seleccionados. Pulsa las etiquetas para mostrarlos.
              </div>
            ) : (
              <div className="flex-1 min-h-0 mt-2">
                <ParentSize>
                  {({ width, height }) => {
                    const margin = CHART_MARGIN;
                    const innerWidth = width - margin.left - margin.right;
                    const innerHeight = height - margin.top - margin.bottom;
                    const { mode, numPoints, xLabels, xAxisLabel, series } = rentabilidadPorDiaPorActivo;
                    const allRent = series.flatMap((s) => s.points.map((p) => p.rentabilidad));
                    const minR = allRent.length ? Math.min(...allRent, 0) : 0;
                    const maxR = allRent.length ? Math.max(...allRent, 0) : 0;
                    const padding = Math.max(1, (maxR - minR) * 0.1) || 1;
                    const xMax = mode === "day" ? numPoints : Math.max(numPoints - 1, 0);
                    const xScale = scaleLinear({
                      domain: [mode === "day" ? 1 : 0, mode === "day" ? numPoints : xMax],
                      range: [0, innerWidth],
                      nice: true,
                    });
                    const yScale = scaleLinear({
                      domain: [minR - padding, maxR + padding],
                      range: [innerHeight, 0],
                      nice: true,
                    });
                    const yTicks = yScale.ticks(5);
                    const xTicksToShow = xLabels
                      ? xLabels.map((label, i) => ({ xVal: i, label }))
                      : [1, Math.ceil(numPoints / 2), numPoints].filter((d) => d <= numPoints).map((d) => ({ xVal: d, label: String(d) }));
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
                                x={(d) => xScale(d.x)}
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
                            {xTicksToShow.map(({ xVal, label }) => (
                              <text key={xVal} x={xScale(xVal)} y={innerHeight + 20} textAnchor="middle" fill="currentColor">
                                {label}
                              </text>
                            ))}
                          </g>
                          <text x={innerWidth / 2} y={innerHeight + 28} textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize={CHART_FONT_SIZE_AXIS}>
                            {xAxisLabel}
                          </text>
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

        {/* Actividad por día (calendario del mes) */}
        <div
          className="min-w-0 md:col-span-2"
          key="actividadPorDia"
          style={{
            display: visibleOrder.includes("actividadPorDia") ? undefined : "none",
            order: visibleOrder.includes("actividadPorDia") ? visibleOrder.indexOf("actividadPorDia") : 999,
          }}
        >
        <Card className="p-4 flex flex-col overflow-hidden" style={{ height: CARD_ACTIVIDAD_PX }}>
          <div className="shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground">Actividad por día</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Gastado, ingresos e inversiones en el mes actual
            </p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col w-full mt-3">
            <div className="grid grid-cols-7 gap-1 text-center w-full shrink-0 mb-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-[11px] font-medium text-muted-foreground py-0.5">
                  {wd}
                </div>
              ))}
            </div>
            <div
              className="grid grid-cols-7 flex-1 min-h-0 w-full gap-1"
              style={{
                gridTemplateRows: `repeat(${Math.ceil(((actividadPorDia.firstDay.getDay() + 6) % 7 + actividadPorDia.daysInMonth) / 7)}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: (actividadPorDia.firstDay.getDay() + 6) % 7 }, (_, i) => (
                <div key={`empty-${i}`} className="min-w-0" />
              ))}
              {Array.from({ length: actividadPorDia.daysInMonth }, (_, i) => {
                const day = i + 1;
                const entry = actividadPorDia.byDay.get(day)!;
                const net = entry.ingresado - entry.gastado;
                return (
                  <div
                    key={day}
                    className="min-w-0 rounded-md border border-border/60 flex flex-col items-center justify-center text-[10px] bg-muted/30 hover:bg-muted/50 transition-colors relative group cursor-default overflow-hidden"
                    title={`Día ${day}: Gastado € ${formatNumber(entry.gastado)}, Ingresos € ${formatNumber(entry.ingresado)}, Inversiones € ${formatNumber(entry.invertido)}`}
                  >
                    <span className="font-medium text-foreground leading-tight">{day}</span>
                    {net !== 0 && (
                      <span
                        className={`font-semibold leading-tight mt-0.5 truncate max-w-full ${net > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {net > 0 ? "+" : ""}{formatNumber(net)}
                      </span>
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
        <CategoryDistributionCard
          title="Ingresos por Categoría"
          subtitle="Distribución de fuentes de ingreso"
          data={ingresosPorCategoria}
          loading={loading}
        />
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
        <CategoryDistributionCard
          title="Gastos por Categoría"
          subtitle="Análisis detallado de gastos"
          data={gastosPorCategoria}
          loading={loading}
        />
        </div>

        <div
          className="min-w-0 md:col-span-2"
          key="flujoDinero"
          style={{
            display: visibleOrder.includes("flujoDinero") ? undefined : "none",
            order: visibleOrder.includes("flujoDinero") ? visibleOrder.indexOf("flujoDinero") : 999,
          }}
        >
          <MoneyFlowSankey movimientos={movimientos} />
        </div>

        <div
          className="min-w-0 md:col-span-2"
          key="actividadAnual"
          style={{
            display: visibleOrder.includes("actividadAnual") ? undefined : "none",
            order: visibleOrder.includes("actividadAnual") ? visibleOrder.indexOf("actividadAnual") : 999,
          }}
        >
          <ActivityYearHeatmap movimientos={movimientos} />
        </div>
      </section>
      )}
    </div>
  );
}
