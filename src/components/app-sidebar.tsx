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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarLogo } from "@/components/brand/SidebarLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PieChart, BarChart2, Wallet, Target, Settings, User, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { getSession, isDemoUser } from "@/lib/auth";

const allItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Activos", url: "/dashboard/activos", icon: PieChart },
  { title: "Objetivos", url: "/dashboard/objetivos", icon: Target },
  { title: "Movimientos", url: "/dashboard/movimientos", icon: List },
  { title: "Presupuestos", url: "/dashboard/presupuestos", icon: Wallet },
  { title: "Compras", url: "/dashboard/compras", icon: ShoppingBag },
  { title: "Gráficas", url: "/dashboard/graficas", icon: BarChart2 },
  { title: "Perfil", url: "/dashboard/perfil", icon: User },
  { title: "Ajustes", url: "/dashboard/ajustes", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("Usuario");
  const [userEmail, setUserEmail] = useState("usuario@finanzapp.com");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = () => {
      const session = getSession();
      if (session) {
        setUserName(session.user.name);
        setUserEmail(session.user.email);
        setUserImage(session.user.image);
        setIsDemo(isDemoUser());
      } else {
        setUserName("Usuario");
        setUserEmail("usuario@finanzapp.com");
        setUserImage(undefined);
        setIsDemo(false);
      }
    };
    load();
    window.addEventListener("finanzapp:auth-changed", load);
    return () => window.removeEventListener("finanzapp:auth-changed", load);
  }, []);

  const initials = userName ? (userName.trim().split(/\s+/).length >= 2
    ? (userName.trim().split(/\s+/)[0][0] + userName.trim().split(/\s+/).pop()![0]).toUpperCase()
    : userName.slice(0, 2).toUpperCase()) : "?";

  const items = isDemo ? allItems.filter(item => item.title !== "Ajustes") : allItems;
  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border bg-sidebar">
        <div
          className={`flex flex-col items-center gap-1.5 px-3 pt-3 group-data-[collapsible=icon]:justify-center ${isDemo ? "pb-2" : "pb-3"}`}
        >
          <div className="flex items-center justify-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
            <SidebarLogo />
          </div>
          {isDemo && (
            <span
              className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 group-data-[collapsible=icon]:hidden"
              aria-label="Modo demo"
            >
              Demo
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4" role="navigation" aria-label="Navegación principal">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="group relative rounded-lg transition-colors hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-0.5 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border bg-sidebar p-4">
        <Link href="/dashboard/perfil" className="flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <Avatar className="h-8 w-8 shrink-0 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium text-sidebar-foreground">{userName}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">{userEmail}</span>
          </div>
        </Link>
        <div className="mt-3 border-t border-border pt-3 group-data-[collapsible=icon]:hidden">
          <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} FinanzApp</div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
