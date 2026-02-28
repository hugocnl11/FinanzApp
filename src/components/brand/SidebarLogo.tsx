"use client";

import { AppLogo } from "./AppLogo";

interface SidebarLogoProps {
  collapsed?: boolean;
}

export function SidebarLogo({ collapsed = false }: SidebarLogoProps) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center">
      <AppLogo 
        size="md" 
        showText={false}
        variant="minimal"
        className="shrink-0"
      />
      {/* Text - Hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
          <span className="font-bold text-lg text-foreground truncate">
            FinanzApp
          </span>
          <span className="text-[10px] text-sidebar-foreground/60 tracking-wide">
            Gestión Inteligente
          </span>
        </div>
      )}
    </div>
  );
}
