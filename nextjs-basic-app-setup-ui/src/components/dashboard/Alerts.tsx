import { Card } from "@/components/ui/card";

export function Alerts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6 flex flex-col space-y-2 bg-red-50 dark:bg-red-900/20">
        <div className="text-sm font-medium text-red-600 dark:text-red-400">¡Alerta!</div>
        <div className="text-xs text-muted-foreground">Has superado tu límite de gasto en Ocio este mes.</div>
      </Card>
      <Card className="p-6 flex flex-col space-y-2 bg-green-50 dark:bg-green-900/20">
        <div className="text-sm font-medium text-green-600 dark:text-green-400">Logro desbloqueado</div>
        <div className="text-xs text-muted-foreground">¡Has ahorrado más de 500 € este mes!</div>
      </Card>
    </div>
  );
} 