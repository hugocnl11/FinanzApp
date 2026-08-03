"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/AppLogo";
import { AuthShell } from "@/components/auth/AuthShell";
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
      <AuthShell>
        <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
          <p className="text-sm text-rose-500 mb-4">Falta el enlace de restablecimiento. Solicita uno nuevo.</p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:opacity-90">
            Recuperar contraseña
          </Link>
        </Card>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell>
        <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
          <p className="text-sm text-primary mb-4">
            Contraseña actualizada. Redirigiendo al inicio de sesión…
          </p>
          <Link href="/login" className="text-sm font-medium text-primary hover:opacity-90">
            Ir al login
          </Link>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <AppLogo size="lg" showText={false} variant="minimal" />
          <span className="font-bold text-xl text-foreground">
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
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </Card>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <Card className="w-full max-w-[420px] p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </Card>
        </AuthShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
