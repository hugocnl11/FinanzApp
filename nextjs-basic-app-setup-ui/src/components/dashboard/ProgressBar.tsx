import { Card } from "@/components/ui/card";

export function ProgressBar() {
  // Ejemplo de datos
  const objetivo = 1000;
  const ahorrado = 650;
  const porcentaje = (ahorrado / objetivo) * 100;

  return (
    <Card className="p-6 flex flex-col space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Progreso de Ahorro</h3>
      <div className="text-2xl font-bold">{ahorrado.toLocaleString()} € / {objetivo.toLocaleString()} €</div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{porcentaje.toFixed(1)}% del objetivo mensual</div>
    </Card>
  );
} 