"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, isDemoUser, saveSession } from "@/lib/auth";
import { restoreSessionFromCookie } from "@/lib/api/auth";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let session = getSession();
      if (!session && !isDemoUser()) {
        const restored = await restoreSessionFromCookie();
        if (cancelled) return;
        if (restored) {
          saveSession(restored);
          session = getSession();
        }
      }
      if (cancelled) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión...
      </div>
    );
  }

  return <>{children}</>;
}
