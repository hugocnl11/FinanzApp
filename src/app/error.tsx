"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en la aplicación:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold">Algo ha fallado</h1>
        <p className="text-sm text-muted-foreground break-words">
          {error.message}
        </p>
        <p className="text-xs text-muted-foreground">
          Revisa la consola del navegador (F12 → Console) para más detalles.
        </p>
        <Button onClick={reset} variant="default">
          Intentar de nuevo
        </Button>
        <div className="pt-4">
          <a href="/" className="text-sm text-primary hover:underline">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
