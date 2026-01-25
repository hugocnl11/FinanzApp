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
import { Progress } from "@/components/ui/progress";
import { register as registerUser } from "@/lib/api/auth";
import { AppLogo } from "@/components/brand/AppLogo";

const registerSchema = z
  .object({
    name: z.string().min(2, "Introduce tu nombre"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string().min(6, "Confirma tu contraseña"),
    terms: z.literal(true, { errorMap: () => ({ message: "Acepta los Términos" }) }),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  const passwordValue = watch("password", "");

  const onRegister = async (data: RegisterValues) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setStatusMessage("Te enviamos un correo para verificar tu cuenta. Revisa tu bandeja.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      console.error(error);
      setStatusMessage("No se pudo crear la cuenta. Verifica los datos o intenta más tarde.");
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
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
          <h1 className="text-2xl font-bold text-center mb-2">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground text-center">
            Regístrate para comenzar a gestionar tus finanzas
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit(onRegister)}
          className="space-y-5"
        >
          <Input
            label="Nombre"
            type="text"
            autoComplete="name"
            {...register("name")}
            error={errors.name?.message}
          />
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
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fortaleza de contraseña</span>
              <span>{getPasswordStrength(passwordValue)}%</span>
            </div>
            <Progress value={getPasswordStrength(passwordValue)} />
            <p className="text-xs text-muted-foreground">
              Usa mayúsculas, números y símbolos para mejorar la seguridad.
            </p>
          </div>
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
            error={errors.confirm?.message}
          />
          <div>
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                {...register("terms")}
              />
              <span>
                Acepto los{" "}
                <Link href="#" className="text-blue-600 hover:text-green-600 dark:text-blue-400 dark:hover:text-green-400">
                  Términos y Condiciones
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="text-sm text-red-500 mt-1" role="alert">
                {errors.terms.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Crear cuenta
          </Button>
          {statusMessage && (
            <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
          )}
          <div className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-blue-600 hover:text-green-600 dark:text-blue-400 dark:hover:text-green-400 font-medium">
              Inicia sesión
            </Link>
          </div>
        </motion.form>
      </Card>
    </div>
  );
}
