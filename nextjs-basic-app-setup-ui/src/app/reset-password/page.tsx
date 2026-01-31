"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/AppLogo";
import { resetPassword } from "@/lib/api/auth";

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setStatus("error");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword || newPassword.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setStatus("success");
      setTimeout(() => router.replace("/login"), 2000);
    } catch {
      setStatus("error");
      setMessage("Enlace inválido o expirado. Solicita uno nuevo desde recuperar contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
        <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
          <p className="text-sm text-rose-500 mb-4">Falta el enlace de restablecimiento. Solicita uno nuevo.</p>
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Recuperar contraseña
          </Link>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
        <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
            Contraseña actualizada. Redirigiendo al inicio de sesión…
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Ir al login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <AppLogo size="lg" showText={false} variant="minimal" />
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
            FinanzApp
          </span>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Introduce tu nueva contraseña (mínimo 6 caracteres).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          {message && <p className="text-sm text-rose-500">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando…" : "Restablecer contraseña"}
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
          <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </Card>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
