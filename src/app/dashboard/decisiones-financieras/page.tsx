"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const PLAZO_OPTIONS = [
  { value: "corto" as const, label: "Corto plazo", sub: "Menos de 1 año" },
  { value: "medio" as const, label: "Medio plazo", sub: "1 a 3 años" },
  { value: "largo" as const, label: "Largo plazo", sub: "Más de 3 años" },
];

type Plazo = "corto" | "medio" | "largo";

type ApiResponse =
  | { verdict: string; reasoning: string }
  | { message: string };

export default function DecisionesFinancierasPage() {
  const [question, setQuestion] = useState("");
  const [plazo, setPlazo] = useState<Plazo>("medio");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/decisiones-financieras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          plazo,
          estimatedAmount: estimatedAmount ? Number(estimatedAmount) : undefined,
        }),
      });
      const data = (await res.json()) as ApiResponse | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Error al obtener la recomendación");
        return;
      }
      setResult(data as ApiResponse);
    } catch {
      setError("No se pudo conectar con el servicio. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const hasVerdict = result && "verdict" in result;
  const verdictLower = hasVerdict ? result.verdict.toLowerCase() : "";
  const isGood = verdictLower.includes("buena") || verdictLower.includes("sana");
  const isBad = verdictLower.includes("mala") || verdictLower.includes("desaconsej");
  const isRisky = verdictLower.includes("arriesgad") || verdictLower.includes("cautela");

  return (
    <div className="space-y-6 min-w-0">
      <DashboardPageHeader
        eyebrow="Asistente"
        title="Decisiones financieras"
        description="Describe una compra o meta y recibe una recomendación basada en tu situación financiera."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="question" className="block text-xs font-medium text-muted-foreground mb-2">
              ¿Qué te gustaría comprar o lograr?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: coche eléctrico, reformar el baño, vacaciones..."
              className="w-full min-h-[120px] rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              disabled={loading}
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-2">Plazo</span>
            <div className="flex flex-wrap gap-2">
              {PLAZO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlazo(opt.value)}
                  disabled={loading}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                    plazo === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted/50 text-foreground"
                  )}
                >
                  {opt.label}
                  <span className="block text-xs font-normal opacity-90">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="max-w-xs">
            <Input
              label="Precio o coste estimado (€)"
              type="number"
              min={0}
              step={1}
              value={estimatedAmount}
              onChange={(e) => setEstimatedAmount(e.target.value)}
              placeholder="Opcional"
              disabled={loading}
              className="min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={!question.trim() || loading} className="min-h-[44px]">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Obtener recomendación
              </>
            )}
          </Button>
        </form>
      </Card>

      {loading && (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            <span className="text-sm">La IA está analizando tu situación y tu pregunta...</span>
          </div>
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-full rounded" />
          <Skeleton className="mt-2 h-4 w-3/4 rounded" />
        </Card>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">No se pudo obtener la recomendación</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setError(null); setResult(null); }}>
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {result && !loading && (
        <Card className="p-6">
          {hasVerdict ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                {isGood && <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />}
                {isRisky && <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />}
                {isBad && <XCircle className="h-6 w-6 text-destructive shrink-0" />}
                {!isGood && !isRisky && !isBad && <Lightbulb className="h-6 w-6 text-primary shrink-0" />}
                <h2 className="text-lg font-semibold text-foreground">{result.verdict}</h2>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.reasoning}</p>
              </div>
            </>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-foreground whitespace-pre-wrap">{"message" in result ? result.message : ""}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
