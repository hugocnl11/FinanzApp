"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Movement, MovementType } from "@/lib/dashboard/types";
import { Plus, X } from "lucide-react";

const categoriasPorTipo: Record<MovementType, string[]> = {
  Ingreso: ["Nómina", "Intereses", "Ventas", "Freelance", "Otros"],
  Gasto: ["Vivienda", "Alimentación", "Ocio", "Transporte", "Salud", "Educación", "Otros"],
  Inversión: ["Acciones", "Fondos", "Crypto", "Bonos", "PIAS", "Otros"],
};

const tipos: MovementType[] = ["Ingreso", "Gasto", "Inversión"];

type MovementFormProps = {
  movement?: Movement;
  onSave: (movement: Omit<Movement, "id">) => void;
  onCancel: () => void;
};

export function MovementForm({ movement, onSave, onCancel }: MovementFormProps) {
  const [fecha, setFecha] = useState(movement?.fecha || new Date().toISOString().split("T")[0]);
  const [concepto, setConcepto] = useState(movement?.concepto || "");
  const [tipo, setTipo] = useState<MovementType>(movement?.tipo || "Gasto");
  const [categoria, setCategoria] = useState(movement?.categoria || "");
  const [cantidad, setCantidad] = useState(movement?.cantidad.toString() || "");

  const categoriasDisponibles = categoriasPorTipo[tipo] || [];

  useEffect(() => {
    if (!categoriasDisponibles.includes(categoria)) {
      setCategoria(categoriasDisponibles[0] || "");
    }
  }, [tipo, categoria, categoriasDisponibles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

            <div className="space-y-2">
              <label htmlFor="tipo" className="text-sm font-medium block mb-1">
                Tipo
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as MovementType)}
                className="w-full px-4 py-2 text-md bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                required
              >
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

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
              <label htmlFor="categoria" className="text-sm font-medium block mb-1">
                Categoría
              </label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-2 text-md bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                required
              >
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
            <Button type="submit">
              {movement ? "Guardar Cambios" : "Añadir Movimiento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
