"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  type: "success" | "warning" | "info";
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "not-1",
    title: "Presupuesto al 80%",
    description: "Comida está al 82% del límite mensual.",
    type: "warning",
    read: false,
  },
  {
    id: "not-2",
    title: "Objetivo completado",
    description: "Has alcanzado tu meta de ahorro mensual.",
    type: "success",
    read: false,
  },
  {
    id: "not-3",
    title: "Crecimiento positivo",
    description: "Tus ingresos crecieron un 6% este mes.",
    type: "info",
    read: true,
  },
];

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: TrendingUp,
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        className="relative"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 mt-2 w-80 border border-border p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Notificaciones</p>
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Marcar todo como leído
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type];
              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 rounded-lg border px-3 py-2 text-sm ${
                    notification.read ? "border-border/40 text-muted-foreground" : "border-border"
                  }`}
                >
                  <div className="mt-1">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-xs">{notification.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
