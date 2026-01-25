import type { DashboardData } from "./types";

// Generar movimientos de los últimos 12 meses (Febrero 2025 - Enero 2026)
const generateMovements = () => {
  const movements = [];
  const now = new Date(2026, 0, 25); // 25 de enero 2026
  const months = [
    { name: "Febrero", year: 2025, month: 1 },
    { name: "Marzo", year: 2025, month: 2 },
    { name: "Abril", year: 2025, month: 3 },
    { name: "Mayo", year: 2025, month: 4 },
    { name: "Junio", year: 2025, month: 5 },
    { name: "Julio", year: 2025, month: 6 },
    { name: "Agosto", year: 2025, month: 7 },
    { name: "Septiembre", year: 2025, month: 8 },
    { name: "Octubre", year: 2025, month: 9 },
    { name: "Noviembre", year: 2025, month: 10 },
    { name: "Diciembre", year: 2025, month: 11 },
    { name: "Enero", year: 2026, month: 0 },
  ];

  let movId = 1;

  // Configuración por mes para crear variabilidad y déficits
  const monthConfig = [
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Febrero - Normal
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 800, specialExpenses: [{ concepto: "Vacaciones", categoria: "Otros", cantidad: -800 }] }, // Marzo - Déficit por vacaciones
    { baseIncome: 2100, extraIncome: 0, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Abril - Ingreso bajo, déficit
    { baseIncome: 2400, extraIncome: 600, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Mayo - Bonus, superávit
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 450, specialExpenses: [{ concepto: "Reparación coche", categoria: "Transporte", cantidad: -450 }] }, // Junio - Déficit por reparación
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Julio - Normal
    { baseIncome: 2100, extraIncome: 0, baseExpenses: 1800, extraExpenses: 600, specialExpenses: [{ concepto: "Vacaciones verano", categoria: "Otros", cantidad: -600 }] }, // Agosto - Déficit por vacaciones
    { baseIncome: 2400, extraIncome: 400, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Septiembre - Ingreso extra, superávit
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 700, specialExpenses: [{ concepto: "Laptop nueva", categoria: "Tecnología", cantidad: -700 }] }, // Octubre - Déficit por compra grande
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Noviembre - Normal
    { baseIncome: 2400, extraIncome: 800, baseExpenses: 1800, extraExpenses: 1200, specialExpenses: [{ concepto: "Regalos Navidad", categoria: "Regalos", cantidad: -600 }, { concepto: "Cena Navidad", categoria: "Restaurantes", cantidad: -200 }, { concepto: "Ropa invierno", categoria: "Ropa", cantidad: -400 }] }, // Diciembre - Déficit a pesar de aguinaldo
    { baseIncome: 2400, extraIncome: 0, baseExpenses: 1800, extraExpenses: 0, specialExpenses: [] }, // Enero - Normal
  ];

  months.forEach((m, monthIndex) => {
    const config = monthConfig[monthIndex];
    
    // Nómina base (día 1 de cada mes)
    movements.push({
      id: `mov-${movId++}`,
      fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-01`,
      concepto: "Nómina",
      categoria: "Nomina",
      tipo: "Ingreso",
      cantidad: config.baseIncome,
    });

    // Ingresos extra ocasionales
    if (config.extraIncome > 0) {
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(5 + Math.floor(Math.random() * 5)).padStart(2, "0")}`,
        concepto: monthIndex === 4 ? "Bonus" : monthIndex === 7 ? "Freelance" : "Aguinaldo",
        categoria: "Transferencia",
        tipo: "Ingreso",
        cantidad: config.extraIncome,
      });
    }

    // Alquiler (día 5, fijo)
    movements.push({
      id: `mov-${movId++}`,
      fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-05`,
      concepto: "Alquiler",
      categoria: "Alquiler",
      tipo: "Gasto",
      cantidad: -850,
    });

    // Gastos variables base distribuidos durante el mes
    const baseVariableExpenses = [
      { concepto: "Supermercado", categoria: "Comida", cantidad: -85 - Math.floor(Math.random() * 40) },
      { concepto: "Supermercado", categoria: "Comida", cantidad: -90 - Math.floor(Math.random() * 30) },
      { concepto: "Gasolina", categoria: "Transporte", cantidad: -45 - Math.floor(Math.random() * 20) },
      { concepto: "Restaurante", categoria: "Restaurantes", cantidad: -60 - Math.floor(Math.random() * 40) },
      { concepto: "Netflix", categoria: "Suscripciones", cantidad: -15 },
      { concepto: "Spotify", categoria: "Suscripciones", cantidad: -10 },
      { concepto: "Gimnasio", categoria: "Salud", cantidad: -40 },
      { concepto: "Farmacia", categoria: "Salud", cantidad: -25 - Math.floor(Math.random() * 30) },
      { concepto: "Uber", categoria: "Transporte", cantidad: -12 - Math.floor(Math.random() * 15) },
      { concepto: "Cafetería", categoria: "Restaurantes", cantidad: -8 - Math.floor(Math.random() * 10) },
      { concepto: "Cine", categoria: "Otros", cantidad: -18 - Math.floor(Math.random() * 15) },
    ];

    // Ajustar cantidad de gastos variables según el mes
    const numVariableExpenses = Math.floor(config.baseExpenses / 150); // Aproximadamente
    const selectedExpenses = baseVariableExpenses.slice(0, Math.min(numVariableExpenses, baseVariableExpenses.length));

    selectedExpenses.forEach((expense, idx) => {
      const day = 5 + idx * 2 + Math.floor(Math.random() * 2);
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`,
        concepto: expense.concepto,
        categoria: expense.categoria,
        tipo: "Gasto",
        cantidad: expense.cantidad,
      });
    });

    // Gastos especiales del mes (vacaciones, reparaciones, etc.)
    config.specialExpenses.forEach((expense) => {
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(10 + Math.floor(Math.random() * 15)).padStart(2, "0")}`,
        concepto: expense.concepto,
        categoria: expense.categoria,
        tipo: "Gasto",
        cantidad: expense.cantidad,
      });
    });

    // Gastos extra distribuidos
    if (config.extraExpenses > 0) {
      const extraExpenseAmount = Math.floor(config.extraExpenses / 3);
      for (let i = 0; i < 3; i++) {
        movements.push({
          id: `mov-${movId++}`,
          fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(12 + i * 5 + Math.floor(Math.random() * 3)).padStart(2, "0")}`,
          concepto: i === 0 ? "Restaurante" : i === 1 ? "Compras" : "Otros gastos",
          categoria: i === 0 ? "Restaurantes" : i === 1 ? "Otros" : "Otros",
          tipo: "Gasto",
          cantidad: -extraExpenseAmount - Math.floor(Math.random() * 50),
        });
      }
    }

    // Ingresos adicionales ocasionales (solo algunos meses)
    if (monthIndex === 2 || monthIndex === 5) {
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(15 + Math.floor(Math.random() * 10)).padStart(2, "0")}`,
        concepto: "Freelance",
        categoria: "Transferencia",
        tipo: "Ingreso",
        cantidad: 300 + Math.floor(Math.random() * 200),
      });
    }

    // Inversiones ocasionales (solo algunos meses)
    if (monthIndex === 1 || monthIndex === 4 || monthIndex === 8) {
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(20 + Math.floor(Math.random() * 5)).padStart(2, "0")}`,
        concepto: "Inversión ETF",
        categoria: "Acciones",
        tipo: "Inversión",
        cantidad: -250 - Math.floor(Math.random() * 150),
      });
    }

    // Ahorro mensual (solo si hay superávit)
    const totalIncome = config.baseIncome + config.extraIncome;
    const totalExpenses = config.baseExpenses + config.extraExpenses;
    if (totalIncome > totalExpenses && monthIndex !== 2 && monthIndex !== 3 && monthIndex !== 5 && monthIndex !== 7 && monthIndex !== 9 && monthIndex !== 10) {
      movements.push({
        id: `mov-${movId++}`,
        fecha: `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(25 + Math.floor(Math.random() * 3)).padStart(2, "0")}`,
        concepto: "Ahorro mensual",
        categoria: "Ahorro",
        tipo: "Ahorro",
        cantidad: -200 - Math.floor(Math.random() * 100),
      });
    }
  });

  return movements;
};

export const DASHBOARD_MOCK: DashboardData = {
  ingresosMensuales: [
    { mes: "Febrero", valor: 2400 },
    { mes: "Marzo", valor: 2450 },
    { mes: "Abril", valor: 2400 },
    { mes: "Mayo", valor: 2700 },
    { mes: "Junio", valor: 2400 },
    { mes: "Julio", valor: 2450 },
    { mes: "Agosto", valor: 2400 },
    { mes: "Septiembre", valor: 2500 },
    { mes: "Octubre", valor: 2400 },
    { mes: "Noviembre", valor: 2600 },
    { mes: "Diciembre", valor: 2400 },
    { mes: "Enero", valor: 2450 },
  ],
  gastosMensuales: [
    { mes: "Febrero", valor: 1850 },
    { mes: "Marzo", valor: 1920 },
    { mes: "Abril", valor: 1780 },
    { mes: "Mayo", valor: 1950 },
    { mes: "Junio", valor: 1880 },
    { mes: "Julio", valor: 1820 },
    { mes: "Agosto", valor: 1900 },
    { mes: "Septiembre", valor: 1870 },
    { mes: "Octubre", valor: 1930 },
    { mes: "Noviembre", valor: 1850 },
    { mes: "Diciembre", valor: 2100 },
    { mes: "Enero", valor: 1890 },
  ],
  goal: {
    id: "emergency-fund",
    title: "Fondo de emergencia",
    target: 5100,
    saved: 4277,
    type: "ahorro",
    dueDate: "2026-06-30",
    description: "Para sobrevivir 8 meses sin ingresos",
  },
  gastosPorCategoria: [
    { name: "Alquiler", value: 10200 },
    { name: "Comida", value: 2400 },
    { name: "Transporte", value: 1200 },
    { name: "Restaurantes", value: 1800 },
    { name: "Salud", value: 900 },
    { name: "Suscripciones", value: 300 },
    { name: "Otros", value: 600 },
  ],
  ingresosPorCategoria: [
    { name: "Nomina", value: 28800 },
    { name: "Transferencia", value: 2400 },
  ],
  distribucionActivos: [
    { name: "Acciones", value: 1200 },
    { name: "Ahorro", value: 2400 },
  ],
  movimientos: generateMovements(),
  budgets: [
    // Presupuestos fijos (period: "fixed")
    { id: "bud-fixed-1", category: "Alquiler", limit: 850, spent: 850, period: "fixed" },
    { id: "bud-fixed-2", category: "Suscripciones", limit: 30, spent: 25, period: "fixed" },
    { id: "bud-fixed-3", category: "Salud", limit: 80, spent: 75, period: "fixed" },
    // Presupuestos variables (period: "variable")
    { id: "bud-var-1", category: "Comida", limit: 400, spent: 380, period: "variable" },
    { id: "bud-var-2", category: "Transporte", limit: 150, spent: 140, period: "variable" },
    { id: "bud-var-3", category: "Restaurantes", limit: 200, spent: 180, period: "variable" },
    { id: "bud-var-4", category: "Otros", limit: 100, spent: 85, period: "variable" },
  ],
  goals: [
    {
      id: "goal-1",
      title: "Fondo de emergencia",
      target: 5100,
      saved: 4277,
      type: "ahorro",
      dueDate: "2026-06-30",
      description: "Para sobrevivir 8 meses sin ingresos",
    },
    {
      id: "goal-2",
      title: "Viaje verano",
      target: 2500,
      saved: 1250,
      type: "ahorro",
      dueDate: "2026-08-01",
      description: "Ahorro para vacaciones de verano",
    },
    {
      id: "goal-3",
      title: "Laptop nueva",
      target: 1800,
      saved: 720,
      type: "ahorro",
      dueDate: "2026-05-15",
      description: "Renovar equipo de trabajo",
    },
  ],
  notifications: [
    {
      id: "not-1",
      type: "warning",
      message: "El presupuesto de Comida está al 95%.",
      read: false,
      date: "2026-01-20",
    },
    {
      id: "not-2",
      type: "success",
      message: "Has alcanzado el 50% del objetivo Viaje verano.",
      read: true,
      date: "2026-01-15",
    },
  ],
  recurringMovements: [
    {
      id: "rec-1",
      fecha: "2026-01-01",
      concepto: "Nómina",
      categoria: "Nomina",
      tipo: "Ingreso",
      cantidad: 2400,
      frequency: "monthly",
      nextDate: "2026-02-01",
    },
    {
      id: "rec-2",
      fecha: "2026-01-05",
      concepto: "Alquiler",
      categoria: "Alquiler",
      tipo: "Gasto",
      cantidad: -850,
      frequency: "monthly",
      nextDate: "2026-02-05",
    },
  ],
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
