import type { DashboardData, Goal, WishlistColumn } from "@/lib/dashboard/types";

export const RESPONSIBLE_SURPLUS_RATIO = 0.3;

export const COLUMN_META: Record<
  WishlistColumn,
  { label: string; hint: string; maxMonths: number | null }
> = {
  undecided: { label: "Objetos", hint: "Aún no lo tienes claro", maxMonths: null },
  short: { label: "Corto plazo", hint: "Hasta 3 meses", maxMonths: 3 },
  medium: { label: "Medio plazo", hint: "De 3 a 12 meses", maxMonths: 12 },
  long: { label: "Largo plazo", hint: "Más de 12 meses", maxMonths: null },
};

export const WISHLIST_COLUMNS: WishlistColumn[] = ["undecided", "short", "medium", "long"];

export type AffordabilitySnapshot = {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  liquidSavings: number;
  emergencyReserved: number;
  discretionarySavings: number;
  responsibleMonthly: number;
};

export type ItemAffordability = {
  canAffordNow: boolean;
  monthsToAfford: number | null;
  suggestedColumn: WishlistColumn;
  fitsColumn: boolean;
  coveragePercent: number;
  verdict: "now" | "fits" | "sooner" | "short" | "blocked";
  verdictLabel: string;
};

function averageLast(values: number[], n = 3) {
  const slice = values.slice(-n);
  if (slice.length === 0) return 0;
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

export function liquidSavingsFromDashboard(data: DashboardData) {
  const savingsNames = new Set(
    data.categories.filter((c) => c.type === "savings").map((c) => c.name.toLowerCase())
  );
  return data.distribucionActivos
    .filter((asset) => {
      const name = asset.name.toLowerCase();
      if (savingsNames.has(name)) return true;
      return name === "ahorro" || name.includes("efectivo") || name.includes("cuenta");
    })
    .reduce((sum, asset) => sum + asset.value, 0);
}

export function emergencyRemainingFromGoals(goals: Goal[]) {
  const emergency = goals.find((goal) => /emergencia/i.test(goal.title));
  if (!emergency) return 0;
  return Math.max(0, emergency.target - emergency.saved);
}

export function snapshotFromDashboard(data: DashboardData): AffordabilitySnapshot {
  const monthlyIncome = averageLast(data.ingresosMensuales.map((row) => row.valor));
  const monthlyExpenses = averageLast(data.gastosMensuales.map((row) => row.valor));
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const liquidSavings = liquidSavingsFromDashboard(data);
  const emergencyRemaining = emergencyRemainingFromGoals(data.goals);
  // Reserve unfinished emergency only when liquid can cover that remainder.
  // If remaining >= liquid (demo: Fondo de emergencia vs Ahorro), locking it
  // would wipe discretionary savings and every gauge would read 0%. The gap
  // is then a surplus-funded goal, not a 100% claim on current cash.
  // When liquid > remaining, still earmark the gap (don't spend the buffer).
  const emergencyReserved = liquidSavings > emergencyRemaining ? emergencyRemaining : 0;
  const discretionarySavings = Math.max(0, liquidSavings - emergencyReserved);
  const responsibleMonthly = Math.max(0, monthlySurplus * RESPONSIBLE_SURPLUS_RATIO);
  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySurplus,
    liquidSavings,
    emergencyReserved,
    discretionarySavings,
    responsibleMonthly,
  };
}

export function suggestColumn(canAffordNow: boolean, monthsToAfford: number | null): WishlistColumn {
  if (canAffordNow || (monthsToAfford !== null && monthsToAfford <= 3)) return "short";
  if (monthsToAfford !== null && monthsToAfford <= 12) return "medium";
  return "long";
}

export function formatMonthsToAfford(months: number | null, canAffordNow: boolean) {
  if (canAffordNow || months === 0) return "ya";
  if (months === null) return "sin margen";
  if (months === 1) return "1 mes";
  if (months < 24) return `${months} meses`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 año" : `${years} años`;
}

export function analyzeItem(
  price: number,
  snapshot: AffordabilitySnapshot,
  column: WishlistColumn
): ItemAffordability {
  const gap = Math.max(0, price - snapshot.discretionarySavings);
  const canAffordNow = price > 0 && snapshot.discretionarySavings >= price;
  let monthsToAfford: number | null = 0;
  if (!canAffordNow) {
    monthsToAfford =
      snapshot.responsibleMonthly > 0 ? Math.ceil(gap / snapshot.responsibleMonthly) : null;
  }

  const suggestedColumn = suggestColumn(canAffordNow, monthsToAfford);
  const coveragePercent =
    price <= 0 ? 0 : Math.min(100, (snapshot.discretionarySavings / price) * 100);
  const fitsColumn =
    column === "undecided" ||
    canAffordNow ||
    (column === "short" && monthsToAfford !== null && monthsToAfford <= 3) ||
    (column === "medium" && monthsToAfford !== null && monthsToAfford <= 12) ||
    (column === "long" && monthsToAfford !== null);

  let verdict: ItemAffordability["verdict"] = "fits";
  if (canAffordNow) verdict = "now";
  else if (monthsToAfford === null) verdict = "blocked";
  else if (column === "undecided") verdict = "fits";
  else if (!fitsColumn) verdict = "short";
  else if (suggestedColumn !== "long" && column === "long" && monthsToAfford <= 12) verdict = "sooner";

  const timeLabel = formatMonthsToAfford(monthsToAfford, canAffordNow);
  const verdictLabel =
    verdict === "now"
      ? "Puedes pagarlo ahora, sin tocar el colchón"
      : verdict === "blocked"
        ? "Hoy no hay margen mensual para esta compra"
        : verdict === "short"
          ? `Este plazo se queda corto · ~${timeLabel}`
          : verdict === "sooner"
            ? `Encaja, aunque podrías plantearlo antes · ~${timeLabel}`
            : column === "undecided"
              ? `Ahorrando con cabeza: ~${timeLabel}`
              : `Encaja en este plazo · ~${timeLabel}`;

  return {
    canAffordNow,
    monthsToAfford,
    suggestedColumn,
    fitsColumn,
    coveragePercent,
    verdict,
    verdictLabel,
  };
}
