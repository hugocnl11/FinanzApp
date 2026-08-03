"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Camera, Briefcase, ChevronRight, Trash2, Pencil } from "lucide-react";
import { getSession, updateSessionUser } from "@/lib/auth";
import { updateProfile, logout } from "@/lib/api/auth";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import {
  fetchSalaryHistory,
  createSalaryEntry,
  updateSalaryEntry,
  deleteSalaryEntry,
} from "@/lib/api/salary-history";
import type { SalaryEntry } from "@/lib/api/types";
import { formatCurrency } from "@/lib/format";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const CHART_HEIGHT = 140;
const CHART_PADDING = { top: 4, right: 8, bottom: 28, left: 44 };

function formatShortDate(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return ymd.slice(0, 7);
  return d.toLocaleDateString("es-ES", { month: "2-digit", year: "2-digit" });
}

function SalaryEvolutionChart({ entries }: { entries: SalaryEntry[] }) {
  const { points, maxAmount, width } = useMemo(() => {
    if (entries.length === 0) return { points: [] as { x: number; y: number; label: string; shortLabel: string; amount: number }[], maxAmount: 1, width: 280 };
    const sorted = [...entries].sort(
      (a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime()
    );
    const minT = Math.min(...sorted.map((e) => new Date(e.fromDate).getTime()));
    const maxT = Math.max(
      ...sorted.map((e) => (e.toDate ? new Date(e.toDate).getTime() : Date.now()))
    );
    const maxAmt = Math.max(...sorted.map((e) => e.amount), 1);
    const rangeT = maxT - minT || 1;
    const pts = sorted.map((e) => ({
      x: (new Date(e.fromDate).getTime() - minT) / rangeT,
      y: e.amount / maxAmt,
      label: formatDateYmd(e.fromDate),
      shortLabel: formatShortDate(e.fromDate),
      amount: e.amount,
    }));
    return { points: pts, maxAmount: maxAmt, width: 280 };
  }, [entries]);

  if (points.length === 0) return null;

  const innerW = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const toX = (t: number) => CHART_PADDING.left + t * innerW;
  const toY = (v: number) => CHART_PADDING.top + innerH - v * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.x)} ${toY(p.y)}`).join(" ");
  const areaPath =
    linePath +
    (points.length > 0
      ? ` L ${toX(points[points.length - 1].x)} ${toY(0)} L ${toX(points[0].x)} ${toY(0)} Z`
      : "");

  const yTicks = [0, 0.5, 1].map((v) => ({
    y: toY(v),
    label: formatCurrency(Math.round(maxAmount * v)),
  }));

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Evolución salarial</p>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full h-auto text-muted-foreground"
        aria-label="Gráfico de evolución salarial"
      >
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={CHART_PADDING.left}
              x2={width - CHART_PADDING.right}
              y1={tick.y}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeDasharray="2 2"
            />
            <text
              x={CHART_PADDING.left - 4}
              y={tick.y + 3}
              textAnchor="end"
              fontSize={9}
              fill="currentColor"
            >
              {tick.label}
            </text>
          </g>
        ))}
        <path
          d={areaPath}
          fill="hsl(var(--primary))"
          fillOpacity="0.15"
        />
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3.5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1.5}
          />
        ))}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={toX(p.x)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            fontSize={8}
            fill="currentColor"
          >
            {p.shortLabel}
          </text>
        ))}
      </svg>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateYmd(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Aproximación tipo efectivo IRPF España (escalas general 2024) para salario anual bruto. */
function estimatedEffectiveIrpfSpain(annualGross: number): number {
  if (annualGross <= 0) return 0;
  const brackets = [
    { limit: 12450, rate: 0.19 },
    { limit: 20200, rate: 0.24 },
    { limit: 35200, rate: 0.30 },
    { limit: 60000, rate: 0.37 },
    { limit: 300000, rate: 0.45 },
    { limit: Infinity, rate: 0.47 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const inBracket = Math.min(annualGross, b.limit) - prev;
    if (inBracket > 0) tax += inBracket * b.rate;
    if (annualGross <= b.limit) break;
    prev = b.limit;
  }
  return tax / annualGross;
}

function SalaryTotals({ entries }: { entries: SalaryEntry[] }) {
  const { totalGross, totalNet, totalYears } = useMemo(() => {
    if (entries.length === 0) return { totalGross: 0, totalNet: 0, totalYears: 0 };
    const today = Date.now();
    let gross = 0;
    for (const e of entries) {
      const start = new Date(e.fromDate).getTime();
      const end = e.toDate ? new Date(e.toDate).getTime() : today;
      const years = Math.max(0, (end - start) / (365.25 * 24 * 3600 * 1000));
      gross += e.amount * years;
    }
    const totalYears = entries.reduce((acc, e) => {
      const start = new Date(e.fromDate).getTime();
      const end = e.toDate ? new Date(e.toDate).getTime() : today;
      return acc + Math.max(0, (end - start) / (365.25 * 24 * 3600 * 1000));
    }, 0);
    const avgAnnual = totalYears > 0 ? gross / totalYears : 0;
    const effectiveRate = estimatedEffectiveIrpfSpain(avgAnnual);
    const totalNet = gross * (1 - effectiveRate);
    return { totalGross: gross, totalNet, totalYears };
  }, [entries]);

  if (entries.length === 0 || (totalGross === 0 && totalYears === 0)) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Total ganado en este puesto</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
        <span>
          <strong>Bruto:</strong> {formatCurrency(Math.round(totalGross * 100) / 100)}
        </span>
        <span>
          <strong>Neto (est. IRPF España):</strong> {formatCurrency(Math.round(totalNet * 100) / 100)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimación según escalas IRPF España; no incluye deducciones autonómicas ni otros conceptos.
      </p>
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    salarioBrutoAnual: "",
    fechaInicioEmpleoActual: "",
    empresaActual: "",
    puestoActual: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [salaryEntries, setSalaryEntries] = useState<SalaryEntry[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState({ fromDate: "", toDate: "", amount: "", note: "" });
  const [salarySaving, setSalarySaving] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const { name, email, image } = session.user;
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    const nombre = parts[0] ?? "";
    const apellidos = parts.slice(1).join(" ") ?? "";
    const stored = loadFromStorage(
      "settings",
      null as null | {
        formData?: {
          telefono?: string;
          salarioBrutoAnual?: string;
          fechaInicioEmpleoActual?: string;
          empresaActual?: string;
          puestoActual?: string;
        };
      }
    );
    const fd = stored?.formData;
    setFormData({
      nombre,
      apellidos,
      email: email ?? "",
      telefono: fd?.telefono ?? "",
      salarioBrutoAnual: fd?.salarioBrutoAnual ?? "",
      fechaInicioEmpleoActual: fd?.fechaInicioEmpleoActual ?? "",
      empresaActual: fd?.empresaActual ?? "",
      puestoActual: fd?.puestoActual ?? "",
    });
    if (image) setImagePreview(image);
  }, [router]);

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    setSalaryLoading(true);
    setSalaryError(null);
    fetchSalaryHistory()
      .then(setSalaryEntries)
      .catch(() => setSalaryError("No se pudo cargar el historial salarial"))
      .finally(() => setSalaryLoading(false));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageFile(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const name = [formData.nombre, formData.apellidos].filter(Boolean).join(" ").trim() || formData.nombre || "Usuario";
      const payload: { name?: string; email?: string; image?: string | null } = {
        name,
        email: formData.email.trim() || undefined,
      };
      if (imageFile != null) payload.image = imageFile;
      const res = await updateProfile(payload);
      const user = res.data.user;
      updateSessionUser({ id: user.id, name: user.name, email: user.email, image: user.image });
      saveToStorage("settings", {
        ...loadFromStorage("settings", {}),
        formData: {
          ...formData,
          telefono: formData.telefono,
          salarioBrutoAnual: formData.salarioBrutoAnual,
          fechaInicioEmpleoActual: formData.fechaInicioEmpleoActual,
          empresaActual: formData.empresaActual,
          puestoActual: formData.puestoActual,
        },
      });
      setImageFile(null);
      setStatus("Cambios guardados.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const handleSalaryFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSalaryForm((prev) => ({ ...prev, [id]: value }));
  };

  const loadSalaryList = () => {
    fetchSalaryHistory()
      .then(setSalaryEntries)
      .catch(() => setSalaryError("Error al actualizar"));
  };

  const handleSalarySubmit = async () => {
    const fromDate = salaryForm.fromDate.trim();
    const amount = parseFloat(salaryForm.amount);
    if (!fromDate) {
      setSalaryError("La fecha desde es obligatoria");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setSalaryError("El importe debe ser un número positivo");
      return;
    }
    setSalaryError(null);
    setSalarySaving(true);
    try {
      const toDate = salaryForm.toDate.trim() || null;
      const note = salaryForm.note.trim() || undefined;
      if (editingSalaryId) {
        await updateSalaryEntry(editingSalaryId, {
          fromDate,
          toDate: toDate ?? undefined,
          amount,
          note: note || null,
        });
        setEditingSalaryId(null);
      } else {
        await createSalaryEntry({
          fromDate,
          toDate: toDate ?? undefined,
          amount,
          note: note || null,
        });
      }
      setSalaryForm({ fromDate: "", toDate: "", amount: "", note: "" });
      loadSalaryList();
    } catch (err) {
      setSalaryError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSalarySaving(false);
    }
  };

  const handleEditSalary = (entry: SalaryEntry) => {
    setEditingSalaryId(entry.id);
    setSalaryForm({
      fromDate: entry.fromDate,
      toDate: entry.toDate ?? "",
      amount: String(entry.amount),
      note: entry.note ?? "",
    });
  };

  const handleCancelEditSalary = () => {
    setEditingSalaryId(null);
    setSalaryForm({ fromDate: "", toDate: "", amount: "", note: "" });
  };

  const handleDeleteSalary = async (id: string) => {
    try {
      await deleteSalaryEntry(id);
      loadSalaryList();
    } catch {
      setSalaryError("No se pudo eliminar");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      const { clearSession } = await import("@/lib/auth");
      clearSession();
      router.replace("/");
    } catch {
      const { clearSession } = await import("@/lib/auth");
      clearSession();
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const session = typeof window !== "undefined" ? getSession() : null;
  const initials = session ? getInitials(session.user.name) : "?";

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 min-w-0">
      <DashboardPageHeader
        eyebrow="Cuenta"
        title="Perfil"
        description="Gestiona tu foto, datos personales y laborales para analíticas y seguimiento."
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Datos personales</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Avatar className="h-28 w-28">
                <AvatarImage src={imagePreview ?? undefined} alt="Foto de perfil" />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Cambiar foto
              </Button>
            </div>
            <div className="flex-1 grid gap-4 sm:grid-cols-2 w-full min-w-0">
              <Input
                id="nombre"
                label="Nombre"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={handleInputChange}
              />
              <Input
                id="apellidos"
                label="Apellidos"
                placeholder="Tus apellidos"
                value={formData.apellidos}
                onChange={handleInputChange}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="sm:col-span-2"
              />
              <Input
                id="telefono"
                label="Teléfono"
                type="tel"
                placeholder="+34 600 000 000"
                value={formData.telefono}
                onChange={handleInputChange}
                className="sm:col-span-2"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            {status && (
              <span className="text-sm text-muted-foreground self-center">{status}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Datos laborales</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Opcional. Sirve para analíticas y seguimiento de aumentos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="salarioBrutoAnual"
              label="Salario bruto anual actual (€)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej. 35000,50"
              value={formData.salarioBrutoAnual}
              onChange={handleInputChange}
            />
            <Input
              id="fechaInicioEmpleoActual"
              label="Fecha inicio empleo actual"
              type="date"
              value={formData.fechaInicioEmpleoActual}
              onChange={handleInputChange}
            />
            <Input
              id="empresaActual"
              label="Empresa actual"
              placeholder="Nombre de la empresa"
              value={formData.empresaActual}
              onChange={handleInputChange}
              className="sm:col-span-2"
            />
            <Input
              id="puestoActual"
              label="Puesto actual"
              placeholder="Ej. Desarrollador senior"
              value={formData.puestoActual}
              onChange={handleInputChange}
              className="sm:col-span-2"
            />
          </div>

          <details className="group mt-4 border border-border rounded-lg overflow-hidden">
            <summary className="flex items-center gap-2 list-none cursor-pointer px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
              <span className="font-medium">Evolución salarial</span>
              {salaryEntries.length > 0 && (
                <span className="text-xs text-muted-foreground">({salaryEntries.length} entradas)</span>
              )}
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border">
              {salaryError && (
                <p className="text-sm text-destructive" role="alert">
                  {salaryError}
                </p>
              )}
              {salaryLoading ? (
                <p className="text-sm text-muted-foreground">Cargando historial…</p>
              ) : salaryEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay entradas. Añade la primera para ver tu progresión.</p>
              ) : (
                <>
                  <SalaryTotals entries={salaryEntries} />
                  <ul className="space-y-2">
                  {salaryEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/30"
                    >
                      <div className="min-w-0">
                        <span className="text-sm">
                          Desde {formatDateYmd(entry.fromDate)} –{" "}
                          {entry.toDate ? `Hasta ${formatDateYmd(entry.toDate)}` : "Actual"}
                          : {formatCurrency(entry.amount)}/año
                        </span>
                        {entry.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditSalary(entry)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSalary(entry.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                </>
              )}

              {salaryEntries.length > 0 && (
                <SalaryEvolutionChart entries={salaryEntries} />
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="fromDate" className="text-xs text-muted-foreground">
                    Desde (fecha)
                  </label>
                  <input
                    id="fromDate"
                    type="date"
                    value={salaryForm.fromDate}
                    onChange={handleSalaryFormChange}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="toDate" className="text-xs text-muted-foreground">
                    Hasta (opcional)
                  </label>
                  <input
                    id="toDate"
                    type="date"
                    value={salaryForm.toDate}
                    onChange={handleSalaryFormChange}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[7rem]">
                  <label htmlFor="amount" className="text-xs text-muted-foreground">
                    Importe bruto anual (€)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min={0}
                    value={salaryForm.amount}
                    onChange={handleSalaryFormChange}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="note" className="text-xs text-muted-foreground">
                    Nota (opcional)
                  </label>
                  <input
                    id="note"
                    type="text"
                    placeholder="Ej. Promoción"
                    value={salaryForm.note}
                    onChange={handleSalaryFormChange}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSalarySubmit}
                  disabled={salarySaving || !salaryForm.fromDate || !salaryForm.amount}
                >
                  {salarySaving ? "Guardando…" : editingSalaryId ? "Guardar cambios" : "Añadir actualización"}
                </Button>
                {editingSalaryId && (
                  <Button type="button" size="sm" variant="outline" onClick={handleCancelEditSalary}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </details>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-border mt-4">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              {saving ? "Guardando…" : "Guardar datos laborales"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Cerrar sesión te llevará a la página de inicio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
