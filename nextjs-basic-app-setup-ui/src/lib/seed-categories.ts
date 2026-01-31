import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORIES = [
  { name: "Alquiler", type: "EXPENSE" as const, icon: "Home", color: "#6366f1" },
  { name: "Comida", type: "EXPENSE" as const, icon: "Utensils", color: "#22c55e" },
  { name: "Salud", type: "EXPENSE" as const, icon: "HeartPulse", color: "#e11d48" },
  { name: "Transporte", type: "EXPENSE" as const, icon: "Car", color: "#0ea5e9" },
  { name: "Suscripciones", type: "EXPENSE" as const, icon: "CreditCard", color: "#f59e0b" },
  { name: "Restaurantes", type: "EXPENSE" as const, icon: "Utensils", color: "#f97316" },
  { name: "Ropa", type: "EXPENSE" as const, icon: "ShoppingCart", color: "#f59e0b" },
  { name: "Tecnología", type: "EXPENSE" as const, icon: "Smartphone", color: "#6366f1" },
  { name: "Regalos", type: "EXPENSE" as const, icon: "Gift", color: "#f97316" },
  { name: "Otros", type: "EXPENSE" as const, icon: "Wallet", color: "#64748b" },
  { name: "Nomina", type: "INCOME" as const, icon: "Briefcase", color: "#16a34a" },
  { name: "Transferencia", type: "INCOME" as const, icon: "Wallet", color: "#38bdf8" },
  { name: "Venta de Crypto", type: "INCOME" as const, icon: "Droplet", color: "#f59e0b" },
  { name: "Venta de acciones", type: "INCOME" as const, icon: "LineChart", color: "#6366f1" },
  { name: "Ahorro", type: "INVESTMENT" as const, icon: "PiggyBank", color: "#8b5cf6" },
  { name: "Acciones", type: "INVESTMENT" as const, icon: "LineChart", color: "#22c55e" },
  { name: "Crypto", type: "INVESTMENT" as const, icon: "Droplet", color: "#f59e0b" },
];

export async function seedCategoriesForUser(userId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      active: true,
    })),
    skipDuplicates: true,
  });
}
