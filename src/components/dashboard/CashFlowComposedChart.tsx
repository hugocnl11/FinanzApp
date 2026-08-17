"use client";

import { useState } from "react";
import { ParentSize } from "@visx/responsive";
import { LinePath } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import type { ComposedMonth } from "@/lib/dashboard/advanced-charts";

const HEIGHT = 380;
const MARGIN = { top: 28, right: 52, bottom: 32, left: 52 };
const FONT = 11;

function formatAxis(value: number) {
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1).replace(".", ",") + "M";
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(0) + "k";
  return String(Math.round(value));
}

function formatBarAmount(value: number) {
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BarAmountLabel({ x, y, barHeight, value }: { x: number; y: number; barHeight: number; value: number }) {
  const label = formatBarAmount(value);
  const inside = barHeight > 64;
  const ty = inside ? y + barHeight / 2 : y - 6;
  return (
    <text
      x={x}
      y={ty}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={8}
      fill={inside ? "#fff" : "currentColor"}
      className={inside ? "tabular-nums" : "text-foreground tabular-nums"}
      transform={`rotate(-90 ${x} ${ty})`}
    >
      {label}
    </text>
  );
}

type CashFlowComposedChartProps = {
  data: ComposedMonth[];
};

export function CashFlowComposedChart({ data }: CashFlowComposedChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover != null ? data[hover] : null;

  return (
    <Card className="p-4 flex flex-col overflow-hidden" style={{ height: HEIGHT }}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Flujo de Caja Mensual</h3>
            <p className="text-xs text-muted-foreground mt-1">Ingresos y gastos del mes, con saldo acumulado</p>
          </div>
          {hovered ? (
            <p className="text-xs tabular-nums text-muted-foreground text-right">
              {hovered.mes.slice(0, 3)} · Ing. {formatBarAmount(hovered.ingresos)} € · Gas. {formatBarAmount(hovered.gastos)} € · Saldo {formatBarAmount(hovered.saldo)} €
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 justify-end text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Ingresos</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Gastos</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 rounded bg-indigo-500" /> Saldo</span>
            </div>
          )}
        </div>
        {data.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin datos disponibles
          </div>
        ) : (
          <div className="flex-1 min-h-0 mt-2">
            <ParentSize>
              {({ width, height }) => {
                if (width <= 0 || height <= 0) return null;
                const innerWidth = width - MARGIN.left - MARGIN.right;
                const innerHeight = height - MARGIN.top - MARGIN.bottom;
                const xScale = scaleBand({
                  domain: data.map((d) => d.mes),
                  range: [0, innerWidth],
                  padding: 0.28,
                });
                const inner = scaleBand({
                  domain: ["ingresos", "gastos"],
                  range: [0, xScale.bandwidth()],
                  padding: 0.15,
                });
                const maxMonthly = Math.max(...data.flatMap((d) => [d.ingresos, d.gastos]), 1);
                const yLeft = scaleLinear({
                  domain: [0, maxMonthly * 1.08],
                  range: [innerHeight, 0],
                  nice: true,
                });
                const minSaldo = Math.min(...data.map((d) => d.saldo), 0);
                const maxSaldo = Math.max(...data.map((d) => d.saldo), 1);
                const yRight = scaleLinear({
                  domain: [minSaldo, maxSaldo * 1.05],
                  range: [innerHeight, 0],
                  nice: true,
                });
                const yTicks = yLeft.ticks(5);
                const rightTicks = yRight.ticks(4);
                return (
                  <svg width={width} height={height} className="text-foreground">
                    <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                      {yTicks.map((tick) => (
                        <g key={tick}>
                          <line x1={0} x2={innerWidth} y1={yLeft(tick)} y2={yLeft(tick)} stroke="currentColor" strokeDasharray="2 2" className="text-muted-foreground/20" />
                          <text x={-8} y={yLeft(tick)} textAnchor="end" dominantBaseline="middle" fontSize={FONT} fill="currentColor" className="text-muted-foreground">
                            {formatAxis(tick)}
                          </text>
                        </g>
                      ))}
                      {rightTicks.map((tick) => (
                        <text key={`r-${tick}`} x={innerWidth + 8} y={yRight(tick)} textAnchor="start" dominantBaseline="middle" fontSize={FONT} fill="currentColor" className="text-muted-foreground">
                          {formatAxis(tick)}
                        </text>
                      ))}
                      {data.map((d, i) => {
                        const groupX = xScale(d.mes) ?? 0;
                        const ingX = groupX + (inner("ingresos") ?? 0);
                        const gasX = groupX + (inner("gastos") ?? 0);
                        const barW = inner.bandwidth();
                        return (
                          <g key={d.mes}>
                            <rect
                              x={groupX}
                              y={0}
                              width={xScale.bandwidth()}
                              height={innerHeight}
                              fill="transparent"
                              onMouseEnter={() => setHover(i)}
                              onMouseLeave={() => setHover(null)}
                            />
                            <rect x={ingX} y={yLeft(d.ingresos)} width={barW} height={Math.max(0, innerHeight - yLeft(d.ingresos))} rx={3} fill="#22c55e" opacity={hover == null || hover === i ? 1 : 0.35} />
                            <rect x={gasX} y={yLeft(d.gastos)} width={barW} height={Math.max(0, innerHeight - yLeft(d.gastos))} rx={3} fill="#ef4444" opacity={hover == null || hover === i ? 1 : 0.35} />
                            <BarAmountLabel x={ingX + barW / 2} y={yLeft(d.ingresos)} barHeight={Math.max(0, innerHeight - yLeft(d.ingresos))} value={d.ingresos} />
                            <BarAmountLabel x={gasX + barW / 2} y={yLeft(d.gastos)} barHeight={Math.max(0, innerHeight - yLeft(d.gastos))} value={d.gastos} />
                            <text x={groupX + xScale.bandwidth() / 2} y={innerHeight + 20} textAnchor="middle" fontSize={FONT} fill="currentColor" className="text-muted-foreground">
                              {d.mes.slice(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                      <LinePath
                        data={data}
                        x={(d) => (xScale(d.mes) ?? 0) + xScale.bandwidth() / 2}
                        y={(d) => yRight(d.saldo)}
                        curve={curveMonotoneX}
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        fill="none"
                      />
                      {data.map((d) => (
                        <circle
                          key={`dot-${d.mes}`}
                          cx={(xScale(d.mes) ?? 0) + xScale.bandwidth() / 2}
                          cy={yRight(d.saldo)}
                          r={3}
                          fill="#6366f1"
                        />
                      ))}
                    </g>
                  </svg>
                );
              }}
            </ParentSize>
          </div>
        )}
      </div>
    </Card>
  );
}
