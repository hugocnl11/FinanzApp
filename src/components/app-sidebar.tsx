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
import { Home, List, BarChart2, Wallet, Target, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getSession, isDemoUser } from "@/lib/auth";

const allItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Movimientos", url: "/dashboard/movimientos", icon: List },
  { title: "Presupuestos", url: "/dashboard/presupuestos", icon: Wallet },
  { title: "Objetivos", url: "/dashboard/objetivos", icon: Target },
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

  // Filtrar items: si es demo, ocultar Ajustes
  const items = isDemo ? allItems.filter(item => item.title !== "Ajustes") : allItems;
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 bg-gradient-to-br from-sidebar/80 via-sidebar/50 to-sidebar/80 backdrop-blur-md">
        <div className="flex items-center justify-center gap-3 px-3 py-4 group-data-[collapsible=icon]:justify-center">
          <SidebarLogo />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4" role="navigation" aria-label="Navegación principal">
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
        <Link href="/dashboard/perfil" className="flex items-center gap-3 rounded-lg p-1 -m-1 hover:bg-sidebar-accent/50 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <Avatar className="h-8 w-8 shrink-0 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-sidebar-foreground truncate">{userName}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</span>
          </div>
        </Link>
        <div className="mt-3 pt-3 border-t border-border/40 group-data-[collapsible=icon]:hidden">
          <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} FinanzApp</div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
} 