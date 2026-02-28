"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category, Movement, MovementType } from "@/lib/dashboard/types";
import { X } from "lucide-react";

const tipos: MovementType[] = ["Ingreso", "Gasto", "Inversión", "Ahorro"];

type MovementFormProps = {
  movement?: Movement;
  categories: Category[];
  onSave: (movement: Omit<Movement, "id">) => void;
  onCancel: () => void;
  /** Si true, renderiza solo el formulario sin Card (para Sheet/móvil) */
  variant?: "default" | "compact";
};

const typeToCategoryType = (type: MovementType) => {
  if (type === "Ingreso") return "income";
  if (type === "Gasto") return "expense";
  if (type === "Inversión") return "investment";
  return "savings";
};

export function MovementForm({ movement, categories, onSave, onCancel, variant = "default" }: MovementFormProps) {
  const [fecha, setFecha] = useState(movement?.fecha || new Date().toISOString().split("T")[0]);
  const [concepto, setConcepto] = useState(movement?.concepto || "");
  const [tipo, setTipo] = useState<MovementType>(movement?.tipo || "Gasto");
  const [categoria, setCategoria] = useState(movement?.categoria || "");
  const [cantidad, setCantidad] = useState(movement?.cantidad.toString() || "");

  const categoriasDisponibles = categories
    .filter((category) => category.type === typeToCategoryType(tipo))
    .map((category) => category.name);

  useEffect(() => {
    if (!categoriasDisponibles.includes(categoria)) {
      setCategoria(categoriasDisponibles[0] || "");
    }
  }, [tipo, categoria, categoriasDisponibles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoriasDisponibles.length === 0) return;
    const cantidadNum = parseFloat(cantidad);
    if (!concepto.trim() || isNaN(cantidadNum) || cantidadNum === 0) return;

    const cantidadFinal = tipo === "Gasto" ? -Math.abs(cantidadNum) : Math.abs(cantidadNum);

    onSave({
      fecha,
      concepto: concepto.trim(),
      categoria: categoria || categoriasDisponibles[0],
      tipo,
      cantidad: cantidadFinal,
    });
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                id="fecha"
                label="Fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <Select
              label="Tipo"
              value={tipo}
              options={tipos.map((t) => ({ label: t, value: t }))}
              onChange={(value) => setTipo(value as MovementType)}
            />

            <div className="space-y-2">
              <Input
                id="concepto"
                label="Concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Select
                label="Categoría"
                value={categoria}
                options={categoriasDisponibles.map((cat) => ({ label: cat, value: cat }))}
                onChange={setCategoria}
              />
              {categoriasDisponibles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Crea una categoría antes de registrar movimientos.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                id="cantidad"
                label="Cantidad (€)"
                type="number"
                step="0.01"
                min="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            {movement && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={categoriasDisponibles.length === 0}>
              {movement ? "Guardar Cambios" : "Añadir Movimiento"}
            </Button>
          </div>
        </form>
  );

  if (variant === "compact") {
    return formContent;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{movement ? "Editar Movimiento" : "Nuevo Movimiento"}</CardTitle>
            <CardDescription>
              {movement ? "Modifica los datos del movimiento" : "Añade un nuevo ingreso, gasto o inversión"}
            </CardDescription>
          </div>
          {movement && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
