"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { SidebarLogo } from "@/components/brand/SidebarLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, BarChart2, Settings } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Movimientos", url: "/dashboard/movimientos", icon: List },
  { title: "Gráficas", url: "/dashboard/graficas", icon: BarChart2 },
  { title: "Ajustes", url: "/dashboard/ajustes", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 bg-gradient-to-br from-sidebar/80 via-sidebar/50 to-sidebar/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-3 py-4">
          <SidebarLogo />
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="group relative rounded-lg transition-all duration-300 ease-out hover:bg-sidebar-accent/80 hover:scale-[1.02] data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-sm data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-6 data-[active=true]:before:w-1 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-primary"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 bg-gradient-to-br from-sidebar/80 via-sidebar/50 to-sidebar/80 backdrop-blur-md p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
          <Avatar className="h-8 w-8">
            <span className="bg-gradient-to-br from-primary to-primary/60 text-white text-xs font-bold flex items-center justify-center h-full w-full rounded-full">
              FZ
            </span>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-foreground">Usuario</span>
            <span className="text-xs text-sidebar-foreground/60">usuario@finanzapp.com</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/40 group-data-[collapsible=icon]:hidden">
          <div className="text-xs text-sidebar-foreground/50">© 2024 FinanzApp</div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
} 