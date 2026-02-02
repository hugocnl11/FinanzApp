"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus } from "lucide-react";
import { getSession, isDemoUser, updateSessionUser } from "@/lib/auth";
import { updateProfile } from "@/lib/api/auth";
import { fetchCategories } from "@/lib/api/categories";
import { fetchAssetSnapshotsForDate, createAssetSnapshot } from "@/lib/api/asset-snapshots";
import { createCategory } from "@/lib/api/categories";
import type { UserPreferences } from "@/lib/api/types";
import type { Category } from "@/lib/dashboard/types";

const INITIAL_ASSETS_STORAGE_KEY = "finanzapp:initialAssetsDone";

type AssetRow = {
  categoryId: string;
  name: string;
  type: "investment" | "savings";
  value: string;
};

type NewRow = {
  name: string;
  type: "investment" | "savings";
  value: string;
};

const DEFAULT_NEW_ROW: NewRow = { name: "", type: "savings", value: "" };

const INVESTMENT_COLORS = ["#2563eb", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];
const SAVINGS_COLORS = ["#16a34a", "#059669", "#22c55e", "#0f766e", "#84cc16"];

export function InitialAssetsForm() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [newRow, setNewRow] = useState<NewRow>(DEFAULT_NEW_ROW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markDone = useCallback(() => {
    setOpen(false);
    if (isDemoUser()) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(INITIAL_ASSETS_STORAGE_KEY, "true");
      }
      return;
    }
    const session = getSession();
    const prefs = (session?.user?.preferences ?? {}) as UserPreferences;
    updateProfile({ preferences: { ...prefs, initialAssetsDone: true } })
      .then((res) => {
        if (res?.data?.user?.preferences) {
          updateSessionUser({ preferences: res.data.user.preferences });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (checked) return;
    if (isDemoUser()) {
      const done = typeof window !== "undefined" && window.localStorage.getItem(INITIAL_ASSETS_STORAGE_KEY) === "true";
      setOpen(!done);
      setChecked(true);
      return;
    }
    const session = getSession();
    if (!session) {
      setChecked(true);
      return;
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const prefs = data?.data?.user?.preferences as UserPreferences | undefined;
        if (prefs) {
          updateSessionUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            ...session.user,
            preferences: prefs,
          });
        }
        const done = prefs?.initialAssetsDone === true;
        setOpen(!done);
      })
      .catch(() => setOpen(false))
      .finally(() => setChecked(true));
  }, [checked]);

  useEffect(() => {
    if (!open || !checked) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetchCategories().then((r) => r.data ?? []),
      fetchAssetSnapshotsForDate(today).then((r) => r.data ?? []),
    ])
      .then(([cats, snapshots]) => {
        const categories = cats as Category[];
        const assetCategories = categories.filter(
          (c) => (c.type === "investment" || c.type === "savings") && c.active !== false
        );
        const snapshotByCategory = new Map(
          (snapshots as { categoryId: string; value: number }[]).map((s) => [s.categoryId, s.value])
        );
        const initialRows: AssetRow[] = assetCategories.map((c) => ({
          categoryId: c.id,
          name: c.name,
          type: c.type as "investment" | "savings",
          value: String(snapshotByCategory.get(c.id) ?? ""),
        }));
        setRows(initialRows);
        setNewRow(DEFAULT_NEW_ROW);
        setError(null);
      })
      .catch(() => {
        setRows([]);
        setError("No se pudieron cargar las categorías.");
      });
  }, [open, checked]);

  const handleSkip = () => {
    markDone();
  };

  const handleValueChange = (categoryId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.categoryId === categoryId ? { ...r, value } : r))
    );
  };

  const handleNewRowChange = (field: keyof NewRow, value: string) => {
    setNewRow((prev) => ({
      ...prev,
      [field]: field === "type" ? (value as "investment" | "savings") : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      for (const row of rows) {
        const val = Math.max(0, Number(row.value.replace(",", ".")));
        if (val > 0) {
          await createAssetSnapshot({ categoryId: row.categoryId, value: val, date: today });
        }
      }
      if (newRow.name.trim() && Number(newRow.value.replace(",", ".")) > 0) {
        const val = Math.max(0, Number(newRow.value.replace(",", ".")));
        const colors = newRow.type === "savings" ? SAVINGS_COLORS : INVESTMENT_COLORS;
        const created = await createCategory({
          name: newRow.name.trim(),
          type: newRow.type,
          icon: newRow.type === "savings" ? "PiggyBank" : "LineChart",
          color: colors[0],
          active: true,
        });
        const categoryId = (created.data as Category).id;
        await createAssetSnapshot({ categoryId, value: val, date: today });
      }
      markDone();
      window.dispatchEvent(new Event("finanzapp:data-updated"));
    } catch {
      setError("No se pudieron guardar los datos. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const valueLabel = (type: "investment" | "savings") =>
    type === "savings" ? "Saldo actual (€)" : "Valor actual (€)";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && markDone()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Configura tu patrimonio inicial</DialogTitle>
              <DialogDescription>
                Indica el dinero que ya tienes en ahorros e inversiones para no desvirtuar el mes actual. Puedes omitir y configurarlo luego en Ajustes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {rows.length === 0 && !error ? (
            <p className="text-sm text-muted-foreground">Cargando categorías...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Saldo o valor actual por categoría</p>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li key={row.categoryId} className="flex items-center gap-2">
                      <span className="text-sm flex-1 min-w-0 truncate">{row.name}</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0"
                        value={row.value}
                        onChange={(e) => handleValueChange(row.categoryId, e.target.value)}
                        className="w-28 shrink-0 h-9"
                        aria-label={valueLabel(row.type)}
                      />
                      <span className="text-xs text-muted-foreground shrink-0">€</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Añadir otra
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Nombre (ej. Fondo emergencia)"
                    value={newRow.name}
                    onChange={(e) => handleNewRowChange("name", e.target.value)}
                    className="flex-1 min-w-[140px] h-9"
                  />
                  <select
                    value={newRow.type}
                    onChange={(e) => handleNewRowChange("type", e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="savings">Ahorro</option>
                    <option value="investment">Inversión</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={newRow.value}
                    onChange={(e) => handleNewRowChange("value", e.target.value)}
                    className="w-24 h-9"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            Omitir
          </Button>
          <Button onClick={handleSave} disabled={saving || !!error}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
