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
};

export type MoneyByDay = {
  dia: string; // formato "DD" o "YYYY-MM-DD"
  valor: number;
};

export type CategoryAmount = {
  name: string;
  value: number;
};

export type Goal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  type: "ahorro" | "reducir-gasto" | "aumentar-ingreso";
  dueDate?: string;
  description?: string;
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

export type RecurringMovement = Movement & {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
};

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense" | "investment" | "savings";
  icon: string;
  color: string;
  active: boolean;
};

export type MovementType = "Ingreso" | "Gasto" | "Inversión" | "Ahorro";

export type Movement = {
  id?: string; // ID único para identificar movimientos
  fecha: string; // ISO yyyy-mm-dd
  concepto: string;
  categoria: string;
  tipo: MovementType;
  cantidad: number; // ingreso +, gasto -, inversión puede ser + o -
};

export type DashboardData = {
  ingresosMensuales: MoneyByMonth[];
  gastosMensuales: MoneyByMonth[];
  goal: Goal | null;
  goals: Goal[];
  budgets: Budget[];
  notifications: Notification[];
  recurringMovements: RecurringMovement[];
  gastosPorCategoria: CategoryAmount[];
  ingresosPorCategoria: CategoryAmount[];
  distribucionActivos: CategoryAmount[];
  movimientos: Movement[];
};

