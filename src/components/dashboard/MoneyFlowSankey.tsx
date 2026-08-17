"use client";

import { useMemo, useState } from "react";
import { ParentSize } from "@visx/responsive";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import {
  buildMoneyFlowGraph,
  layoutMoneyFlow,
  yearsWithMovements,
  type LaidOutFlowLink,
  type SankeyLayer,
} from "@/lib/dashboard/advanced-charts";
import type { Movement } from "@/lib/dashboard/types";

const HEIGHT = 380;
const LAYER_LABEL: Record<SankeyLayer, string> = {
  in: "Origen",
  method: "Método",
  out: "Destino",
};
const LAYER_COLOR: Record<SankeyLayer, string> = {
  in: "#22c55e",
  method: "#6366f1",
  out: "#f59e0b",
};

type MoneyFlowSankeyProps = {
  movimientos: Movement[];
};

export function MoneyFlowSankey({ movimientos }: MoneyFlowSankeyProps) {
  const years = useMemo(() => yearsWithMovements(movimientos), [movimientos]);
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year != null && years.includes(year) ? year : (years[0] ?? new Date().getFullYear());
  const [hover, setHover] = useState<LaidOutFlowLink | null>(null);
  const graph = useMemo(() => buildMoneyFlowGraph(movimientos, activeYear), [movimientos, activeYear]);

  return (
    <Card className="p-4 flex flex-col overflow-hidden" style={{ height: HEIGHT }}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Flujo de dinero</h3>
            <p className="text-xs text-muted-foreground mt-1">De dónde entra, por qué cuenta y a qué categoría sale</p>
          </div>
          {years.length > 0 && (
            <div className="flex rounded-full bg-muted/50 p-0.5 border border-border/60">
              {years.slice(0, 4).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeYear === y ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
        {graph.nodes.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin movimientos en {activeYear}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 mt-2">
              <ParentSize>
                {({ width, height }) => {
                  if (width <= 0 || height <= 0) return null;
                  const margin = { top: 8, right: 88, bottom: 8, left: 88 };
                  const innerW = width - margin.left - margin.right;
                  const innerH = height - margin.top - margin.bottom;
                  const layout = layoutMoneyFlow(graph, innerW, innerH);
                  return (
                    <svg width={width} height={height} className="text-foreground">
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {layout.links.map((link) => (
                          <path
                            key={`${link.source}-${link.target}`}
                            d={link.path}
                            fill={LAYER_COLOR.method}
                            fillOpacity={hover && hover !== link ? 0.08 : 0.28}
                            onMouseEnter={() => setHover(link)}
                            onMouseLeave={() => setHover(null)}
                          />
                        ))}
                        {layout.nodes.map((node) => (
                          <g key={node.id}>
                            <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={3} fill={LAYER_COLOR[node.layer]} />
                            <text
                              x={node.layer === "out" ? node.x + node.width + 8 : node.x - 8}
                              y={node.y + node.height / 2}
                              textAnchor={node.layer === "out" ? "start" : "end"}
                              dominantBaseline="middle"
                              fontSize={10}
                              fill="currentColor"
                              className="text-muted-foreground"
                            >
                              {node.name.length > 14 ? `${node.name.slice(0, 13)}…` : node.name}
                            </text>
                          </g>
                        ))}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            <div className="shrink-0 flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-1">
              <span>{LAYER_LABEL.in} → {LAYER_LABEL.method} → {LAYER_LABEL.out}</span>
              {hover ? (
                <span className="tabular-nums">
                  {hover.sourceName} → {hover.targetName} · {formatNumber(hover.value)} €
                </span>
              ) : (
                <span>Pasa el cursor por un flujo para ver el importe</span>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
