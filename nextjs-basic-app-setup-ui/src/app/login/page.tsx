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
import { login } from "@/lib/api/auth";
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const onLogin = async (data: LoginValues) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:45',message:'onLogin entry',data:{email:data.email,passwordLength:data.password?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      const response = await login({ email: data.email, password: data.password });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:48',message:'onLogin success',data:{hasResponse:!!response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      saveSession(response.data);
      router.push("/dashboard");
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:52',message:'onLogin error',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Credenciales inválidas")) {
        setStatusMessage("Credenciales incorrectas o cuenta no registrada. ¿No tienes cuenta? Regístrate aquí.");
      } else if (errorMessage.includes("Email no verificado")) {
        setStatusMessage("Por favor, verifica tu email antes de iniciar sesión.");
      } else {
        setStatusMessage("No se pudo iniciar sesión. Verifica tus credenciales o tu email.");
      }
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
          <h1 className="text-2xl font-bold text-center mb-2">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground text-center">
            Accede a tu cuenta para continuar
          </p>
        </div>

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
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ¿Olvidaste la contraseña?
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recuperar contraseña</DialogTitle>
                  <DialogDescription>
                    Te enviaremos un enlace de recuperación por correo.
                  </DialogDescription>
                </DialogHeader>
                <Input label="Email" type="email" placeholder="tu@email.com" />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button>Enviar enlace</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Entrar
          </Button>
          {statusMessage && (
            <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
          )}
          <div className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-blue-600 hover:text-green-600 dark:text-blue-400 dark:hover:text-green-400 font-medium">
              Regístrate
            </Link>
          </div>
        </motion.form>
      </Card>
    </div>
  );
}
