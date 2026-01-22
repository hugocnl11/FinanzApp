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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const onLogin = async (data: LoginValues) => {
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <Card className="w-full max-w-[420px] p-6 sm:p-8">
        {/* Logo placeholder */}
        <div className="w-12 h-12 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-bold select-none">
          FZ
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground text-center">
            Accede a tu cuenta para continuar
          </p>
        </div>

        <div className="grid gap-3 mb-4">
          <Button variant="outline" className="w-full">
            Continuar con Google
          </Button>
          <Button variant="outline" className="w-full">
            Continuar con GitHub
          </Button>
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
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                {...register("remember")}
              />
              Recuérdame
            </label>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
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
          <div className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-purple-600 hover:text-purple-500 dark:text-purple-400 font-medium">
              Regístrate
            </Link>
          </div>
        </motion.form>
      </Card>
    </div>
  );
}
