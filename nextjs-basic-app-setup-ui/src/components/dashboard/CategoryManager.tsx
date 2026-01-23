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
import { CATEGORY_ICON_MAP, type CategoryIconKey } from "@/lib/category-icons";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api/categories";
import { getUserId } from "@/lib/auth";

type CategoryType = "income" | "expense" | "investment" | "savings";

type CategoryItem = {
  id: string;
  name: string;
  type: CategoryType;
  icon: CategoryIconKey;
  color: string;
  active: boolean;
};

const iconMap = CATEGORY_ICON_MAP;

const defaultCategories: CategoryItem[] = [];

const colorOptions = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export function CategoryManager() {
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategories);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [filterType, setFilterType] = useState<"all" | CategoryType>("all");
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
    const savings = categories.filter((cat) => cat.type === "savings").length;
    return { total, active, incomes, investments, savings };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (filterType === "all") return categories;
    return categories.filter((cat) => cat.type === filterType);
  }, [categories, filterType]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!getUserId()) {
          setCategories([]);
          return;
        }
        const response = await fetchCategories();
        setCategories(response.data as CategoryItem[]);
      } catch {
        setCategories([]);
    }
    };
    void load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: "", type: "expense", icon: "Home", color: "#6366f1" });
  };

  const handleSubmit = async () => {
    if (!getUserId()) {
      alert("Inicia sesión para gestionar categorías.");
      return;
    }
    if (!formData.name.trim()) return;
    if (editing) {
      const updated = await updateCategory(editing.id, formData);
      setCategories((prev) =>
        prev.map((cat) => (cat.id === editing.id ? (updated.data as CategoryItem) : cat))
      );
    } else {
      const created = await createCategory({
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        active: true,
      });
      setCategories((prev) => [created.data as CategoryItem, ...prev]);
    }
    resetForm();
    window.dispatchEvent(new Event("finanzapp:data-updated"));
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

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    window.dispatchEvent(new Event("finanzapp:data-updated"));
  };

  const toggleActive = async (id: string) => {
    const current = categories.find((cat) => cat.id === id);
    if (!current) return;
    const updated = await updateCategory(id, { active: !current.active });
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? (updated.data as CategoryItem) : cat))
    );
    window.dispatchEvent(new Event("finanzapp:data-updated"));
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
              {[
                { key: "all" as const, label: "Total", value: usageStats.total },
                { key: "expense" as const, label: "Activas", value: usageStats.active },
                { key: "income" as const, label: "Ingresos", value: usageStats.incomes },
                { key: "investment" as const, label: "Inversión", value: usageStats.investments },
                { key: "savings" as const, label: "Ahorro", value: usageStats.savings },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFilterType(pill.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filterType === pill.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {pill.label}: {pill.value}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
              {filteredCategories.map((category) => {
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
                        {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">•</span>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.type === "income"
                            ? "Ingreso"
                            : category.type === "investment"
                            ? "Inversión"
                            : category.type === "savings"
                            ? "Ahorro"
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
              <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
                {(["expense", "income", "investment", "savings"] as CategoryType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData((prev) => ({ ...prev, type }))}
                    type="button"
                    className={`relative px-3 py-1 text-xs font-medium transition ${
                      formData.type === type ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {formData.type === type && (
                      <span className="absolute inset-0 rounded-full bg-background shadow-sm" />
                    )}
                    <span className="relative">
                      {type === "income"
                        ? "Ingreso"
                        : type === "investment"
                        ? "Inversión"
                        : type === "savings"
                        ? "Ahorro"
                        : "Gasto"}
                    </span>
                  </button>
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
