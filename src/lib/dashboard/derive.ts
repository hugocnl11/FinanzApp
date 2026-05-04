import type { CategoryAmount, MoneyByMonth, Movement, MonthLabel } from "./types";

const MONTH_LABELS: MonthLabel[] = [
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

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildMonthlySeries(
  movements: Movement[],
  type: Movement["tipo"],
  months = 12,
  /** Fin de la ventana (por defecto hoy); útil para alinear con el mes seleccionado en el dashboard */
  anchorDate: Date = new Date()
): MoneyByMonth[] {
  const now = anchorDate;
  const series: MoneyByMonth[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const current = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = current.getMonth();
    const year = current.getFullYear();
    const label = MONTH_LABELS[month];

    const total = movements
      .filter((movement) => movement.tipo === type)
      .filter((movement) => {
        const date = parseDate(movement.fecha);
        return date && date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((acc, movement) => acc + Math.abs(movement.cantidad), 0);

    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    series.push({ mes: label, valor: total, monthKey });
  }

  return series;
}

export function totalsByCategory(movements: Movement[], type: Movement["tipo"]): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const movement of movements) {
    if (movement.tipo !== type) continue;
    const value = Math.abs(movement.cantidad);
    map.set(movement.categoria, (map.get(movement.categoria) ?? 0) + value);
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function latestByCategory(movements: Movement[], type: Movement["tipo"]): CategoryAmount[] {
  const map = new Map<string, { value: number; date: number }>();
  for (const movement of movements) {
    if (movement.tipo !== type) continue;
    const date = parseDate(movement.fecha)?.getTime() ?? 0;
    const value = Math.abs(movement.cantidad);
    const current = map.get(movement.categoria);
    if (!current || date >= current.date) {
      map.set(movement.categoria, { value, date });
    }
  }

  return Array.from(map.entries())
    .map(([name, entry]) => ({ name, value: entry.value }))
    .sort((a, b) => b.value - a.value);
}
