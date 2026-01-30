import type { MoneyByMonth, MoneyByDay } from "./types";
import type { Budget, CategoryAmount, Goal, Movement } from "./types";

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

export function presupuestoUsadoPorCategoria(movimientos: Movement[], budgets: Budget[]) {
  return budgets.map((budget) => {
    const spent = movimientos
      .filter((movement) => movement.tipo === "Gasto" && movement.categoria === budget.category)
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
