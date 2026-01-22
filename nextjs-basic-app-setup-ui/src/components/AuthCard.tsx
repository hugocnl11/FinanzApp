"use client";
import React, { useState } from "react";
import { Tabs } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

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

export function AuthCard() {
  const [tab, setTab] = useState("login");
  const router = useRouter();

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: loginLoading },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  // Register form
  const {
    register: regRegister,
    handleSubmit: handleRegSubmit,
    formState: { errors: regErrors, isSubmitting: regLoading },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  // Fake login
  const onLogin = async (data: LoginValues) => {
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/dashboard");
  };
  // Fake register
  const onRegister = async (data: RegisterValues) => {
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/welcome");
  };

  return (
    <div className="w-full max-w-[420px] bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 sm:p-8">
      {/* Logo placeholder */}
      <div className="w-12 h-12 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-bold select-none">
        FZ
      </div>
      <Tabs
        tabs={[
          { label: "Iniciar sesión", value: "login" },
          { label: "Crear cuenta", value: "register" },
        ]}
        value={tab}
        onChange={setTab}
        className="justify-center"
      />
      <AnimatePresence mode="wait">
        {tab === "login" ? (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleLoginSubmit(onLogin)}
            className="space-y-6"
            role="form"
            aria-label="Formulario de inicio de sesión"
          >
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              {...loginRegister("email")}
              error={loginErrors.email?.message}
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              {...loginRegister("password")}
              error={loginErrors.password?.message}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                  {...loginRegister("remember")}
                />
                Recuérdame
              </label>
              <a
                href="#"
                className="text-sm text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 focus:outline-none focus:underline focus:ring-2 focus:ring-purple-500/20 rounded"
              >
                ¿Olvidaste la contraseña?
              </a>
            </div>
            <Button type="submit" isLoading={loginLoading}>
              Entrar
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegSubmit(onRegister)}
            className="space-y-6"
            role="form"
            aria-label="Formulario de registro"
          >
            <Input
              label="Nombre"
              type="text"
              autoComplete="name"
              {...regRegister("name")}
              error={regErrors.name?.message}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              {...regRegister("email")}
              error={regErrors.email?.message}
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              {...regRegister("password")}
              error={regErrors.password?.message}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              {...regRegister("confirm")}
              error={regErrors.confirm?.message}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                {...regRegister("terms")}
              />
              Acepto los Términos y Condiciones
            </label>
            {regErrors.terms && (
              <p className="text-sm text-red-500" role="alert">
                {regErrors.terms.message}
              </p>
            )}
            <Button type="submit" isLoading={regLoading}>
              Crear cuenta
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
} 