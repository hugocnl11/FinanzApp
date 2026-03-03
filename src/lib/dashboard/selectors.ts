import type { MoneyByMonth, MoneyByDay } from "./types";
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

// Funciones para datos diarios
export function getDailyDataFromMovements(movements: Movement[], type: "Ingreso" | "Gasto" | "Inversión"): MoneyByDay[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Filtrar movimientos del mes actual
  const currentMonthMovements = movements.filter((m) => {
    const movementDate = new Date(m.fecha);
    return (
      movementDate.getFullYear() === currentYear &&
      movementDate.getMonth() === currentMonth &&
      m.tipo === type
    );
  });
  
  // Obtener días del mes actual hasta hoy
  const daysInMonth = now.getDate();
  const dailyData: MoneyByDay[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
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

export function getDailyIncomeAndExpenses(movements: Movement[]): {
  ingresos: MoneyByDay[];
  gastos: MoneyByDay[];
  inversiones: MoneyByDay[];
} {
  return {
    ingresos: getDailyDataFromMovements(movements, "Ingreso"),
    gastos: getDailyDataFromMovements(movements, "Gasto"),
    inversiones: getDailyDataFromMovements(movements, "Inversión"),
  };
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
  const start = new Date();
  start.setMonth(start.getMonth() + 1);
  for (let i = 0; i < numProyectar; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    result.push({
      mes: MES_LABELS[d.getMonth()],
      ingresos: Math.round(avgIng),
      gastos: Math.round(avgGas),
    });
  }
  return result;
}
