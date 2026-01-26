"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        if (!res.ok) throw new Error("verify failed");
        setStatus("success");
        setTimeout(() => router.replace("/login"), 1500);
      } catch {
        setStatus("error");
      }
    };

    void verify();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {status === "loading" && <p className="text-sm text-muted-foreground">Verificando email...</p>}
        {status === "success" && <p className="text-sm text-emerald-600">Email verificado. Redirigiendo...</p>}
        {status === "error" && <p className="text-sm text-rose-500">Token inválido o expirado.</p>}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
