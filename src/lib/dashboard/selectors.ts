import type { MoneyByMonth, MoneyByDay, MonthLabel } from "./types";
import type { Budget, Category, CategoryAmount, Goal, Movement } from "./types";

const MOVEMENT_TIPO_BY_CATEGORY_TYPE: Record<"expense" | "investment" | "savings", Movement["tipo"]> = {
  expense: "Gasto",
  investment: "Inversión",
  savings: "Ahorro",
};

export function sum(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

export function sumByMonth(series: MoneyByMonth[]) {
  return sum(series.map((s) => s.valor));
}

export function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function previous<T>(arr: T[]): T | undefined {
  return arr[arr.length - 2];
}

export function patrimonioAcumulado(ingresos: MoneyByMonth[], gastos: MoneyByMonth[]) {
  let patrimonio = 0;
  return ingresos.map((ing, i) => {
    patrimonio += ing.valor - (gastos[i]?.valor ?? 0);
    return { mes: ing.mes, valor: patrimonio };
  });
}

/** Patrimonio = total activos a fin de mes + (ingresos acumulados − gastos acumulados). */
export function patrimonioConActivos(
  ingresos: MoneyByMonth[],
  gastos: MoneyByMonth[],
  activosPorMes: MoneyByMonth[]
): MoneyByMonth[] {
  let acumIngresosMenosGastos = 0;
  return ingresos.map((ing, i) => {
    acumIngresosMenosGastos += ing.valor - (gastos[i]?.valor ?? 0);
    const activos = activosPorMes[i]?.valor ?? 0;
    return { mes: ing.mes, valor: activos + acumIngresosMenosGastos };
  });
}

export function gastosPorCategoriaDesdeMovimientos(movimientos: Movement[]): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const m of movimientos) {
    if (m.tipo !== "Gasto") continue;
    const value = Math.abs(m.cantidad);
    map.set(m.categoria, (map.get(m.categoria) ?? 0) + value);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function scaleCategoriesToTotal(categories: CategoryAmount[], targetTotal: number): CategoryAmount[] {
  const currentTotal = categories.reduce((acc, c) => acc + c.value, 0);
  if (!currentTotal || !targetTotal) return categories;
  const factor = targetTotal / currentTotal;
  return categories.map((c) => ({ ...c, value: c.value * factor }));
}

export function movimientosPorRango(
  movimientos: Movement[],
  startDate?: string,
  endDate?: string
) {
  return movimientos.filter((movement) => {
    const afterStart = !startDate || movement.fecha >= startDate;
    const beforeEnd = !endDate || movement.fecha <= endDate;
    return afterStart && beforeEnd;
  });
}

export function progresoObjetivo(goal: Goal) {
  if (!goal.target) return 0;
  return Math.min((goal.saved / goal.target) * 100, 100);
}

/**
 * Gastado/invertido/ahorrado por presupuesto.
 * Si se pasa `categories`, se usa el tipo de cada categoría para sumar Gasto, Inversión o Ahorro según corresponda.
 * Si no se pasa `categories`, solo se cuentan movimientos tipo "Gasto" (comportamiento legacy).
 */
export function presupuestoUsadoPorCategoria(
  movimientos: Movement[],
  budgets: Budget[],
  categories?: Category[]
) {
  const categoryTypeByName = new Map<string, "expense" | "investment" | "savings">();
  if (categories) {
    categories.forEach((c) => {
      if (c.type === "expense" || c.type === "investment" || c.type === "savings") {
        categoryTypeByName.set(c.name, c.type);
      }
    });
  }

  return budgets.map((budget) => {
    const expectedTipo = categoryTypeByName.get(budget.category);
    const spent = movimientos
      .filter((movement) => {
        if (movement.categoria !== budget.category) return false;
        if (expectedTipo != null) {
          return movement.tipo === MOVEMENT_TIPO_BY_CATEGORY_TYPE[expectedTipo];
        }
        return movement.tipo === "Gasto";
      })
      .reduce((acc, movement) => acc + Math.abs(movement.cantidad), 0);
    return {
      categoryId: budget.category,
      amount: budget.limit,
      spent,
      percent: budget.limit ? Math.min((spent / budget.limit) * 100, 150) : 0,
    };
  });
}

export function estadisticasCategorias(movimientos: Movement[]): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const movement of movimientos) {
    map.set(movement.categoria, (map.get(movement.categoria) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function prediccionGastosFuturos(movimientos: Movement[], windowSize = 3) {
  const gastos = movimientos.filter((movement) => movement.tipo === "Gasto");
  const recent = gastos.slice(-windowSize);
  if (recent.length === 0) return 0;
  const promedio = recent.reduce((acc, movement) => acc + Math.abs(movement.cantidad), 0) / recent.length;
  return Math.round(promedio);
}

// Funciones de filtrado por período
export type Period = "Mes" | "Trimestre" | "Año";

export function filterMonthsByPeriod(data: MoneyByMonth[], monthCount: number): MoneyByMonth[] {
  if (data.length === 0) return data;
  return data.slice(-monthCount);
}

export function filterMovementsByPeriod(movements: Movement[], monthCount: number): Movement[] {
  if (movements.length === 0) return movements;
  
  // Ordenar movimientos por fecha
  const sorted = [...movements].sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  // Obtener la fecha más reciente
  const latestDate = new Date(sorted[sorted.length - 1].fecha);
  
  // Calcular la fecha de inicio según el período
  const startDate = new Date(latestDate);
  startDate.setMonth(startDate.getMonth() - monthCount + 1);
  startDate.setDate(1); // Primer día del mes
  
  // Filtrar movimientos dentro del rango
  return sorted.filter((movement) => {
    const movementDate = new Date(movement.fecha);
    return movementDate >= startDate && movementDate <= latestDate;
  });
}

export function sumFilteredMonths(data: MoneyByMonth[], monthCount: number): number {
  const filtered = filterMonthsByPeriod(data, monthCount);
  return filtered.reduce((acc, item) => acc + item.valor, 0);
}

export function percentChangeByPeriod(current: MoneyByMonth[], previous: MoneyByMonth[], monthCount: number): number {
  const currentData = filterMonthsByPeriod(current, monthCount);
  const previousData = filterMonthsByPeriod(previous.slice(0, -monthCount), monthCount);
  
  const currentSum = currentData.reduce((acc, item) => acc + item.valor, 0);
  const previousSum = previousData.reduce((acc, item) => acc + item.valor, 0);
  
  return percentChange(currentSum, previousSum);
}

/** Índice del mes de fin en la serie; si no hay monthKey en los datos, usa el último índice */
export function resolveEndMonthIndex(series: MoneyByMonth[], endMonthKey?: string | null): number {
  if (series.length === 0) return -1;
  if (endMonthKey) {
    const idx = series.findIndex((m) => m.monthKey === endMonthKey);
    if (idx >= 0) return idx;
  }
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].monthKey) return i;
  }
  return series.length - 1;
}

export function sliceMonthsEndingAt(
  series: MoneyByMonth[],
  count: number,
  endMonthKey?: string | null
): MoneyByMonth[] {
  const endIdx = resolveEndMonthIndex(series, endMonthKey);
  if (endIdx < 0) return [];
  if (!series.some((m) => m.monthKey)) {
    return series.slice(-Math.min(count, series.length));
  }
  const start = Math.max(0, endIdx - (count - 1));
  return series.slice(start, endIdx + 1);
}

export function sumMoneyByMonthForDashboard(
  series: MoneyByMonth[],
  monthCount: number,
  endMonthKey?: string | null
): number {
  return sliceMonthsEndingAt(series, monthCount, endMonthKey).reduce((a, m) => a + m.valor, 0);
}

export function percentChangeForDashboard(
  series: MoneyByMonth[],
  monthCount: number,
  endMonthKey?: string | null
): number {
  const endIdx = resolveEndMonthIndex(series, endMonthKey);
  if (endIdx < 0) return 0;
  if (monthCount <= 1) {
    const cur = series[endIdx]?.valor ?? 0;
    const prev = series[endIdx - 1]?.valor ?? 0;
    return percentChange(cur, prev);
  }
  const startCur = Math.max(0, endIdx - (monthCount - 1));
  const curSum = series.slice(startCur, endIdx + 1).reduce((a, m) => a + m.valor, 0);
  const prevEnd = startCur - 1;
  if (prevEnd < 0) return percentChange(curSum, 0);
  const startPrev = Math.max(0, prevEnd - (monthCount - 1));
  const prevSum = series.slice(startPrev, prevEnd + 1).reduce((a, m) => a + m.valor, 0);
  return percentChange(curSum, prevSum);
}

// Funciones para datos diarios
export function getDailyDataFromMovements(
  movements: Movement[],
  type: "Ingreso" | "Gasto" | "Inversión",
  target?: { year: number; month: number }
): MoneyByDay[] {
  const now = new Date();
  const currentYear = target?.year ?? now.getFullYear();
  const currentMonth = target?.month ?? now.getMonth();

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isCurrentCalendarMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth();
  const endDay = isCurrentCalendarMonth ? now.getDate() : lastDayOfMonth;

  const currentMonthMovements = movements.filter((m) => {
    const movementDate = new Date(m.fecha);
    return (
      movementDate.getFullYear() === currentYear &&
      movementDate.getMonth() === currentMonth &&
      m.tipo === type
    );
  });

  const dailyData: MoneyByDay[] = [];

  for (let day = 1; day <= endDay; day++) {
    const dayStr = day.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${dayStr}`;
    
    // Sumar movimientos de ese día
    const dayTotal = currentMonthMovements
      .filter((m) => m.fecha === dateStr)
      .reduce((acc, m) => acc + Math.abs(m.cantidad), 0);
    
    dailyData.push({
      dia: dayStr,
      valor: dayTotal,
    });
  }
  
  return dailyData;
}

export function getDailyIncomeAndExpenses(
  movements: Movement[],
  target?: { year: number; month: number }
): {
  ingresos: MoneyByDay[];
  gastos: MoneyByDay[];
  inversiones: MoneyByDay[];
} {
  return {
    ingresos: getDailyDataFromMovements(movements, "Ingreso", target),
    gastos: getDailyDataFromMovements(movements, "Gasto", target),
    inversiones: getDailyDataFromMovements(movements, "Inversión", target),
  };
}

const MONTH_FULL_LABELS: MonthLabel[] = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Fin de la ventana del chart: último día del mes ancla, o hoy si es el mes calendario actual. */
export function resolveChartEndDate(endMonthKey?: string | null): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  if (!endMonthKey) return now;
  const [y, m] = endMonthKey.split("-").map(Number);
  if (!y || !m) return now;
  const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1;
  if (isCurrent) return now;
  return new Date(y, m, 0, 12, 0, 0, 0); // último día del mes
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function findMonthBoundaryIndex(dateKeys: string[]): number {
  if (dateKeys.length < 2) return -1;
  const firstMonth = dateKeys[0].slice(0, 7);
  for (let i = 1; i < dateKeys.length; i++) {
    if (dateKeys[i].slice(0, 7) !== firstMonth) return i;
  }
  return -1;
}

function findYearBoundaryIndex(monthKeys: string[]): number {
  if (monthKeys.length < 2) return -1;
  const firstYear = monthKeys[0]?.slice(0, 4);
  for (let i = 1; i < monthKeys.length; i++) {
    if (monthKeys[i]?.slice(0, 4) !== firstYear) return i;
  }
  return -1;
}

function getRollingDailySeries(
  movements: Movement[],
  type: "Ingreso" | "Gasto" | "Inversión",
  endDate: Date,
  days: number
): MoneyByDay[] {
  const byDate = new Map<string, number>();
  for (const m of movements) {
    if (m.tipo !== type) continue;
    byDate.set(m.fecha, (byDate.get(m.fecha) ?? 0) + Math.abs(m.cantidad));
  }

  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12);
  const result: MoneyByDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = toDateKey(d);
    result.push({ dia: key, valor: byDate.get(key) ?? 0 });
  }
  return result;
}

/** Últimos N días hasta endDate (inclusive), con índice del primer día de un mes distinto. */
export function getRollingDailyIncomeAndExpenses(
  movements: Movement[],
  endDate: Date,
  days = 31
): {
  ingresos: MoneyByDay[];
  gastos: MoneyByDay[];
  inversiones: MoneyByDay[];
  separatorIndex: number;
} {
  const ingresos = getRollingDailySeries(movements, "Ingreso", endDate, days);
  const gastos = getRollingDailySeries(movements, "Gasto", endDate, days);
  const inversiones = getRollingDailySeries(movements, "Inversión", endDate, days);
  const separatorIndex = findMonthBoundaryIndex(ingresos.map((d) => d.dia));
  return { ingresos, gastos, inversiones, separatorIndex };
}

/**
 * Ventana fija de `count` meses hasta endMonthKey, rellenando con 0 si faltan.
 * separatorIndex = primer mes de un año distinto al del inicio (-1 si no hay cruce).
 */
export function ensureMonthWindow(
  series: MoneyByMonth[],
  count: number,
  endMonthKey?: string | null
): { series: MoneyByMonth[]; separatorIndex: number } {
  const endDate = resolveChartEndDate(endMonthKey);
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth(); // 0-indexed
  const byKey = new Map(series.filter((s) => s.monthKey).map((s) => [s.monthKey!, s]));

  const filled: MoneyByMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endY, endM - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = byKey.get(monthKey);
    filled.push(
      existing ?? {
        mes: MONTH_FULL_LABELS[d.getMonth()],
        valor: 0,
        monthKey,
      }
    );
  }

  const separatorIndex = findYearBoundaryIndex(filled.map((s) => s.monthKey ?? ""));
  return { series: filled, separatorIndex };
}

const MES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Comparativa anual: ingresos y gastos por mes del año actual vs año anterior */
export function comparativaAnual(movimientos: Movement[]): {
  thisYear: Array<{ mes: string; ingresos: number; gastos: number }>;
  lastYear: Array<{ mes: string; ingresos: number; gastos: number }>;
} {
  const now = new Date();
  const thisY = now.getFullYear();
  const lastY = thisY - 1;
  const build = (year: number) => {
    const byMonth = new Map<number, { ingresos: number; gastos: number }>();
    for (let m = 0; m < 12; m++) byMonth.set(m, { ingresos: 0, gastos: 0 });
    for (const m of movimientos) {
      const d = new Date(m.fecha);
      if (d.getFullYear() !== year) continue;
      const month = d.getMonth();
      const cur = byMonth.get(month)!;
      if (m.tipo === "Ingreso") cur.ingresos += m.cantidad;
      else if (m.tipo === "Gasto") cur.gastos += Math.abs(m.cantidad);
      byMonth.set(month, cur);
    }
    return Array.from({ length: 12 }, (_, i) => ({
      mes: MES_LABELS[i],
      ingresos: byMonth.get(i)!.ingresos,
      gastos: byMonth.get(i)!.gastos,
    }));
  };
  return { thisYear: build(thisY), lastYear: build(lastY) };
}

/** Proyección mensual: media de los últimos N meses para los próximos M meses */
export function proyeccionMensual(
  ingresosMensuales: MoneyByMonth[],
  gastosMensuales: MoneyByMonth[],
  numProyectar = 3,
  ventana = 6
): Array<{ mes: string; ingresos: number; gastos: number }> {
  const ing = filterMonthsByPeriod(ingresosMensuales, ventana);
  const gas = filterMonthsByPeriod(gastosMensuales, ventana);
  const avgIng = ing.length ? ing.reduce((a, x) => a + x.valor, 0) / ing.length : 0;
  const avgGas = gas.length ? gas.reduce((a, x) => a + x.valor, 0) / gas.length : 0;
  const result: Array<{ mes: string; ingresos: number; gastos: number }> = [];
  // Día 1 para evitar el desbordamiento de setMonth en días 29–31 (p. ej. 31 jul → dos "Oct")
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1; // primer mes a proyectar (índice Date)
  for (let i = 0; i < numProyectar; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    result.push({
      mes: MES_LABELS[d.getMonth()],
      ingresos: Math.round(avgIng),
      gastos: Math.round(avgGas),
    });
  }
  return result;
}
