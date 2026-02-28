"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
import { Target } from "lucide-react";

export default function ObjetivosPage() {
  return (
    <div className="space-y-4 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">Objetivos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define metas de ahorro, gasto o ingresos y sigue tu progreso
        </p>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-lg">Gestionar Objetivos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GoalsManager />
        </CardContent>
      </Card>
    </div>
  );
}
