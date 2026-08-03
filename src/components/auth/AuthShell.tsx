import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-40 dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 90% 55% at 20% -15%, hsl(162 42% 42% / 0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, hsl(200 35% 50% / 0.12), transparent 45%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "linear-gradient(180deg, black, transparent 55%)",
          }}
        />
      </div>

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
