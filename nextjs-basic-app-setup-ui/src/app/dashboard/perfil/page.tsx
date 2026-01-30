"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Camera } from "lucide-react";
import { getSession, updateSessionUser } from "@/lib/auth";
import { updateProfile, logout } from "@/lib/api/auth";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      null as null | { formData: { telefono?: string } }
    );
    setFormData({
      nombre,
      apellidos,
      email: email ?? "",
      telefono: stored?.formData?.telefono ?? "",
    });
    if (image) setImagePreview(image);
  }, [router]);

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
        formData: { ...formData, telefono: formData.telefono },
      });
      setImageFile(null);
      setStatus("Cambios guardados.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu foto y datos personales
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Datos personales</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-24 w-24">
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
            <div className="flex-1 grid gap-3 sm:grid-cols-2 w-full">
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
          <div className="flex flex-wrap gap-2 pt-2">
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
