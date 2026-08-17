"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  createWishlistItem,
  deleteWishlistItem,
  fetchWishlist,
  updateWishlistItem,
} from "@/lib/api/wishlist";
import type { WishlistColumn, WishlistItem } from "@/lib/dashboard/types";
import {
  COLUMN_META,
  WISHLIST_COLUMNS,
  analyzeItem,
  snapshotFromDashboard,
  type ItemAffordability,
} from "@/lib/wishlist/affordability";

type Draft = {
  id?: string;
  title: string;
  price: string;
  notes: string;
  column: WishlistColumn;
};

const emptyDraft = (): Draft => ({
  title: "",
  price: "",
  notes: "",
  column: "undecided",
});

const verdictClass: Record<ItemAffordability["verdict"], string> = {
  now: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  fits: "bg-muted text-muted-foreground",
  sooner: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  short: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  blocked: "bg-destructive/10 text-destructive",
};

export function WishlistBoard() {
  const currency = useCurrency();
  const { data } = useDashboardData();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<WishlistColumn | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const snapshot = useMemo(() => snapshotFromDashboard(data), [data]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWishlist();
        if (active) setItems(res.data ?? []);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const analysisById = useMemo(() => {
    const map = new Map<string, ItemAffordability>();
    for (const item of items) {
      map.set(item.id, analyzeItem(item.price, snapshot, item.column));
    }
    return map;
  }, [items, snapshot]);

  const openCreate = (column: WishlistColumn = "undecided") => {
    setDraft({ ...emptyDraft(), column });
    setEditorOpen(true);
  };

  const openEdit = (item: WishlistItem) => {
    setDraft({
      id: item.id,
      title: item.title,
      price: String(item.price),
      notes: item.notes ?? "",
      column: item.column,
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const title = draft.title.trim();
    const price = Number(draft.price);
    if (!title || !Number.isFinite(price) || price <= 0 || saving) return;
    setSaving(true);
    try {
      if (draft.id) {
        const res = await updateWishlistItem(draft.id, {
          title,
          price,
          notes: draft.notes.trim() || undefined,
          column: draft.column,
        });
        setItems((prev) => prev.map((item) => (item.id === draft.id ? res.data : item)));
      } else {
        const res = await createWishlistItem({
          title,
          price,
          notes: draft.notes.trim() || undefined,
          column: draft.column,
        });
        setItems((prev) => [...prev, res.data]);
      }
      setEditorOpen(false);
    } catch {
      // keep editor open
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWishlistItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setEditorOpen(false);
  };

  const handleMove = async (id: string, column: WishlistColumn) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.column === column) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, column } : item))
    );
    try {
      const res = await updateWishlistItem(id, { column });
      setItems((prev) => prev.map((item) => (item.id === id ? res.data : item)));
    } catch {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? current : item))
      );
    }
  };

  const canSaveDraft = draft.title.trim() && Number(draft.price) > 0;

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WISHLIST_COLUMNS.map((column) => (
          <Skeleton key={column} className="h-[280px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            Usamos el 30% de tu margen mensual y no tocamos el fondo de emergencia.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Margen:{" "}
              <strong className="text-foreground tabular-nums">
                {formatCurrency(snapshot.monthlySurplus, currency)}
              </strong>
              /mes
            </span>
            <span>
              Disponible:{" "}
              <strong className="text-foreground tabular-nums">
                {formatCurrency(snapshot.discretionarySavings, currency)}
              </strong>
            </span>
            <span>
              Ritmo responsable:{" "}
              <strong className="text-foreground tabular-nums">
                {formatCurrency(snapshot.responsibleMonthly, currency)}
              </strong>
              /mes
            </span>
          </div>
        </div>
        <Button size="sm" onClick={() => openCreate("undecided")}>
          <Plus className="h-4 w-4" />
          Añadir objeto
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 xl:grid xl:grid-cols-4 xl:overflow-visible">
        {WISHLIST_COLUMNS.map((column) => {
          const columnItems = items
            .filter((item) => item.column === column)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
          const meta = COLUMN_META[column];
          return (
            <section
              key={column}
              className={cn(
                "flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-border bg-muted/20 p-3 xl:w-auto",
                overColumn === column && "border-primary bg-primary/5"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setOverColumn(column);
              }}
              onDragLeave={() => {
                setOverColumn((current) => (current === column ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                setOverColumn(null);
                setDraggingId(null);
                if (id) void handleMove(id, column);
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{meta.label}</h2>
                  <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {columnItems.length}
                </span>
              </div>

              <div className="flex min-h-[180px] flex-1 flex-col gap-2">
                {columnItems.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    {column === "undecided"
                      ? "Suelta aquí lo que te tienta y todavía no has decidido."
                      : "Arrastra una card para situarla en este plazo."}
                  </p>
                ) : (
                  columnItems.map((item) => {
                    const analysis = analysisById.get(item.id);
                    return (
                      <article
                        key={item.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingId(item.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                        }}
                        className={cn(
                          "cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition active:cursor-grabbing",
                          draggingId === item.id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                          <div className="flex shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={() => openEdit(item)}
                              aria-label={`Editar ${item.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-lg font-bold tabular-nums tracking-tight">
                          {formatCurrency(item.price, currency)}
                        </p>
                        {item.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
                        ) : null}
                        {analysis ? (
                          <p
                            className={cn(
                              "mt-2 rounded-md px-2 py-1 text-[11px] leading-snug",
                              verdictClass[analysis.verdict]
                            )}
                          >
                            {analysis.verdictLabel}
                          </p>
                        ) : null}
                        {column === "undecided" && analysis ? (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Encajaría en {COLUMN_META[analysis.suggestedColumn].label.toLowerCase()}
                          </p>
                        ) : null}
                        <label className="mt-2 block xl:hidden">
                          <span className="sr-only">Mover a</span>
                          <select
                            value={item.column}
                            onPointerDown={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              void handleMove(item.id, event.target.value as WishlistColumn)
                            }
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                          >
                            {WISHLIST_COLUMNS.map((value) => (
                              <option key={value} value={value}>
                                {COLUMN_META[value].label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-2 justify-start text-muted-foreground"
                onClick={() => openCreate(column)}
              >
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            </section>
          );
        })}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar objeto" : "Nuevo objeto"}</DialogTitle>
            <DialogDescription>
              Ponle nombre y precio. El importe a la vista ayuda a decidir con la cabeza, no con el impulso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              label="Qué quieres comprar"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="min-h-[44px]"
            />
            <Input
              label="Precio (€)"
              type="number"
              min={0}
              step={1}
              value={draft.price}
              onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
              className="min-h-[44px]"
            />
            <Input
              label="Nota (opcional)"
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-[44px]"
            />
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Columna</span>
              <div className="flex flex-wrap gap-2">
                {WISHLIST_COLUMNS.map((column) => (
                  <button
                    key={column}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, column }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition",
                      draft.column === column
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    {COLUMN_META[column].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {draft.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleDelete(draft.id!)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={!canSaveDraft || saving}>
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
