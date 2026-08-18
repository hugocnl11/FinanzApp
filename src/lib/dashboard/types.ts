export type MonthLabel =
  | "Enero"
  | "Febrero"
  | "Marzo"
  | "Abril"
  | "Mayo"
  | "Junio"
  | "Julio"
  | "Agosto"
  | "Septiembre"
  | "Octubre"
  | "Noviembre"
  | "Diciembre";

export type MoneyByMonth = {
  mes: MonthLabel;
  valor: number;
  /** YYYY-MM, alineado con buildMonthlySeries (últimos N meses) */
  monthKey?: string;
};

export type MoneyByDay = {
  dia: string; // formato "DD" o "YYYY-MM-DD"
  valor: number;
};

export type CategoryAmount = {
  name: string;
  value: number;
};

export type GoalMilestone = { date?: string; amount: number };

export type Goal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  type: "ahorro" | "reducir-gasto" | "aumentar-ingreso";
  dueDate?: string;
  description?: string;
  milestones?: GoalMilestone[];
  linkedCategoryIds?: string[];
  linkedBudgetId?: string;
  isPrimary?: boolean;
  color?: string; // hex, ej. #6366f1
};

export type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: string;
};

export type Notification = {
  id: string;
  type: "success" | "warning" | "info";
  message: string;
  read: boolean;
  date: string;
};

// TODO: Recurring movements — planned feature, not yet implemented

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "investment" | "savings";
  icon: string;
  color: string;
  active: boolean;
  investedAmount?: number | null;
  taePercent?: number | null;
};

export type MovementType = "Ingreso" | "Gasto" | "Inversión" | "Ahorro";

export type Movement = {
  id?: string; // ID único para identificar movimientos
  fecha: string; // ISO yyyy-mm-dd
  concepto: string;
  categoria: string;
  tipo: MovementType;
  cantidad: number; // ingreso +, gasto -, inversión puede ser + o -
  metodoPago?: string; // Revolut, Cajamar, Trade Republic, Efectivo (desde Notion)
};

export type WishlistColumn = "undecided" | "short" | "medium" | "long";

export type WishlistItem = {
  id: string;
  title: string;
  price: number;
  notes?: string;
  column: WishlistColumn;
  sortOrder: number;
};

export type DashboardData = {
  ingresosMensuales: MoneyByMonth[];
  gastosMensuales: MoneyByMonth[];
  activosPorMes: MoneyByMonth[];
  goal: Goal | null;
  goals: Goal[];
  budgets: Budget[];
  categories: Category[];
  notifications: Notification[];
  // TODO: Recurring movements — planned feature, not yet implemented
  gastosPorCategoria: CategoryAmount[];
  ingresosPorCategoria: CategoryAmount[];
  distribucionActivos: CategoryAmount[];
  movimientos: Movement[];
};

