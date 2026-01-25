"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MovementForm } from "@/components/dashboard/MovementForm";
import { MovementsTable } from "@/components/dashboard/MovementsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category, Movement } from "@/lib/dashboard/types";
import { motion } from "framer-motion";
import { fetchMovements, createMovement, updateMovement, deleteMovement } from "@/lib/api/movements";
import { fetchCategories } from "@/lib/api/categories";
import { getUserId } from "@/lib/auth";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingMovement, setEditingMovement] = useState<Movement | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(8);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const categoryPillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
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
    const load = async () => {
      try {
        if (!getUserId()) {
          setMovimientos([]);
          setCategories([]);
      return;
    }
        const [movementsRes, categoriesRes] = await Promise.all([
          fetchMovements(),
          fetchCategories(),
        ]);
        setMovimientos(movementsRes.data);
        setCategories(categoriesRes.data as Category[]);
      } catch {
        setMovimientos([]);
        setCategories([]);
      }
    };
    void load();
  }, []);

  const handleSave = async (movementData: Omit<Movement, "id">) => {
    if (editingMovement) {
      const updated = await updateMovement(editingMovement.id!, movementData);
      setMovimientos((prev) =>
        prev.map((m) => (m.id === editingMovement.id ? updated.data : m))
      );
      setEditingMovement(undefined);
    } else {
      const created = await createMovement(movementData);
      setMovimientos((prev) =>
        [created.data, ...prev].sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
      );
    }
    window.dispatchEvent(new Event("finanzapp:data-updated"));
    setShowForm(false);
  };

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este movimiento?")) {
      await deleteMovement(id);
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
      window.dispatchEvent(new Event("finanzapp:data-updated"));
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

  const categoryOptions = Array.from(
    new Set(movimientos.map((m) => m.categoria))
  ).sort();

  // Calcular cuántas categorías caben en una fila
  const calculateVisibleCategories = useCallback(() => {
    if (!categoryContainerRef.current || categoryOptions.length === 0) {
      setVisibleCategoriesCount(Math.min(8, categoryOptions.length));
      return;
    }

    const container = categoryContainerRef.current;
    const containerWidth = container.offsetWidth;
    const gap = 4; // gap-1 = 4px
    const padding = 12; // p-1.5 = 12px total (6px each side)
    const selectorWidth = 110; // Ancho aproximado del selector "+X más"
    const todasWidth = 50; // Ancho aproximado de "Todas" con padding
    const availableWidth = containerWidth - padding - selectorWidth - gap - todasWidth - gap;

    if (availableWidth <= 0) {
      setVisibleCategoriesCount(0);
      return;
    }

    // Crear un elemento temporal para medir el ancho real
    const tempElement = document.createElement('button');
    tempElement.className = 'relative px-2 py-1 text-xs font-medium whitespace-nowrap';
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    document.body.appendChild(tempElement);

    let totalWidth = 0;
    let count = 0;

    // Medir cada categoría real
    for (const category of categoryOptions) {
      tempElement.textContent = category;
      const categoryWidth = tempElement.offsetWidth;
      
      if (totalWidth + categoryWidth + gap <= availableWidth) {
        totalWidth += categoryWidth + gap;
        count++;
      } else {
        break;
      }
    }

    document.body.removeChild(tempElement);

    // Asegurar que al menos se muestren algunas categorías si hay espacio
    setVisibleCategoriesCount(Math.max(0, Math.min(count, categoryOptions.length)));
  }, [categoryOptions]);

  useEffect(() => {
    calculateVisibleCategories();
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleCategories();
    });

    if (categoryContainerRef.current) {
      resizeObserver.observe(categoryContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateVisibleCategories]);

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
              {["Todos", "Ingreso", "Gasto", "Inversión", "Ahorro"].map((tipo) => (
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
            <div 
              ref={categoryContainerRef}
              className="flex items-center gap-1 rounded-lg bg-muted p-1.5 overflow-hidden"
            >
              {/* Mostrar "Todas" siempre */}
              <button
                key="Todas"
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: "Todas" }))}
                className="relative px-2 py-1 text-xs font-medium text-muted-foreground transition whitespace-nowrap flex-shrink-0"
              >
                {filters.category === "Todas" && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-md bg-background shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={filters.category === "Todas" ? "relative text-foreground" : "relative"}>
                  Todas
                </span>
              </button>
              
              {/* Mostrar categorías visibles */}
              {categoryOptions.slice(0, visibleCategoriesCount).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category }))}
                  className="relative px-2 py-1 text-xs font-medium text-muted-foreground transition whitespace-nowrap flex-shrink-0"
                  ref={(el) => {
                    if (el) categoryPillRefs.current.set(category, el);
                  }}
                >
                  {filters.category === category && (
                    <motion.span
                      layoutId="category-pill"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={filters.category === category ? "relative text-foreground" : "relative"}>
                    {category}
                  </span>
                </button>
              ))}
              
              {/* Selector para categorías restantes */}
              {categoryOptions.length > visibleCategoriesCount && (
                <select
                  className="px-2 py-1 text-xs border-0 bg-transparent text-muted-foreground rounded-md flex-shrink-0 min-w-[100px] appearance-none cursor-pointer"
                  value={categoryOptions.slice(visibleCategoriesCount).includes(filters.category) ? filters.category : ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      setFilters((prev) => ({ ...prev, category: event.target.value }));
                    }
                  }}
                >
                  <option value="" disabled>
                    {categoryOptions.length > visibleCategoriesCount ? `+${categoryOptions.length - visibleCategoriesCount} más` : "Más"}
                  </option>
                  {categoryOptions.slice(visibleCategoriesCount).map((category) => (
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
          categories={categories}
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
