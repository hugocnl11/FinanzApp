import type { Budget, DashboardData, Movement } from "./types";

const DEMO_START = { year: 2025, month: 1 }; // febrero 2025 (0-indexed month)
const DEMO_END = { year: 2030, month: 11 }; // diciembre 2030

type SpecialExpense = { concepto: string; categoria: string; cantidad: number };

type MonthProfile = {
  baseIncome: number;
  extraIncome: number;
  baseExpenses: number;
  extraExpenses: number;
  specialExpenses: SpecialExpense[];
  extraIncomeLabel?: string;
  invest?: boolean;
  freelance?: boolean;
  save?: boolean;
};

/** PRNG determinista por semilla (Mulberry32) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function iterMonths(
  from: { year: number; month: number },
  to: { year: number; month: number }
) {
  const out: { year: number; month: number }[] = [];
  let y = from.year;
  let m = from.month;
  while (y < to.year || (y === to.year && m <= to.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

/** Perfil cíclico anual + subida salarial suave */
function profileFor(year: number, monthIndex: number): MonthProfile {
  const salaryBump = (year - 2025) * 50;
  const baseIncome = 2400 + salaryBump;
  const baseExpenses = 1800;

  // Mes calendario (0=ene … 11=dic)
  switch (monthIndex) {
    case 2: // marzo — vacaciones
      return {
        baseIncome,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 800,
        specialExpenses: [{ concepto: "Vacaciones", categoria: "Otros", cantidad: -800 }],
        invest: true,
        save: false,
      };
    case 3: // abril — nómina baja
      return {
        baseIncome: baseIncome - 300,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 0,
        specialExpenses: [],
        freelance: true,
        save: false,
      };
    case 4: // mayo — bonus
      return {
        baseIncome,
        extraIncome: 600,
        extraIncomeLabel: "Bonus",
        baseExpenses,
        extraExpenses: 0,
        specialExpenses: [],
        invest: true,
        save: true,
      };
    case 5: // junio — reparación
      return {
        baseIncome,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 450,
        specialExpenses: [
          { concepto: "Reparación coche", categoria: "Transporte", cantidad: -450 },
        ],
        freelance: true,
        save: false,
      };
    case 7: // agosto — verano
      return {
        baseIncome: baseIncome - 300,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 600,
        specialExpenses: [
          { concepto: "Vacaciones verano", categoria: "Otros", cantidad: -600 },
        ],
        save: false,
      };
    case 8: // septiembre — freelance
      return {
        baseIncome,
        extraIncome: 400,
        extraIncomeLabel: "Freelance",
        baseExpenses,
        extraExpenses: 0,
        specialExpenses: [],
        invest: true,
        save: true,
      };
    case 9: // octubre — tech
      return {
        baseIncome,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 700,
        specialExpenses: [
          { concepto: "Laptop / gadgets", categoria: "Tecnología", cantidad: -700 },
        ],
        invest: true,
        save: false,
      };
    case 11: // diciembre — navidad
      return {
        baseIncome,
        extraIncome: 800,
        extraIncomeLabel: "Aguinaldo",
        baseExpenses,
        extraExpenses: 1200,
        specialExpenses: [
          { concepto: "Regalos Navidad", categoria: "Regalos", cantidad: -600 },
          { concepto: "Cena Navidad", categoria: "Restaurantes", cantidad: -200 },
          { concepto: "Ropa invierno", categoria: "Ropa", cantidad: -400 },
        ],
        save: false,
      };
    default:
      return {
        baseIncome,
        extraIncome: 0,
        baseExpenses,
        extraExpenses: 0,
        specialExpenses: [],
        invest: monthIndex % 3 === 0,
        save: true,
      };
  }
}

function generateAllMovements(): Movement[] {
  const movements: Movement[] = [];
  let movId = 1;

  for (const { year, month } of iterMonths(DEMO_START, DEMO_END)) {
    const rand = mulberry32(year * 100 + month * 7 + 42);
    const config = profileFor(year, month);
    const ym = `${year}-${pad2(month + 1)}`;

    movements.push({
      id: `mov-${movId++}`,
      fecha: `${ym}-01`,
      concepto: "Nómina",
      categoria: "Nomina",
      tipo: "Ingreso",
      cantidad: config.baseIncome,
    });

    if (config.extraIncome > 0) {
      const day = 5 + Math.floor(rand() * 5);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(day)}`,
        concepto: config.extraIncomeLabel ?? "Ingreso extra",
        categoria: "Transferencia",
        tipo: "Ingreso",
        cantidad: config.extraIncome,
      });
    }

    movements.push({
      id: `mov-${movId++}`,
      fecha: `${ym}-05`,
      concepto: "Alquiler",
      categoria: "Alquiler",
      tipo: "Gasto",
      cantidad: -850,
    });

    const baseVariableExpenses = [
      { concepto: "Supermercado", categoria: "Comida", cantidad: -85 - Math.floor(rand() * 40) },
      { concepto: "Supermercado", categoria: "Comida", cantidad: -90 - Math.floor(rand() * 30) },
      { concepto: "Gasolina", categoria: "Transporte", cantidad: -45 - Math.floor(rand() * 20) },
      { concepto: "Restaurante", categoria: "Restaurantes", cantidad: -60 - Math.floor(rand() * 40) },
      { concepto: "Netflix", categoria: "Suscripciones", cantidad: -15 },
      { concepto: "Spotify", categoria: "Suscripciones", cantidad: -10 },
      { concepto: "Gimnasio", categoria: "Salud", cantidad: -40 },
      { concepto: "Farmacia", categoria: "Salud", cantidad: -25 - Math.floor(rand() * 30) },
      { concepto: "Uber", categoria: "Transporte", cantidad: -12 - Math.floor(rand() * 15) },
      { concepto: "Cafetería", categoria: "Restaurantes", cantidad: -8 - Math.floor(rand() * 10) },
      { concepto: "Cine", categoria: "Otros", cantidad: -18 - Math.floor(rand() * 15) },
      { concepto: "Supermercado", categoria: "Comida", cantidad: -70 - Math.floor(rand() * 35) },
    ];

    const numVariable = Math.min(
      baseVariableExpenses.length,
      Math.max(8, Math.floor(config.baseExpenses / 150))
    );

    baseVariableExpenses.slice(0, numVariable).forEach((expense, idx) => {
      const day = Math.min(28, 6 + idx * 2 + Math.floor(rand() * 2));
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(day)}`,
        concepto: expense.concepto,
        categoria: expense.categoria,
        tipo: "Gasto",
        cantidad: expense.cantidad,
      });
    });

    config.specialExpenses.forEach((expense) => {
      const day = 10 + Math.floor(rand() * 15);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(Math.min(day, 28))}`,
        concepto: expense.concepto,
        categoria: expense.categoria,
        tipo: "Gasto",
        cantidad: expense.cantidad,
      });
    });

    if (config.extraExpenses > 0) {
      const chunk = Math.floor(config.extraExpenses / 3);
      for (let i = 0; i < 3; i++) {
        const day = Math.min(28, 12 + i * 5 + Math.floor(rand() * 3));
        movements.push({
          id: `mov-${movId++}`,
          fecha: `${ym}-${pad2(day)}`,
          concepto: i === 0 ? "Restaurante" : i === 1 ? "Compras" : "Otros gastos",
          categoria: i === 0 ? "Restaurantes" : "Otros",
          tipo: "Gasto",
          cantidad: -chunk - Math.floor(rand() * 50),
        });
      }
    }

    if (config.freelance) {
      const day = 15 + Math.floor(rand() * 10);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(Math.min(day, 28))}`,
        concepto: "Freelance",
        categoria: "Transferencia",
        tipo: "Ingreso",
        cantidad: 300 + Math.floor(rand() * 200),
      });
    }

    if (config.invest) {
      const day = 20 + Math.floor(rand() * 5);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(Math.min(day, 28))}`,
        concepto: "Inversión ETF",
        categoria: "Acciones",
        tipo: "Inversión",
        cantidad: -(250 + Math.floor(rand() * 150)),
      });
    }

    // Crypto ocasional (cada 4 meses)
    if (month % 4 === 1) {
      const day = 18 + Math.floor(rand() * 6);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(Math.min(day, 28))}`,
        concepto: "Compra crypto",
        categoria: "Crypto",
        tipo: "Inversión",
        cantidad: -(80 + Math.floor(rand() * 120)),
      });
    }

    if (config.save) {
      const day = 25 + Math.floor(rand() * 3);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${ym}-${pad2(Math.min(day, 28))}`,
        concepto: "Ahorro mensual",
        categoria: "Ahorro",
        tipo: "Ahorro",
        cantidad: -(200 + Math.floor(rand() * 100)),
      });
    }
  }

  return movements.map((movement) => ({
    ...movement,
    metodoPago: demoPaymentMethod(movement.tipo, movement.categoria),
  }));
}

function demoPaymentMethod(tipo: Movement["tipo"], categoria: string): string {
  if (tipo === "Ingreso") return categoria === "Nomina" ? "Cajamar" : "Revolut";
  if (tipo === "Inversión") return "Trade Republic";
  if (tipo === "Ahorro") return "Cajamar";
  if (categoria === "Alquiler") return "Cajamar";
  if (categoria === "Transporte") return "Efectivo";
  return "Revolut";
}

/** Cache de todos los movimientos 2025-02 → 2030-12 (determinista) */
const ALL_DEMO_MOVEMENTS = generateAllMovements();

/** Movimientos visibles hasta hoy (los días futuros van apareciendo al pasar el tiempo) */
export function getDemoMovements(now = new Date()): Movement[] {
  const cutoff = todayISO(now);
  return ALL_DEMO_MOVEMENTS.filter((m) => m.fecha <= cutoff);
}

/** Evolución de activos por mes (clave YYYY-MM) hasta 2030 */
function buildAssetTimeline(): Record<string, Record<string, number>> {
  const timeline: Record<string, Record<string, number>> = {
    "cat-15": {}, // Ahorro
    "cat-16": {}, // Acciones
    "cat-17": {}, // Crypto
  };

  let ahorro = 2100;
  let acciones = 1520;
  let crypto = 380;

  for (const { year, month } of iterMonths(DEMO_START, DEMO_END)) {
    const rand = mulberry32(year * 17 + month * 31 + 99);
    const key = monthKey(year, month);
    const profile = profileFor(year, month);

    // Ahorro: crece si hay ahorro ese mes
    if (profile.save) {
      ahorro += 80 + Math.floor(rand() * 40);
    } else if (profile.extraExpenses > 400) {
      ahorro = Math.max(1500, ahorro - Math.floor(40 + rand() * 60));
    } else {
      ahorro += Math.floor(10 + rand() * 20);
    }

    // Acciones: tendencia alcista suave + ruido
    const investBump = profile.invest ? 40 + Math.floor(rand() * 80) : 0;
    acciones += investBump + Math.floor((rand() - 0.42) * 90);
    acciones = Math.max(800, acciones);

    // Crypto: más volátil, tendencia ligeramente bajista/recuperación cíclica
    const cryptoDelta = Math.floor((rand() - 0.48) * 70);
    crypto = Math.max(80, crypto + cryptoDelta + (month % 4 === 1 ? 30 : 0));

    timeline["cat-15"][key] = Math.round(ahorro);
    timeline["cat-16"][key] = Math.round(acciones);
    timeline["cat-17"][key] = Math.round(crypto);
  }

  return timeline;
}

const DEMO_ASSET_TIMELINE = buildAssetTimeline();

/** Últimos `months` valores de evolución (del más antiguo al más reciente), anclados en hoy */
export function getDemoAssetEvolutionSeries(
  months = 12,
  now = new Date()
): Record<string, number[]> {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d.getFullYear(), d.getMonth()));
  }

  const result: Record<string, number[]> = {};
  for (const catId of Object.keys(DEMO_ASSET_TIMELINE)) {
    result[catId] = keys.map((k) => DEMO_ASSET_TIMELINE[catId][k] ?? 0);
  }
  return result;
}

/** Distribución de activos al mes actual */
export function getDemoDistribucionActivos(now = new Date()) {
  const key = monthKey(now.getFullYear(), now.getMonth());
  const fallbackKey = Object.keys(DEMO_ASSET_TIMELINE["cat-15"]).find((k) => k <= key) ?? key;
  const pick = (cat: string) =>
    DEMO_ASSET_TIMELINE[cat][key] ??
    DEMO_ASSET_TIMELINE[cat][fallbackKey] ??
    0;

  return [
    { name: "Ahorro", value: pick("cat-15") },
    { name: "Acciones", value: pick("cat-16") },
    { name: "Crypto", value: pick("cat-17") },
  ];
}

export function getDemoCategoryInvested(now = new Date()): Record<string, number> {
  const dist = getDemoDistribucionActivos(now);
  const acciones = dist.find((d) => d.name === "Acciones")?.value ?? 1500;
  const crypto = dist.find((d) => d.name === "Crypto")?.value ?? 400;
  // Invertido un poco por debajo/encima del valor de mercado para ejemplos de rentabilidad
  return {
    "cat-16": Math.round(acciones * 0.88),
    "cat-17": Math.round(crypto * 2.2),
  };
}

const BUDGET_LIMITS: { id: string; category: string; limit: number; period: "fixed" | "variable" }[] =
  [
    { id: "bud-fixed-1", category: "Alquiler", limit: 850, period: "fixed" },
    { id: "bud-fixed-2", category: "Suscripciones", limit: 30, period: "fixed" },
    { id: "bud-fixed-3", category: "Salud", limit: 80, period: "fixed" },
    { id: "bud-var-1", category: "Comida", limit: 400, period: "variable" },
    { id: "bud-var-2", category: "Transporte", limit: 150, period: "variable" },
    { id: "bud-var-3", category: "Restaurantes", limit: 200, period: "variable" },
    { id: "bud-var-4", category: "Otros", limit: 100, period: "variable" },
    { id: "bud-var-5", category: "Tecnología", limit: 120, period: "variable" },
    { id: "bud-var-6", category: "Ropa", limit: 80, period: "variable" },
  ];

/** Presupuestos con `spent` del mes en curso (según movimientos visibles) */
export function getDemoBudgets(now = new Date()): Budget[] {
  const ym = monthKey(now.getFullYear(), now.getMonth());
  const monthMovs = getDemoMovements(now).filter((m) => m.fecha.startsWith(ym) && m.tipo === "Gasto");

  return BUDGET_LIMITS.map((b) => {
    const spent = monthMovs
      .filter((m) => m.categoria === b.category)
      .reduce((acc, m) => acc + Math.abs(m.cantidad), 0);
    return { ...b, spent: Math.round(spent) };
  });
}

function daysAgoISO(days: number, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return todayISO(d);
}

/** Progreso de objetivos en función del tiempo (2025→2030) */
function goalProgress(now = new Date()) {
  const start = new Date(2025, 1, 1).getTime();
  const end = new Date(2030, 11, 31).getTime();
  const t = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  return t;
}

export function getDemoGoals(now = new Date()) {
  const t = goalProgress(now);
  return [
    {
      id: "goal-1",
      title: "Fondo de emergencia",
      target: 8000,
      saved: Math.round(1200 + t * 6200),
      type: "ahorro" as const,
      dueDate: "2028-06-30",
      description: "Para sobrevivir varios meses sin ingresos",
      isPrimary: true,
      color: "#22c55e",
      milestones: [{ amount: 2000 }, { amount: 4000 }, { amount: 6000 }],
    },
    {
      id: "goal-2",
      title: "Viaje largo",
      target: 3500,
      saved: Math.round(400 + t * 2800),
      type: "ahorro" as const,
      dueDate: "2029-08-01",
      description: "Ahorro para un viaje especial",
      isPrimary: false,
      color: "#0ea5e9",
      milestones: [{ amount: 1000 }, { amount: 2000 }],
    },
    {
      id: "goal-3",
      title: "Equipo de trabajo",
      target: 2200,
      saved: Math.round(200 + t * 1600),
      type: "ahorro" as const,
      dueDate: "2027-11-15",
      description: "Renovar portátil y periféricos",
      isPrimary: false,
      color: "#f59e0b",
      milestones: [{ amount: 800 }, { amount: 1500 }],
    },
  ];
}

function getDemoNotifications(now = new Date()) {
  return [
    {
      id: "not-1",
      type: "warning" as const,
      message: "El presupuesto de Comida está cerca del límite este mes.",
      read: false,
      date: daysAgoISO(3, now),
    },
    {
      id: "not-2",
      type: "success" as const,
      message: "Buen ritmo de ahorro en tu objetivo principal.",
      read: true,
      date: daysAgoISO(8, now),
    },
  ];
}

// TODO: Recurring movements — planned feature, not yet implemented

/**
 * Mock del dashboard. `movimientos` y series relacionadas se calculan al acceder
 * para respetar la fecha de hoy (datos futuros van apareciendo con el tiempo).
 */
export const DASHBOARD_MOCK: DashboardData = {
  get ingresosMensuales() {
    return [];
  },
  get gastosMensuales() {
    return [];
  },
  get activosPorMes() {
    return [];
  },
  get goal() {
    return getDemoGoals()[0] ?? null;
  },
  get gastosPorCategoria() {
    return [];
  },
  get ingresosPorCategoria() {
    return [];
  },
  get distribucionActivos() {
    return getDemoDistribucionActivos();
  },
  get movimientos() {
    return getDemoMovements();
  },
  get budgets() {
    return getDemoBudgets();
  },
  categories: [],
  get goals() {
    return getDemoGoals();
  },
  get notifications() {
    return getDemoNotifications();
  },
};

// Categorías base que se crean al registrarse
export const DEMO_CATEGORIES = [
  { id: "cat-1", name: "Alquiler", type: "expense", icon: "Home", color: "#6366f1", active: true },
  { id: "cat-2", name: "Comida", type: "expense", icon: "Utensils", color: "#22c55e", active: true },
  { id: "cat-3", name: "Salud", type: "expense", icon: "HeartPulse", color: "#e11d48", active: true },
  { id: "cat-4", name: "Transporte", type: "expense", icon: "Car", color: "#0ea5e9", active: true },
  { id: "cat-5", name: "Suscripciones", type: "expense", icon: "CreditCard", color: "#f59e0b", active: true },
  { id: "cat-6", name: "Restaurantes", type: "expense", icon: "Utensils", color: "#f97316", active: true },
  { id: "cat-7", name: "Ropa", type: "expense", icon: "ShoppingCart", color: "#f59e0b", active: true },
  { id: "cat-8", name: "Tecnología", type: "expense", icon: "Smartphone", color: "#6366f1", active: true },
  { id: "cat-9", name: "Regalos", type: "expense", icon: "Gift", color: "#f97316", active: true },
  { id: "cat-10", name: "Otros", type: "expense", icon: "Wallet", color: "#64748b", active: true },
  { id: "cat-11", name: "Nomina", type: "income", icon: "Briefcase", color: "#16a34a", active: true },
  { id: "cat-12", name: "Transferencia", type: "income", icon: "Wallet", color: "#38bdf8", active: true },
  { id: "cat-13", name: "Venta de Crypto", type: "income", icon: "Droplet", color: "#f59e0b", active: true },
  { id: "cat-14", name: "Venta de acciones", type: "income", icon: "LineChart", color: "#6366f1", active: true },
  { id: "cat-15", name: "Ahorro", type: "investment", icon: "PiggyBank", color: "#8b5cf6", active: true },
  { id: "cat-16", name: "Acciones", type: "investment", icon: "LineChart", color: "#22c55e", active: true },
  { id: "cat-17", name: "Crypto", type: "investment", icon: "Droplet", color: "#f59e0b", active: true },
];

/** @deprecated Prefer getDemoCategoryInvested() — se mantiene por imports existentes */
export const DEMO_CATEGORY_INVESTED: Record<string, number> = getDemoCategoryInvested();

/** @deprecated Prefer getDemoDistribucionActivos() */
export const DEMO_DISTRIBUCION_ACTIVOS = getDemoDistribucionActivos();

/**
 * Serie de 12 meses anclada en “hoy” al cargar el módulo.
 * Preferir getDemoAssetEvolutionSeries() en runtime.
 */
export const DEMO_ASSET_EVOLUTION: Record<string, number[]> = getDemoAssetEvolutionSeries(12);
