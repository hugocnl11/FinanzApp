"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppLogo } from "@/components/brand/AppLogo";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { cn } from "@/lib/utils";

export function DashboardHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 min-h-[44px] shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm md:hidden",
        "pt-[env(safe-area-inset-top)]",
        className
      )}
      aria-label="Cabecera"
    >
      <SidebarTrigger
        className="h-11 w-11 min-h-[44px] min-w-[44px] -ml-1"
        aria-label="Abrir menú"
      />
      <div className="flex flex-1 min-w-0 items-center justify-center">
        <AppLogo size="sm" showText variant="default" className="shrink-0" />
      </div>
      <div className="w-11 shrink-0 flex items-center justify-end">
        <NotificationCenter />
      </div>
    </header>
  );
}
