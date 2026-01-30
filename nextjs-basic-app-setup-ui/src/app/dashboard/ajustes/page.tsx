"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
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
import { Bell, Shield, Database, Download, Upload, User, Mail, Globe, Moon, Sun, Target, DollarSign, Calendar, Wallet, Link2 } from "lucide-react";
import { useTheme } from "next-themes";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { isDemoUser } from "@/lib/auth";

export default function AjustesPage() {
  const router = useRouter();

  useEffect(() => {
    if (isDemoUser()) {
      router.replace("/dashboard");
    }
  }, [router]);
  const { theme, setTheme } = useTheme();
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
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  useEffect(() => {
    const stored = loadFromStorage(
      "settings",
      null as null | {
        formData: typeof formData;
        idioma: string;
        notificaciones: boolean;
        moneda: string;
        inicioSemana: string;
      }
    );
    if (stored) {
      setFormData(stored.formData);
      setIdioma(stored.idioma);
      setNotificaciones(stored.notificaciones);
      setMoneda(stored.moneda ?? "EUR");
      setInicioSemana(stored.inicioSemana ?? "Lunes");
    }
  }, []);

  useEffect(() => {
    saveToStorage("settings", { formData, idioma, notificaciones, moneda, inicioSemana });
  }, [formData, idioma, notificaciones, moneda, inicioSemana]);

  const handleExportData = () => {
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

  const handlePasswordChange = () => {
    if (!passwordForm.current || !passwordForm.next) return;
    if (passwordForm.next !== passwordForm.confirm) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    alert("Contraseña actualizada");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSave = () => {
    // Aquí iría la lógica para guardar
    console.log("Guardando:", formData);
    alert("Cambios guardados");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura tu cuenta y preferencias
        </p>
      </div>

      {/* Categorías y Objetivos - Movidos arriba */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-lg">Objetivos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <GoalsManager />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-500" />
              <CardTitle className="text-lg">Presupuestos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <BudgetManager triggerLabel="Gestionar Presupuestos" />
          </CardContent>
        </Card>
      </div>

      {/* Perfil y Preferencias agrupados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Perfil */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Perfil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
            />
            <Input 
              id="telefono" 
              label="Teléfono" 
              type="tel" 
              placeholder="+34 600 000 000" 
              value={formData.telefono}
              onChange={handleInputChange}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setFormData({ nombre: "", apellidos: "", email: "", telefono: "" })}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>Guardar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-lg">Preferencias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Modo oscuro</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? "Desactivar" : "Activar"}
              </Button>
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
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Notificaciones</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setNotificaciones(!notificaciones)}
              >
                {notificaciones ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integraciones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-lg">Integraciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <NotionIntegrationManager />
        </CardContent>
      </Card>

      {/* Seguridad y Datos agrupados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Seguridad */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
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
              <Button variant="outline" size="sm">Activar</Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Sesiones activas</span>
              <Button variant="outline" size="sm">Ver Sesiones</Button>
            </div>
          </CardContent>
        </Card>

        {/* Datos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-lg">Datos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Exportar datos</span>
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Importar datos</span>
              <Button variant="outline" size="sm">
                <Upload className="h-3 w-3 mr-1" />
                Importar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Eliminar cuenta</span>
              <Button variant="destructive" size="sm">Eliminar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
