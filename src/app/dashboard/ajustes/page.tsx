"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { NotionIntegrationManager } from "@/components/dashboard/NotionIntegrationManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Shield, Database, Download, Upload, Mail, Globe, Sun, DollarSign, Calendar, Link2, ChevronRight } from "lucide-react";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { isDemoUser, updateSessionUser, clearSession } from "@/lib/auth";
import { updateProfile, fetch2FAStatus, setup2FA, verify2FASetup, disable2FA } from "@/lib/api/auth";
import type { UserPreferences } from "@/lib/api/types";
import { useTheme } from "next-themes";

type SessionItem = { id: string; current: boolean; userAgent?: string; createdAt: string };

function TwoFASection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "qr" | "verify">("idle");
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl?: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoUser()) return;
    fetch2FAStatus()
      .then((r) => setEnabled(r.data?.enabled ?? false))
      .catch(() => setEnabled(false));
  }, []);

  const handleActivate = async () => {
    setOpen(true);
    setStep("qr");
    setSetupData(null);
    setCode("");
    setMessage(null);
    setLoading(true);
    try {
      const res = await setup2FA();
      const data = res.data as { secret: string; qrDataUrl?: string };
      setSetupData({ secret: data.secret, qrDataUrl: data.qrDataUrl });
    } catch {
      setMessage("No se pudo iniciar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData?.secret || !code.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await verify2FASetup(setupData.secret, code.trim());
      setEnabled(true);
      setOpen(false);
      setStep("idle");
      setSetupData(null);
      setCode("");
    } catch {
      setMessage("Código incorrecto. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("¿Desactivar la autenticación en dos pasos?")) return;
    setLoading(true);
    try {
      await disable2FA();
      setEnabled(false);
    } catch {
      setMessage("No se pudo desactivar.");
    } finally {
      setLoading(false);
    }
  };

  if (enabled === null) return <Button variant="outline" size="sm" disabled>Cargando…</Button>;
  if (enabled) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleDisable} disabled={loading}>
          {loading ? "Desactivando…" : "Desactivar"}
        </Button>
        {message && <span className="text-xs text-rose-500">{message}</span>}
      </div>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={handleActivate}>
        Activar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar 2FA</DialogTitle>
            <DialogDescription>
              Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.) e introduce el código de 6 dígitos.
            </DialogDescription>
          </DialogHeader>
          {step === "qr" && setupData && (
            <form onSubmit={handleVerifySetup} className="space-y-4">
              {setupData.qrDataUrl && (
                <div className="flex justify-center">
                  <img src={setupData.qrDataUrl} alt="QR 2FA" className="w-48 h-48 rounded border" />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Clave manual: <code className="bg-muted px-1 rounded">{setupData.secret}</code>
              </p>
              <Input
                label="Código de 6 dígitos"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
              {message && <p className="text-sm text-rose-500">{message}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || code.length !== 6}>
                  {loading ? "Verificando…" : "Activar 2FA"}
                </Button>
              </DialogFooter>
            </form>
          )}
          {step === "qr" && !setupData && loading && <p className="text-sm text-muted-foreground text-center">Cargando…</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionsSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/sessions", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((res) => setSessions(res.data ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [open]);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE", credentials: "include" });
      const data = res.ok ? await res.json() : null;
      if (data?.data?.wasCurrent) {
        clearSession();
        router.replace("/login");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">Ver Sesiones</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sesiones activas</SheetTitle>
          <SheetDescription>
            Dispositivos o navegadores donde has iniciado sesión. Revoca las que no reconozcas.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!loading && sessions.length === 0 && <p className="text-sm text-muted-foreground">No hay sesiones.</p>}
          {!loading && sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border p-3 bg-card"
            >
              <div>
                <p className="text-sm font-medium">
                  {s.current && <span className="text-primary mr-2">(Actual)</span>}
                  {s.userAgent || "Sesión"} · {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={revoking === s.id}
                onClick={() => revoke(s.id)}
              >
                {revoking === s.id ? "Revocando…" : s.current ? "Cerrar esta sesión" : "Revocar"}
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AjustesPage() {
  const router = useRouter();
  const { setTheme: setThemeProvider } = useTheme();
  const importDataInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isDemoUser()) {
      router.replace("/dashboard");
    }
  }, [router]);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
  });
  const [idioma, setIdioma] = useState("Español");
  const [notificaciones, setNotificaciones] = useState(true);
  const [moneda, setMoneda] = useState("EUR");
  const [inicioSemana, setInicioSemana] = useState("Lunes");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const prefsToPayload = useCallback(
    (): UserPreferences => ({
      theme,
      language: idioma,
      currency: moneda,
      weekStartsOn: inicioSemana,
      notifications: notificaciones,
    }),
    [theme, idioma, moneda, inicioSemana, notificaciones]
  );

  const savePreferencesToApi = useCallback(async () => {
    if (isDemoUser()) return;
    try {
      const prefs = prefsToPayload();
      const res = await updateProfile({ preferences: prefs });
      if (res?.data?.user?.preferences) {
        updateSessionUser({ preferences: res.data.user.preferences });
      }
    } catch {
      // Silently fail; user can retry from Ajustes
    }
  }, [prefsToPayload]);

  useEffect(() => {
    const stored = loadFromStorage(
      "settings",
      null as null | {
        formData: typeof formData;
        idioma: string;
        notificaciones: boolean;
        moneda: string;
        inicioSemana: string;
        theme?: "light" | "dark" | "system";
      }
    );
    if (stored) {
      setFormData(stored.formData ?? formData);
      setIdioma(stored.idioma ?? "Español");
      setNotificaciones(stored.notificaciones ?? true);
      setMoneda(stored.moneda ?? "EUR");
      setInicioSemana(stored.inicioSemana ?? "Lunes");
      if (stored.theme) setTheme(stored.theme);
    }
  }, []);

  useEffect(() => {
    if (isDemoUser()) {
      setPrefsLoaded(true);
      return;
    }
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setPrefsLoaded(true);
        return;
      }
      const json = await res.json();
      const prefs = json?.data?.user?.preferences as UserPreferences | undefined;
      if (prefs) {
        if (prefs.language) setIdioma(prefs.language);
        if (prefs.currency) setMoneda(prefs.currency);
        if (prefs.weekStartsOn) setInicioSemana(prefs.weekStartsOn);
        if (typeof prefs.notifications === "boolean") setNotificaciones(prefs.notifications);
        if (prefs.theme) setTheme(prefs.theme);
      }
      setPrefsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    saveToStorage("settings", { formData, idioma, notificaciones, moneda, inicioSemana, theme });
  }, [formData, idioma, notificaciones, moneda, inicioSemana, theme]);

  useEffect(() => {
    if (!prefsLoaded || isDemoUser()) return;
    savePreferencesToApi();
  }, [theme, idioma, moneda, inicioSemana, notificaciones, prefsLoaded, savePreferencesToApi]);

  const handleExportData = () => {
    if (!isDemoUser()) {
      fetch("/api/user/data/export", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((res) => {
          const data = res.data ?? {};
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `finanzapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(link.href);
        })
        .catch(() => alert("No se pudo exportar. Inicia sesión e inténtalo de nuevo."));
      return;
    }
    const data = {
      settings: { formData, idioma, notificaciones, moneda, inicioSemana },
      movements: loadFromStorage("movimientos", []),
      categories: loadFromStorage("categories", []),
      budgets: loadFromStorage("budgets", []),
      goals: loadFromStorage("goals", []),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "finanzapp-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = confirm("¿Reemplazar todos los datos actuales? (Cancelar = fusionar con los existentes)") ? "replace" : "merge";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result as string;
        const parsed = JSON.parse(raw);
        const data = parsed.data ?? parsed;
        if (!data || typeof data !== "object") {
          alert("El archivo no tiene el formato esperado.");
          return;
        }
        fetch("/api/user/data/restore", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, mode }),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then(() => {
            alert("Datos restaurados correctamente.");
            window.dispatchEvent(new Event("finanzapp:data-updated"));
          })
          .catch(() => alert("No se pudo restaurar. Revisa el formato del archivo."));
      } catch {
        alert("El archivo no es un JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportMovementsCsv = async () => {
    try {
      const res = await fetch("/api/movements/export?format=csv", { credentials: "include" });
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("No se pudo exportar. Inicia sesión e inténtalo de nuevo.");
    }
  };

  const handlePasswordChange = () => {
    if (!passwordForm.current || !passwordForm.next) return;
    if (passwordForm.next !== passwordForm.confirm) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    alert("Contraseña actualizada");
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura tu cuenta y preferencias
        </p>
      </div>

      {/* Categorías */}
      <div className="grid grid-cols-1 gap-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-lg">Categorías</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryManager />
          </CardContent>
        </Card>
      </div>

      {/* Preferencias, Seguridad y Datos en una fila */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sun className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-lg">Preferencias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tema</span>
              </div>
              <select
                className="px-2 py-1 text-sm border rounded bg-background"
                value={theme}
                onChange={(e) => {
                  const v = e.target.value as "light" | "dark" | "system";
                  setTheme(v);
                  setThemeProvider(v);
                }}
              >
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Idioma</span>
              </div>
              <select 
                className="px-2 py-1 text-sm border rounded bg-background"
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
              >
                <option>Español</option>
                <option>English</option>
                <option>Français</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Moneda</span>
              </div>
              <select
                className="px-2 py-1 text-sm border rounded bg-background"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Inicio de semana</span>
              </div>
              <select
                className="px-2 py-1 text-sm border rounded bg-background"
                value={inicioSemana}
                onChange={(e) => setInicioSemana(e.target.value)}
              >
                <option>Lunes</option>
                <option>Domingo</option>
              </select>
            </div>
          </CardContent>
        </Card>

      {/* Seguridad */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Shield className="h-4 w-4 text-red-500" />
              <CardTitle className="text-lg">Seguridad</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Cambiar Contraseña</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Cambiar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Actualizar contraseña</DialogTitle>
                    <DialogDescription>
                      Introduce tu contraseña actual y la nueva contraseña.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      label="Contraseña actual"
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, current: e.target.value }))
                      }
                    />
                    <Input
                      label="Nueva contraseña"
                      type="password"
                      value={passwordForm.next}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, next: e.target.value }))
                      }
                    />
                    <Input
                      label="Confirmar nueva contraseña"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))
                      }
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handlePasswordChange}>Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Autenticación 2FA</span>
              {!isDemoUser() && <TwoFASection />}
              {isDemoUser() && <Button variant="outline" size="sm" disabled>Activar</Button>}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Sesiones activas</span>
              {!isDemoUser() && (
                <SessionsSheet />
              )}
              {isDemoUser() && <Button variant="outline" size="sm" disabled>Ver Sesiones</Button>}
            </div>
          </CardContent>
        </Card>

        {/* Datos */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-lg">Datos</CardTitle>
              <span className="text-xs font-medium text-red-500">EN DESARROLLO</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Exportar movimientos (CSV)</span>
              <Button variant="outline" size="sm" onClick={handleExportMovementsCsv}>
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Exportar datos (respaldo JSON)</span>
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Importar datos</span>
              {!isDemoUser() && (
                <>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    ref={importDataInputRef}
                    onChange={handleImportData}
                  />
                  <Button variant="outline" size="sm" type="button" onClick={() => importDataInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" />
                    Importar
                  </Button>
                </>
              )}
              {isDemoUser() && <Button variant="outline" size="sm" disabled><Upload className="h-3 w-3 mr-1" /> Importar</Button>}
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Eliminar cuenta</span>
              <Button variant="destructive" size="sm">Eliminar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integraciones */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-lg">Integraciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <details className="group rounded-lg border border-border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden touch-manipulation">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white dark:bg-white/95 border border-border p-1.5">
                <img
                  src="https://cdn.simpleicons.org/notion"
                  alt="Notion"
                  width={20}
                  height={20}
                  className="size-5"
                />
              </span>
              <span className="text-sm font-medium">Notion</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-90 transition-transform" />
            </summary>
            <div className="border-t border-border px-4 py-3">
              <NotionIntegrationManager />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
