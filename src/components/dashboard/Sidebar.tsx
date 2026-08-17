"use client";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Activos", href: "/dashboard/activos" },
  { label: "Objetivos", href: "/dashboard/objetivos" },
  { label: "Movimientos", href: "/dashboard/movimientos" },
  { label: "Presupuestos", href: "/dashboard/presupuestos" },
  { label: "Compras", href: "/dashboard/compras" },
  { label: "Gráficas", href: "/dashboard/graficas" },
  { label: "Ajustes", href: "/dashboard/ajustes" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-56 h-screen bg-[#fafafa] dark:bg-[#18181b] p-6 gap-6 fixed left-0 top-0 z-20 shadow-sm border-0">
      <div className="flex items-center gap-3 mb-2">
        <Avatar>
          <span className="bg-gray-900 dark:bg-white text-white dark:text-black rounded-full w-10 h-10 flex items-center justify-center font-bold">FZ</span>
        </Avatar>
        <span className="font-bold text-lg text-foreground">FinanzApp</span>
      </div>
      <Separator className="bg-gray-200 dark:bg-gray-800" />
      <nav className="flex flex-col gap-2 mt-2">
        {menu.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg font-medium transition-colors
                ${active ?
                  'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' :
                  'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <Separator className="bg-gray-200 dark:bg-gray-800" />
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} FinanzApp</div>
        <ThemeToggle />
      </div>
    </aside>
  );
} 