"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";

type CategoryType = "income" | "expense" | "investment";

type CategoryItem = {
  id: string;
  name: string;
  type: CategoryType;
  icon: CategoryIconKey;
  color: string;
  active: boolean;
};

const iconMap = CATEGORY_ICON_MAP;

const defaultCategories: CategoryItem[] = [
  { id: "cat-1", name: "Vivienda", type: "expense", icon: "Home", color: "#6366f1", active: true },
  { id: "cat-2", name: "Comida", type: "expense", icon: "Utensils", color: "#22c55e", active: true },
  { id: "cat-3", name: "Compras", type: "expense", icon: "ShoppingCart", color: "#f59e0b", active: true },
  { id: "cat-4", name: "Transporte", type: "expense", icon: "Car", color: "#ef4444", active: true },
  { id: "cat-5", name: "Servicios", type: "expense", icon: "Smartphone", color: "#06b6d4", active: true },
  { id: "cat-6", name: "Sueldo", type: "income", icon: "Briefcase", color: "#16a34a", active: true },
  { id: "cat-7", name: "Ahorro", type: "income", icon: "PiggyBank", color: "#8b5cf6", active: true },
];

const colorOptions = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export function CategoryManager() {
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategories);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as CategoryType,
    icon: "Home" as CategoryIconKey,
    color: "#6366f1",
  });

  const usageStats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((cat) => cat.active).length;
    const incomes = categories.filter((cat) => cat.type === "income").length;
    const investments = categories.filter((cat) => cat.type === "investment").length;
    return { total, active, incomes, investments };
  }, [categories]);

  useEffect(() => {
    const stored = loadFromStorage<CategoryItem[]>("categories", defaultCategories);
    if (stored.length > 0) {
      setCategories(stored);
    }
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      saveToStorage("categories", categories);
    }
  }, [categories]);

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: "", type: "expense", icon: "Home", color: "#6366f1" });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editing) {
      setCategories((prev) =>
        prev.map((cat) => (cat.id === editing.id ? { ...cat, ...formData } : cat))
      );
    } else {
      const newCategory: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        active: true,
      };
      setCategories((prev) => [newCategory, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (category: CategoryItem) => {
    setEditing(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
    });
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const toggleActive = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, active: !cat.active } : cat))
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Gestionar Categorías
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestión de categorías</DialogTitle>
          <DialogDescription>
            Crea, edita y organiza tus categorías de ingresos y gastos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Total: {usageStats.total}</Badge>
              <Badge variant="secondary">Activas: {usageStats.active}</Badge>
              <Badge variant="secondary">Ingresos: {usageStats.incomes}</Badge>
              <Badge variant="secondary">Inversión: {usageStats.investments}</Badge>
            </div>

            <div className="space-y-3">
              {categories.map((category) => {
                const Icon = iconMap[category.icon];
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-xl border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.type === "income"
                            ? "Ingreso"
                            : category.type === "investment"
                            ? "Inversión"
                            : "Gasto"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(category.id)}
                      >
                        {category.active ? "Activa" : "Inactiva"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold">
                {editing ? "Editar categoría" : "Nueva categoría"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Personaliza nombre, tipo, icono y color.
              </p>
            </div>

            <Input
              label="Nombre"
              placeholder="Ej. Educación"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tipo</p>
              <div className="flex gap-2">
                {(["expense", "income", "investment"] as CategoryType[]).map((type) => (
                  <Button
                    key={type}
                    variant={formData.type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, type }))}
                  >
                    {type === "income" ? "Ingreso" : type === "investment" ? "Inversión" : "Gasto"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Icono</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(iconMap) as Array<keyof typeof iconMap>).map((iconKey) => {
                  const Icon = iconMap[iconKey];
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon: iconKey }))}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                        formData.icon === iconKey ? "border-primary" : "border-border"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Color</p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`h-7 w-7 rounded-full border-2 ${
                      formData.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editing ? "Guardar cambios" : "Crear categoría"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
