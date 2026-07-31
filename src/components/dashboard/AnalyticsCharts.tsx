"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { ParentSize } from "@visx/responsive";
import { motion } from "framer-motion";
import {
  last,
  previous,
  percentChange,
  getRollingDailyIncomeAndExpenses,
  resolveChartEndDate,
  ensureMonthWindow,
  resolveEndMonthIndex,
} from "@/lib/dashboard/selectors";
import { buildMonthlySeries } from "@/lib/dashboard/derive";
import type { MoneyByMonth, MoneyByDay, Movement } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/format";
import { usePeriod } from "@/contexts/PeriodContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

type DataPoint = {
  month?: string;
  day?: string;
  value: number;
};

type ChartDensity = {
  showValueLabel: (i: number) => boolean;
  showXLabel: (i: number) => boolean;
  pointRadius: number;
  valueFontSize: number;
  labelWidth: number;
  marginX: number;
  dailyXStep: number;
};

/** Densidad de etiquetas/puntos según px disponibles por punto del eje X. */
function getChartDensity(innerWidth: number, pointCount: number): ChartDensity {
  const n = Math.max(pointCount, 1);
  const last = n - 1;
  const mid = Math.floor(last / 2);
  const pxPerPoint = innerWidth / n;

  if (pxPerPoint >= 56) {
    return {
      showValueLabel: () => true,
      showXLabel: () => true,
      pointRadius: 4,
      valueFontSize: 12,
      labelWidth: 48,
      marginX: 20,
      dailyXStep: 3,
    };
  }

  if (pxPerPoint >= 36) {
    return {
      showValueLabel: (i) => i % 2 === 0 || i === last,
      showXLabel: (i) => i % 2 === 0 || i === 0 || i === last,
      pointRadius: 3,
      valueFontSize: 10,
      labelWidth: 40,
      marginX: 14,
      dailyXStep: 4,
    };
  }

  return {
    showValueLabel: (i) => i === last,
    showXLabel: (i) => i === 0 || i === mid || i === last,
    pointRadius: 2.5,
    valueFontSize: 10,
    labelWidth: 36,
    marginX: 12,
    dailyXStep: 5,
  };
}

type ChartCardProps<T> = {
  title: string;
  value: string;
  percent: number;
  subtitle: string;
  data: T[];
  invertPercentColor?: boolean;
  xKey: keyof T;
  yKey: keyof T;
};

function ChartCard<T extends Record<string, any>>({ title, value, percent, subtitle, data, invertPercentColor = false, xKey, yKey }: ChartCardProps<T>) {
  const baseMargin = { top: 36, bottom: 30 };
  const percentColor = invertPercentColor
    ? (percent < 0 ? "text-green-500" : "text-red-500")
    : (percent >= 0 ? "text-green-500" : "text-red-500");

  // Animación para la línea y los puntos
  const lineMotion = {
    initial: { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: 0.9, ease: "easeInOut" },
  };
  const pointMotion = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.3, ease: "easeOut" },
  };

  // Color azul Vercel para patrimonio
  const isPatrimonio = title === "Evolución del Patrimonio";
  const lineColor = isPatrimonio ? "#3b82f6" : "currentColor";
  const pointColor = isPatrimonio ? "#3b82f6" : "currentColor";
  const labelColor = isPatrimonio ? "#3b82f6" : (title.includes("Ingresos") ? "#22c55e" : "#ef4444");

  if (data.length === 0) {
    return (
      <Card className={cn("p-6 min-h-[320px] flex flex-col items-center justify-center text-sm text-muted-foreground", isPatrimonio && "h-full")}>
        Sin datos disponibles
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 min-h-[320px]", isPatrimonio && "h-full")}>
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-xs mt-1 font-medium ${percentColor}`}>{percent >= 0 ? '+' : ''}{percent.toFixed(1)}%</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-4 h-[200px]">
        <ParentSize>
          {({ width, height }) => {
            // Estimación previa con margen medio para elegir densidad; luego se recalcula el plot area
            const density = getChartDensity(Math.max(width - 40, 1), data.length);
            const margin = { ...baseMargin, left: density.marginX, right: density.marginX };
            const innerWidth = Math.max(width - margin.left - margin.right, 1);
            const innerHeight = height - margin.top - margin.bottom;
            const halfLabel = density.labelWidth / 2;

            const xScale = scalePoint({
              domain: data.map((d) => String(d[xKey])),
              range: [0, innerWidth],
              padding: 0.5,
            });

            const yScale = scaleLinear({
              domain: [0, Math.max(...data.map((d) => Number(d[yKey])))],
              range: [innerHeight, 0],
              nice: true,
            });

            // Generar el path de la línea
            const linePath = LinePath({
              data,
              x: (d) => xScale(String(d[xKey])) || 0,
              y: (d) => yScale(Number(d[yKey])),
              curve: curveMonotoneX,
            });

            return (
              <svg width={width} height={height}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                  {/* Línea animada */}
                  <motion.path
                    d={linePath?.props.d || ""}
                    stroke={lineColor}
                    strokeWidth={2}
                    fill="none"
                    className="text-primary"
                    {...lineMotion}
                  />
                  {/* Puntos animados y etiquetas de valor */}
                  {data.map((d, i) => {
                    const xPos = xScale(String(d[xKey])) as number;
                    const yPos = yScale(Number(d[yKey]));
                    const showLabel = density.showValueLabel(i);
                    return (
                      <g key={i}>
                        <motion.circle
                          cx={xPos}
                          cy={yPos}
                          r={density.pointRadius}
                          fill={pointColor}
                          {...pointMotion}
                          transition={{ ...pointMotion.transition, delay: 0.2 + i * 0.07 }}
                        />
                        {showLabel && (
                          <foreignObject
                            x={xPos - halfLabel}
                            y={yPos - 28}
                            width={density.labelWidth}
                            height={20}
                            style={{ pointerEvents: "none" }}
                          >
                            <div
                              style={{
                                color: labelColor,
                                fontWeight: 600,
                                fontSize: density.valueFontSize,
                                textAlign: "center",
                                width: "fit-content",
                                margin: "0 auto",
                                lineHeight: "18px",
                              }}
                            >
                              {formatNumber(Number(d[yKey]))}€
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  {/* Etiquetas */}
                  {data.map((d, i) => {
                    if (!density.showXLabel(i)) return null;
                    return (
                      <text
                        key={"label-" + i}
                        x={xScale(String(d[xKey]))}
                        y={innerHeight + 20}
                        textAnchor="middle"
                        fontSize={density.valueFontSize}
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {String(d[xKey]).slice(0, 3)}
                      </text>
                    );
                  })}
                </g>
              </svg>
            );
          }}
        </ParentSize>
      </div>
    </Card>
  );
}

const INVERSIONES_COLOR = "#3b82f6"; // blue-500, contrasta con verde y rojo
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatDailyTick(dateKey: string): string {
  if (dateKey.length >= 10) return String(Number(dateKey.slice(8, 10)));
  return dateKey;
}

function CombinedChartCard({
  ingresos,
  gastos,
  inversiones = [],
  isDailyView = false,
  movimientos = [],
  separatorIndex = -1,
  monthKeys = [],
}: {
  ingresos: MoneyByMonth[] | MoneyByDay[];
  gastos: MoneyByMonth[] | MoneyByDay[];
  inversiones?: MoneyByMonth[] | MoneyByDay[];
  isDailyView?: boolean;
  movimientos?: Movement[];
  separatorIndex?: number;
  monthKeys?: string[];
}) {
  const baseMargin = { top: 36, bottom: 30 };
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const getMovementsByDay = (day: string): Movement[] => {
    if (!isDailyView) return [];
    const dateStr =
      day.length >= 10
        ? day.slice(0, 10)
        : (() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
          })();
    return movimientos.filter((m) => m.fecha === dateStr);
  };

  const labels = isDailyView
    ? (ingresos as MoneyByDay[]).map((d) => d.dia)
    : (ingresos as MoneyByMonth[]).map((d) => d.mes);
  const ingresosVals = ingresos.map((d) => d.valor);
  const gastosVals = gastos.map((d) => d.valor);
  const inversionesVals = inversiones.length ? inversiones.map((d) => d.valor) : [];
  const maxY = Math.max(...ingresosVals, ...gastosVals, ...inversionesVals, 1);

  if (ingresos.length === 0 || gastos.length === 0) {
    return (
      <Card className="p-6 min-h-[320px] flex flex-col items-center justify-center text-sm text-muted-foreground">
        Sin datos disponibles
      </Card>
    );
  }

  return (
    <Card className="p-6 min-h-[320px] relative">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Ingresos / Gastos / Inversión {isDailyView ? "Diarios" : "Totales"}
        </h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 items-end">
          <span className="text-2xl font-bold text-green-600">
            {formatNumber(ingresosVals.reduce((a, b) => a + b, 0))} €
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-2xl font-bold text-red-500">
            {formatNumber(gastosVals.reduce((a, b) => a + b, 0))} €
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-2xl font-bold" style={{ color: INVERSIONES_COLOR }}>
            {formatNumber(inversionesVals.reduce((a, b) => a + b, 0))} €
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isDailyView ? "Últimos 31 días" : "Últimos 12 meses"}
        </p>
      </div>
      <div className="mt-4 h-[200px] relative" ref={chartContainerRef}>
        <ParentSize>
          {({ width, height }) => {
            const density = getChartDensity(Math.max(width - 40, 1), labels.length);
            const margin = { ...baseMargin, left: density.marginX, right: density.marginX };
            const innerWidth = Math.max(width - margin.left - margin.right, 1);
            const innerHeight = height - margin.top - margin.bottom;
            const halfLabel = density.labelWidth / 2;
            const pointR = (hasMovements: boolean) =>
              hasMovements && isDailyView ? Math.max(density.pointRadius + 2, 5) : density.pointRadius;

            const xScale = scalePoint({
              domain: labels,
              range: [0, innerWidth],
              padding: 0.5,
            });
            const yScale = scaleLinear({
              domain: [0, maxY],
              range: [innerHeight, 0],
              nice: true,
            });
            const ingresosLine = LinePath({
              data: ingresos,
              x: (d) => xScale(isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes) || 0,
              y: (d) => yScale(d.valor),
              curve: curveMonotoneX,
            });
            const gastosLine = LinePath({
              data: gastos,
              x: (d) => xScale(isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes) || 0,
              y: (d) => yScale(d.valor),
              curve: curveMonotoneX,
            });
            const inversionesLine = inversiones.length
              ? LinePath({
                  data: inversiones,
                  x: (d) => xScale(isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes) || 0,
                  y: (d) => yScale(d.valor),
                  curve: curveMonotoneX,
                })
              : null;

            const sepLabel = labels[separatorIndex];
            const sepX =
              separatorIndex >= 0 && sepLabel != null
                ? (xScale(sepLabel) as number | undefined)
                : undefined;
            const sepCaption = (() => {
              if (separatorIndex < 0 || sepLabel == null) return "";
              if (isDailyView && sepLabel.length >= 7) {
                const month = Number(sepLabel.slice(5, 7)) - 1;
                const year = sepLabel.slice(2, 4);
                return `${MONTH_SHORT[month] ?? ""} '${year}`;
              }
              const mk = monthKeys[separatorIndex];
              return mk ? mk.slice(0, 4) : sepLabel.slice(0, 3);
            })();

            return (
              <svg width={width} height={height}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                  {sepX != null && Number.isFinite(sepX) && (
                    <g>
                      <line
                        x1={sepX}
                        x2={sepX}
                        y1={-8}
                        y2={innerHeight}
                        stroke="currentColor"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        className="text-muted-foreground/60"
                      />
                      <text
                        x={sepX + 4}
                        y={-2}
                        fontSize={10}
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {sepCaption}
                      </text>
                    </g>
                  )}
                  <motion.path
                    d={ingresosLine?.props.d || ""}
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="4 2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                  {ingresos.map((d, i) => {
                    const gasto = gastos[i];
                    const label = isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes;
                    const yIngreso = yScale(d.valor);
                    const isIngresoMayor = d.valor > (gasto?.valor ?? 0);
                    const labelYOffset = isIngresoMayor ? -36 : 8;
                    const showLabel = d.valor > 0 && density.showValueLabel(i);
                    const dayMovements = isDailyView ? getMovementsByDay(label) : [];
                    const hasMovements = dayMovements.length > 0;
                    const xPos = xScale(label) as number;

                    return (
                      <g key={"ingreso-" + i}>
                        <motion.circle
                          cx={xPos}
                          cy={yIngreso}
                          r={pointR(hasMovements)}
                          fill="#22c55e"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 + i * 0.07 }}
                          className={hasMovements && isDailyView ? "cursor-pointer" : ""}
                          onMouseEnter={(e) => {
                            if (isDailyView && hasMovements && chartContainerRef.current) {
                              setHoveredDay(label);
                              const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                              const containerRect = chartContainerRef.current.getBoundingClientRect();
                              setTooltipPosition({
                                x: rect.left - containerRect.left + rect.width / 2,
                                y: rect.top - containerRect.top - 10,
                              });
                            }
                          }}
                          onMouseLeave={() => {
                            if (isDailyView) {
                              setHoveredDay(null);
                              setTooltipPosition(null);
                            }
                          }}
                        />
                        {showLabel && (
                          <foreignObject
                            x={xPos - halfLabel}
                            y={yIngreso + labelYOffset}
                            width={density.labelWidth}
                            height={20}
                            style={{ pointerEvents: "none" }}
                          >
                            <div
                              style={{
                                color: "#22c55e",
                                fontWeight: 600,
                                fontSize: density.valueFontSize,
                                textAlign: "center",
                                width: "fit-content",
                                margin: "0 auto",
                                lineHeight: "18px",
                              }}
                            >
                              {formatNumber(d.valor)}€
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  <motion.path
                    d={gastosLine?.props.d || ""}
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="4 2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: "easeInOut", delay: 0.2 }}
                  />
                  {gastos.map((d, i) => {
                    const ingreso = ingresos[i];
                    const label = isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes;
                    const yGasto = yScale(d.valor);
                    const isGastoMayor = d.valor > (ingreso?.valor ?? 0);
                    const labelYOffset = isGastoMayor ? -36 : 8;
                    const showLabel = d.valor > 0 && density.showValueLabel(i);
                    const dayMovements = isDailyView ? getMovementsByDay(label) : [];
                    const hasMovements = dayMovements.length > 0;
                    const xPos = xScale(label) as number;

                    return (
                      <g key={"gasto-" + i}>
                        <motion.circle
                          cx={xPos}
                          cy={yGasto}
                          r={pointR(hasMovements)}
                          fill="#ef4444"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 + i * 0.07 }}
                          className={hasMovements && isDailyView ? "cursor-pointer" : ""}
                          onMouseEnter={(e) => {
                            if (isDailyView && hasMovements && chartContainerRef.current) {
                              setHoveredDay(label);
                              const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                              const containerRect = chartContainerRef.current.getBoundingClientRect();
                              setTooltipPosition({
                                x: rect.left - containerRect.left + rect.width / 2,
                                y: rect.top - containerRect.top - 10,
                              });
                            }
                          }}
                          onMouseLeave={() => {
                            if (isDailyView) {
                              setHoveredDay(null);
                              setTooltipPosition(null);
                            }
                          }}
                        />
                        {showLabel && (
                          <foreignObject
                            x={xPos - halfLabel}
                            y={yGasto + labelYOffset}
                            width={density.labelWidth}
                            height={20}
                            style={{ pointerEvents: "none" }}
                          >
                            <div
                              style={{
                                color: "#ef4444",
                                fontWeight: 600,
                                fontSize: density.valueFontSize,
                                textAlign: "center",
                                width: "fit-content",
                                margin: "0 auto",
                                lineHeight: "18px",
                              }}
                            >
                              {formatNumber(d.valor)}€
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  {inversionesLine && (
                    <>
                      <motion.path
                        d={inversionesLine?.props.d || ""}
                        stroke={INVERSIONES_COLOR}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="4 2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: "easeInOut", delay: 0.4 }}
                      />
                      {inversiones.map((d, i) => {
                        const label = isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes;
                        const yInv = yScale(d.valor);
                        const showLabel = d.valor > 0 && density.showValueLabel(i);
                        const xPos = xScale(label) as number;
                        return (
                          <g key={"inv-" + i}>
                            <motion.circle
                              cx={xPos}
                              cy={yInv}
                              r={density.pointRadius}
                              fill={INVERSIONES_COLOR}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3, ease: "easeOut", delay: 0.4 + i * 0.07 }}
                            />
                            {showLabel && (
                              <foreignObject
                                x={xPos - halfLabel}
                                y={yInv - 36}
                                width={density.labelWidth}
                                height={20}
                                style={{ pointerEvents: "none" }}
                              >
                                <div
                                  style={{
                                    color: INVERSIONES_COLOR,
                                    fontWeight: 600,
                                    fontSize: density.valueFontSize,
                                    textAlign: "center",
                                    width: "fit-content",
                                    margin: "0 auto",
                                    lineHeight: "18px",
                                  }}
                                >
                                  {formatNumber(d.valor)}€
                                </div>
                              </foreignObject>
                            )}
                          </g>
                        );
                      })}
                    </>
                  )}
                  {labels.map((label, i) => {
                    const shouldShow = isDailyView
                      ? i % density.dailyXStep === 0 || i === labels.length - 1 || i === separatorIndex
                      : density.showXLabel(i) || i === separatorIndex;
                    if (!shouldShow) return null;
                    return (
                      <text
                        key={"label-" + i}
                        x={xScale(label)}
                        y={innerHeight + 20}
                        textAnchor="middle"
                        fontSize={density.valueFontSize}
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {isDailyView ? formatDailyTick(label) : label.slice(0, 3)}
                      </text>
                    );
                  })}
                </g>
              </svg>
            );
          }}
        </ParentSize>
        {hoveredDay && tooltipPosition && isDailyView && (() => {
          const dayMovements = getMovementsByDay(hoveredDay);
          if (dayMovements.length === 0) return null;
          return (
            <div
              className="absolute z-50 max-w-xs p-3 bg-popover border border-border rounded-lg shadow-lg pointer-events-none"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`,
                transform: "translateX(-50%) translateY(-100%)",
              }}
            >
              <DayMovementsTooltip day={hoveredDay} movements={dayMovements} />
            </div>
          );
        })()}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        <div className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Ingresos
        </div>
        <div className="flex items-center gap-1 text-xs text-red-500">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Gastos
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: INVERSIONES_COLOR }}>
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: INVERSIONES_COLOR }} /> Inversiones
        </div>
      </div>
    </Card>
  );
}

function DayMovementsTooltip({ day, movements }: { day: string; movements: Movement[] }) {
  const dateStr =
    day.length >= 10
      ? day.slice(0, 10)
      : (() => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
        })();
  const date = new Date(dateStr + "T12:00:00");
  const formattedDate = date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  const ingresos = movements.filter((m) => m.tipo === "Ingreso");
  const gastos = movements.filter((m) => m.tipo === "Gasto");
  const totalIngresos = ingresos.reduce((acc, m) => acc + m.cantidad, 0);
  const totalGastos = Math.abs(gastos.reduce((acc, m) => acc + m.cantidad, 0));

  const displayedMovements = movements.slice(0, 7);
  const hasMore = movements.length > 7;

  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm border-b border-border pb-1">{formattedDate}</div>
      <div className="space-y-1 text-xs">
        {displayedMovements.map((movement, idx) => {
          const isIngreso = movement.tipo === "Ingreso";
          const color = isIngreso
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400";
          return (
            <div key={movement.id || idx} className="flex items-center justify-between gap-2">
              <span className="truncate">{movement.concepto}</span>
              <span className={cn("font-medium shrink-0", color)}>
                {isIngreso ? "+" : "-"}
                {formatNumber(Math.abs(movement.cantidad))} €
              </span>
            </div>
          );
        })}
        {hasMore && (
          <div className="text-muted-foreground text-xs pt-1 border-t border-border">
            +{movements.length - 7} movimientos más
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border text-xs">
        <div className="text-green-600 dark:text-green-400 font-medium">
          Ingresos: +{formatNumber(totalIngresos)} €
        </div>
        <div className="text-red-600 dark:text-red-400 font-medium">
          Gastos: -{formatNumber(totalGastos)} €
        </div>
      </div>
    </div>
  );
}

type AnalyticsChartsProps = {
  type?: "combined" | "patrimonio";
};

export function AnalyticsCharts({ type = "combined" }: AnalyticsChartsProps) {
  const { data } = useDashboardData();
  const { ingresosMensuales, gastosMensuales, activosPorMes, movimientos } = data;
  const { period, getMonthCount, dashboardMonthKey } = usePeriod();

  useEffect(() => {
    // reservado para futuras inicializaciones del dashboard
  }, []);

  const monthCount = getMonthCount();
  const isDailyView = period === "Mes";
  const endKey = dashboardMonthKey || undefined;

  const chartEndDate = useMemo(() => {
    if (endKey) return resolveChartEndDate(endKey);
    const idx = resolveEndMonthIndex(ingresosMensuales, endKey);
    const mk = ingresosMensuales[idx]?.monthKey;
    return resolveChartEndDate(mk);
  }, [endKey, ingresosMensuales]);

  const resolvedEndKey = useMemo(() => {
    if (endKey) return endKey;
    const idx = resolveEndMonthIndex(ingresosMensuales, null);
    return ingresosMensuales[idx]?.monthKey;
  }, [endKey, ingresosMensuales]);

  const anchorForInversiones = useMemo(() => chartEndDate, [chartEndDate]);

  const movimientosForDailyTooltips = useMemo(() => {
    if (!isDailyView) return [];
    const end = chartEndDate;
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const endKeyStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return movimientos.filter((m) => m.fecha >= startKey && m.fecha <= endKeyStr);
  }, [isDailyView, movimientos, chartEndDate]);

  const chartBundle = useMemo(() => {
    if (isDailyView) {
      const daily = getRollingDailyIncomeAndExpenses(movimientos, chartEndDate, 31);
      return {
        ingresos: daily.ingresos as MoneyByMonth[] | MoneyByDay[],
        gastos: daily.gastos as MoneyByMonth[] | MoneyByDay[],
        inversiones: daily.inversiones as MoneyByMonth[] | MoneyByDay[],
        separatorIndex: daily.separatorIndex,
        monthKeys: [] as string[],
      };
    }

    const inversionesMensuales = buildMonthlySeries(movimientos, "Inversión", 12, anchorForInversiones);
    const ing = ensureMonthWindow(ingresosMensuales, monthCount, resolvedEndKey);
    const gas = ensureMonthWindow(gastosMensuales, monthCount, resolvedEndKey);
    const inv = ensureMonthWindow(inversionesMensuales, monthCount, resolvedEndKey);
    return {
      ingresos: ing.series as MoneyByMonth[] | MoneyByDay[],
      gastos: gas.series as MoneyByMonth[] | MoneyByDay[],
      inversiones: inv.series as MoneyByMonth[] | MoneyByDay[],
      separatorIndex: ing.separatorIndex,
      monthKeys: ing.series.map((s) => s.monthKey ?? ""),
    };
  }, [
    isDailyView,
    movimientos,
    chartEndDate,
    ingresosMensuales,
    gastosMensuales,
    monthCount,
    resolvedEndKey,
    anchorForInversiones,
  ]);

  // Patrimonio: solo activos (12 meses hasta el mes seleccionado)
  const endIdxPat = resolveEndMonthIndex(ingresosMensuales, endKey);
  const startPat = Math.max(0, endIdxPat - 11);
  const ingresos12 = ingresosMensuales.slice(startPat, endIdxPat + 1);
  const activos12 = ingresos12.map((m, i) => ({
    mes: m.mes,
    valor: activosPorMes?.[startPat + i]?.valor ?? 0,
  }));
  const patrimonioMensual12 = activos12;
  const patrimonioActual = last(patrimonioMensual12)?.valor ?? 0;
  const patrimonioPrevio = previous(patrimonioMensual12)?.valor ?? 0;
  const patrimonioPercent = percentChange(patrimonioActual, patrimonioPrevio);

  if (type === "patrimonio") {
    return (
      <div className="w-full h-full">
        <ChartCard
          title="Evolución del Patrimonio"
          value={`${formatNumber(patrimonioActual)} €`}
          percent={patrimonioPercent}
          subtitle="últimos 12 meses"
          data={patrimonioMensual12}
          xKey="mes"
          yKey="valor"
        />
      </div>
    );
  }

  return (
    <div key={`chart-${period}-${dashboardMonthKey || "last"}`} className="w-full h-full">
      <CombinedChartCard
        ingresos={chartBundle.ingresos}
        gastos={chartBundle.gastos}
        inversiones={chartBundle.inversiones}
        isDailyView={isDailyView}
        movimientos={isDailyView ? movimientosForDailyTooltips : []}
        separatorIndex={chartBundle.separatorIndex}
        monthKeys={chartBundle.monthKeys}
      />
    </div>
  );
}
