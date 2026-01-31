"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { login, resendVerification, verify2FALogin } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth";
import { AppLogo } from "@/components/brand/AppLogo";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code2FA, setCode2FA] = useState("");
  const [submitting2FA, setSubmitting2FA] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const emailValue = watch("email");

  const onLogin = async (data: LoginValues) => {
    setShowResendVerification(false);
    setShow2FA(false);
    setTempToken(null);
    try {
      const response = await login({ email: data.email, password: data.password });
      const dataRes = response.data as { requires2FA?: boolean; tempToken?: string; token?: string; user?: unknown };
      if (dataRes.requires2FA && dataRes.tempToken) {
        setTempToken(dataRes.tempToken);
        setShow2FA(true);
        setStatusMessage(null);
        return;
      }
      saveSession(response.data as { token: string; user: unknown });
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Credenciales inválidas")) {
        setStatusMessage("Credenciales incorrectas o cuenta no registrada. ¿No tienes cuenta? Regístrate aquí.");
      } else if (errorMessage.includes("Email no verificado")) {
        setStatusMessage("Por favor, verifica tu email antes de iniciar sesión. Si el enlace caducó, puedes pedir uno nuevo.");
        setShowResendVerification(true);
      } else {
        setStatusMessage("No se pudo iniciar sesión. Verifica tus credenciales o tu email.");
      }
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken || !code2FA.trim()) return;
    setSubmitting2FA(true);
    setStatusMessage(null);
    try {
      const response = await verify2FALogin(tempToken, code2FA.trim());
      saveSession(response.data as { token: string; user: unknown });
      router.push("/dashboard");
    } catch {
      setStatusMessage("Código incorrecto o expirado. Vuelve a iniciar sesión.");
    } finally {
      setSubmitting2FA(false);
    }
  };

  const onResendVerification = async () => {
    if (!emailValue?.trim()) return;
    setResending(true);
    setStatusMessage(null);
    try {
      await resendVerification(emailValue.trim());
      setStatusMessage("Te hemos enviado un nuevo correo de verificación. Revisa tu bandeja.");
      setShowResendVerification(false);
    } catch {
      setStatusMessage("No se pudo reenviar el correo. Intenta más tarde.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <AppLogo size="lg" showText={false} variant="minimal" />
          <div className="flex flex-col">
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
              FinanzApp
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wide">
              Gestión Inteligente
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">
            {show2FA ? "Código 2FA" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {show2FA ? "Introduce el código de tu aplicación de autenticación" : "Accede a tu cuenta para continuar"}
          </p>
        </div>

        {show2FA ? (
          <form onSubmit={onVerify2FA} className="space-y-5">
            <Input
              label="Código de 6 dígitos"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code2FA}
              onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
            {statusMessage && <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>}
            <Button type="submit" className="w-full" disabled={submitting2FA || code2FA.length !== 6}>
              {submitting2FA ? "Verificando…" : "Verificar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setShow2FA(false); setTempToken(null); setCode2FA(""); setStatusMessage(null); }}
            >
              Volver al inicio de sesión
            </Button>
          </form>
        ) : (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit(onLogin)}
          className="space-y-5"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                {...register("remember")}
              />
              Recuérdame
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ¿Olvidaste la contraseña?
            </Link>
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Entrar
          </Button>
          {statusMessage && (
            <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
          )}
          {showResendVerification && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resending || !emailValue?.trim()}
              onClick={onResendVerification}
            >
              {resending ? "Enviando…" : "Reenviar correo de verificación"}
            </Button>
          )}
          <div className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-blue-600 hover:text-green-600 dark:text-blue-400 dark:hover:text-green-400 font-medium">
              Regístrate
            </Link>
          </div>
        </motion.form>
        )}
      </Card>
    </div>
  );
}
