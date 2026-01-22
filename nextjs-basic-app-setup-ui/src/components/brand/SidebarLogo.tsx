"use client";

interface SidebarLogoProps {
  collapsed?: boolean;
}

export function SidebarLogo({ collapsed = false }: SidebarLogoProps) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Logo Icon with Gradient */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Wallet Shape */}
          <rect x="8" y="12" width="24" height="18" rx="3" fill="url(#logo-gradient)" />
          <rect x="8" y="12" width="24" height="5" rx="2" fill="hsl(var(--primary))" />
          {/* Currency Symbol */}
          <text
            x="20"
            y="24"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="white"
          >
            €
          </text>
        </svg>
      </div>

      {/* Text - Hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
          <span className="font-bold text-lg bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/70 bg-clip-text text-transparent truncate">
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
