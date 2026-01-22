"use client";

import { useState, useEffect } from "react";
import { MovementForm } from "@/components/dashboard/MovementForm";
import { MovementsTable } from "@/components/dashboard/MovementsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";
import type { Movement } from "@/lib/dashboard/types";
import { motion } from "framer-motion";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movement[]>([]);
  const [editingMovement, setEditingMovement] = useState<Movement | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    type: "Todos",
    category: "Todas",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });

  useEffect(() => {
    // Inicializar con datos del mock y añadir IDs
    const stored = loadFromStorage<Movement[]>("movimientos", []);
    if (stored.length > 0) {
      setMovimientos(stored);
      return;
    }
    const movimientosConIds = DASHBOARD_MOCK.movimientos.map((m, i) => ({
      ...m,
      id: `mov-${i}-${Date.now()}`,
    }));
    setMovimientos(movimientosConIds);
  }, []);

  useEffect(() => {
    if (movimientos.length > 0) {
      saveToStorage("movimientos", movimientos);
    }
  }, [movimientos]);

  const handleSave = (movementData: Omit<Movement, "id">) => {
    if (editingMovement) {
      // Editar movimiento existente
      setMovimientos((prev) =>
        prev.map((m) => (m.id === editingMovement.id ? { ...movementData, id: m.id } : m))
      );
      setEditingMovement(undefined);
    } else {
      // Añadir nuevo movimiento
      const newMovement: Movement = {
        ...movementData,
        id: `mov-${Date.now()}-${Math.random()}`,
      };
      setMovimientos((prev) => [...prev, newMovement].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
    }
    setShowForm(false);
  };

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este movimiento?")) {
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleAddNew = () => {
    setEditingMovement(undefined);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMovement(undefined);
  };

  const categories = Array.from(
    new Set(movimientos.map((m) => m.categoria))
  ).sort();

  const filteredMovements = movimientos.filter((movement) => {
    const searchMatch =
      !filters.search ||
      movement.concepto.toLowerCase().includes(filters.search.toLowerCase()) ||
      movement.categoria.toLowerCase().includes(filters.search.toLowerCase());
    const typeMatch = filters.type === "Todos" || movement.tipo === filters.type;
    const categoryMatch =
      filters.category === "Todas" || movement.categoria === filters.category;
    const dateFromMatch = !filters.dateFrom || movement.fecha >= filters.dateFrom;
    const dateToMatch = !filters.dateTo || movement.fecha <= filters.dateTo;
    const amountMinMatch =
      !filters.amountMin || movement.cantidad >= Number(filters.amountMin);
    const amountMaxMatch =
      !filters.amountMax || movement.cantidad <= Number(filters.amountMax);

    return (
      searchMatch &&
      typeMatch &&
      categoryMatch &&
      dateFromMatch &&
      dateToMatch &&
      amountMinMatch &&
      amountMaxMatch
    );
  });

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "Todos",
      category: "Todas",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    });
  };

  const exportCSV = () => {
    const headers = ["Fecha", "Tipo", "Concepto", "Categoría", "Cantidad"];
    const rows = filteredMovements.map((movement) => [
      movement.fecha,
      movement.tipo,
      movement.concepto,
      movement.categoria,
      movement.cantidad.toString().replace(".", ","),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(";"))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "movimientos.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    const html = `
      <html>
        <head>
          <title>Reporte de movimientos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Reporte de movimientos</h1>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${filteredMovements
                .map(
                  (movement) => `
                    <tr>
                      <td>${movement.fecha}</td>
                      <td>${movement.tipo}</td>
                      <td>${movement.concepto}</td>
                      <td>${movement.categoria}</td>
                      <td>${movement.cantidad.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const newWindow = window.open("", "_blank");
    if (!newWindow) return;
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimientos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus ingresos, gastos e inversiones
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <h2 className="text-lg font-semibold">Filtros avanzados</h2>
            <p className="text-sm text-muted-foreground">
              Segmenta los movimientos y exporta resultados.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>
              Exportar PDF
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Input
            label="Buscar"
            placeholder="Concepto o categoría"
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
          
          {/* Tipo como Pills */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {["Todos", "Ingreso", "Gasto", "Inversión"].map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, type: tipo }))}
                  className="relative flex-1 px-2 py-1 text-xs font-medium text-muted-foreground transition"
                >
                  {filters.type === tipo && (
                    <motion.span
                      layoutId="tipo-pill"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={filters.type === tipo ? "relative text-foreground" : "relative"}>
                    {tipo === "Todos" ? "Todos" : tipo.slice(0, 3)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Categoría como Pills (versión compacta) */}
          <div className="space-y-2 xl:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Categoría</label>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1.5">
              {["Todas", ...categories.slice(0, 5)].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category }))}
                  className="relative px-2 py-1 text-xs font-medium text-muted-foreground transition"
                >
                  {filters.category === category && (
                    <motion.span
                      layoutId="category-pill"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={filters.category === category ? "relative text-foreground" : "relative"}>
                    {category.length > 8 ? category.slice(0, 8) + "..." : category}
                  </span>
                </button>
              ))}
              {categories.length > 5 && (
                <select
                  className="px-2 py-1 text-xs border-0 bg-transparent text-muted-foreground rounded-md"
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  <option value={filters.category}>
                    {categories.length > 5 ? `+${categories.length - 5} más` : "Más"}
                  </option>
                  {categories.slice(5).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Input
            label="Desde"
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
          />
          <Input
            label="Cantidad mínima"
            type="number"
            value={filters.amountMin}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, amountMin: event.target.value }))
            }
          />
          <Input
            label="Cantidad máxima"
            type="number"
            value={filters.amountMax}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, amountMax: event.target.value }))
            }
          />
          <div className="flex items-end">
            <Button variant="outline" onClick={resetFilters} className="w-full" size="sm">
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      {showForm && (
        <MovementForm
          movement={editingMovement}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <MovementsTable
        movimientos={filteredMovements}
        total={movimientos.length}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNew={handleAddNew}
      />
    </div>
  );
}
