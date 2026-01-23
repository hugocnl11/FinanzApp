"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { LinePath } from "@visx/shape";
import { scaleLinear, scalePoint } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { ParentSize } from "@visx/responsive";
import { motion } from "framer-motion";
import { last, previous, patrimonioAcumulado, percentChange, filterMonthsByPeriod, getDailyIncomeAndExpenses } from "@/lib/dashboard/selectors";
import type { MoneyByMonth, MoneyByDay } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/format";
import { usePeriod } from "@/contexts/PeriodContext";
import { useDashboardData } from "@/hooks/useDashboardData";

type DataPoint = {
  month?: string;
  day?: string;
  value: number;
};

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
  const margin = { top: 36, right: 20, bottom: 30, left: 20 };
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
      <Card className="p-6 min-h-[320px] flex flex-col items-center justify-center text-sm text-muted-foreground">
        Sin datos disponibles
      </Card>
    );
  }

  return (
    <Card className="p-6 min-h-[320px]">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-xs mt-1 font-medium ${percentColor}`}>{percent >= 0 ? '+' : ''}{percent.toFixed(1)}%</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-4 h-[200px]">
        <ParentSize>
          {({ width, height }) => {
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

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
                  {data.map((d, i) => (
                    <g key={i}>
                      <motion.circle
                        cx={xScale(String(d[xKey]))}
                        cy={yScale(Number(d[yKey]))}
                        r={4}
                        fill={pointColor}
                        {...pointMotion}
                        transition={{ ...pointMotion.transition, delay: 0.2 + i * 0.07 }}
                      />
                      <foreignObject
                        x={(xScale(String(d[xKey])) as number) - 24}
                        y={yScale(Number(d[yKey])) - 28}
                        width={48}
                        height={20}
                        style={{ pointerEvents: 'none' }}
                      >
                        <div
                          style={{
                            color: labelColor,
                            fontWeight: 600,
                            fontSize: 12,
                            textAlign: "center",
                            width: "fit-content",
                            margin: "0 auto",
                            lineHeight: '18px',
                          }}
                        >
                          {formatNumber(Number(d[yKey]))}€
                        </div>
                      </foreignObject>
                    </g>
                  ))}
                  {/* Etiquetas */}
                  {data.map((d, i) => (
                    <text
                      key={"label-" + i}
                      x={xScale(String(d[xKey]))}
                      y={innerHeight + 20}
                      textAnchor="middle"
                      fontSize={12}
                      fill="currentColor"
                      className="text-muted-foreground"
                    >
                      {String(d[xKey]).slice(0, 3)}
                    </text>
                  ))}
                </g>
              </svg>
            );
          }}
        </ParentSize>
      </div>
    </Card>
  );
}

function CombinedChartCard({ 
  ingresos, 
  gastos,
  isDailyView = false
}: { 
  ingresos: MoneyByMonth[] | MoneyByDay[], 
  gastos: MoneyByMonth[] | MoneyByDay[],
  isDailyView?: boolean
}) {
  const margin = { top: 36, right: 20, bottom: 30, left: 20 };
  
  // Determinar labels y valores según el tipo de vista
  const labels = isDailyView 
    ? (ingresos as MoneyByDay[]).map((d) => d.dia)
    : (ingresos as MoneyByMonth[]).map((d) => d.mes);
  const ingresosVals = ingresos.map((d) => d.valor);
  const gastosVals = gastos.map((d) => d.valor);
  const maxY = Math.max(...ingresosVals, ...gastosVals);

  if (ingresos.length === 0 || gastos.length === 0) {
    return (
      <Card className="p-6 min-h-[320px] flex flex-col items-center justify-center text-sm text-muted-foreground">
        Sin datos disponibles
      </Card>
    );
  }

  return (
    <Card className="p-6 min-h-[320px]">
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Ingresos y Gastos {isDailyView ? 'Diarios' : 'Totales'}</h3>
        <div className="flex gap-6 items-end">
          <div className="text-2xl font-bold text-green-600">{formatNumber(ingresosVals.reduce((a, b) => a + b, 0))} €</div>
          <div className="text-2xl font-bold text-red-500">{formatNumber(gastosVals.reduce((a, b) => a + b, 0))} €</div>
        </div>
        <p className="text-xs text-muted-foreground">{isDailyView ? 'Evolución diaria del mes actual' : 'Evolución mensual'}</p>
      </div>
      <div className="mt-4 h-[200px]">
        <ParentSize>
          {({ width, height }) => {
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
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
            // Líneas
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
            return (
              <svg width={width} height={height}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                  {/* Línea ingresos */}
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
                  {/* Puntos ingresos y etiquetas */}
                  {ingresos.map((d, i) => {
                    const gasto = gastos[i];
                    const label = isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes;
                    const yIngreso = yScale(d.valor);
                    const yGasto = yScale(gasto.valor);
                    const isIngresoMayor = d.valor > gasto.valor;
                    const labelYOffset = isIngresoMayor ? -36 : 8;
                    const showLabel = d.valor > 0; // Solo mostrar si hay valor
                    
                    return (
                      <g key={"ingreso-"+i}>
                        <motion.circle
                          cx={xScale(label)}
                          cy={yIngreso}
                          r={4}
                          fill="#22c55e"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 + i * 0.07 }}
                        />
                        {showLabel && (
                          <foreignObject
                            x={(xScale(label) as number) - 24}
                            y={yIngreso + labelYOffset}
                            width={48}
                            height={20}
                            style={{ pointerEvents: 'none' }}
                          >
                            <div
                              style={{
                                color: '#22c55e',
                                fontWeight: 600,
                                fontSize: 12,
                                textAlign: "center",
                                width: "fit-content",
                                margin: "0 auto",
                                lineHeight: '18px',
                              }}
                            >
                              {formatNumber(d.valor)}€
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  {/* Línea gastos */}
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
                  {/* Puntos gastos y etiquetas */}
                  {gastos.map((d, i) => {
                    const ingreso = ingresos[i];
                    const label = isDailyView ? (d as MoneyByDay).dia : (d as MoneyByMonth).mes;
                    const yGasto = yScale(d.valor);
                    const yIngreso = yScale(ingreso.valor);
                    const isGastoMayor = d.valor > ingreso.valor;
                    const labelYOffset = isGastoMayor ? -36 : 8;
                    const showLabel = d.valor > 0; // Solo mostrar si hay valor
                    
                    return (
                      <g key={"gasto-"+i}>
                        <motion.circle
                          cx={xScale(label)}
                          cy={yGasto}
                          r={4}
                          fill="#ef4444"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 + i * 0.07 }}
                        />
                        {showLabel && (
                          <foreignObject
                            x={(xScale(label) as number) - 24}
                            y={yGasto + labelYOffset}
                            width={48}
                            height={20}
                            style={{ pointerEvents: 'none' }}
                          >
                            <div
                              style={{
                                color: '#ef4444',
                                fontWeight: 600,
                                fontSize: 12,
                                textAlign: "center",
                                width: "fit-content",
                                margin: "0 auto",
                                lineHeight: '18px',
                              }}
                            >
                              {formatNumber(d.valor)}€
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  {/* Etiquetas del eje X */}
                  {labels.map((label, i) => {
                    // Mostrar cada 2 o 3 etiquetas si hay muchos días
                    const shouldShow = isDailyView ? i % 3 === 0 || i === labels.length - 1 : true;
                    if (!shouldShow) return null;
                    
                    return (
                      <text
                        key={"label-"+i}
                        x={xScale(label)}
                        y={innerHeight + 20}
                        textAnchor="middle"
                        fontSize={12}
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {isDailyView ? label : label.slice(0, 3)}
                      </text>
                    );
                  })}
                </g>
              </svg>
            );
          }}
        </ParentSize>
      </div>
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1 text-xs text-green-600"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Ingresos</div>
        <div className="flex items-center gap-1 text-xs text-red-500"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Gastos</div>
      </div>
    </Card>
  );
}

type AnalyticsChartsProps = {
  type?: "combined" | "patrimonio";
};

export function AnalyticsCharts({ type = "combined" }: AnalyticsChartsProps) {
  const { data } = useDashboardData();
  const { ingresosMensuales, gastosMensuales, movimientos } = data;
  const { period, getMonthCount } = usePeriod();

  useEffect(() => {
    // reservado para futuras inicializaciones del dashboard
  }, []);

  const monthCount = getMonthCount();
  const isDailyView = period === "Mes";
  
  // Para la gráfica de ingresos vs gastos
  let chartIngresos: MoneyByMonth[] | MoneyByDay[];
  let chartGastos: MoneyByMonth[] | MoneyByDay[];
  
  if (isDailyView) {
    // Mostrar datos diarios del mes actual
    const dailyData = getDailyIncomeAndExpenses(movimientos);
    chartIngresos = dailyData.ingresos;
    chartGastos = dailyData.gastos;
  } else {
    // Mostrar datos mensuales filtrados
    chartIngresos = filterMonthsByPeriod(ingresosMensuales, monthCount);
    chartGastos = filterMonthsByPeriod(gastosMensuales, monthCount);
  }
  
  // Patrimonio: SIEMPRE mostrar los últimos 12 meses
  const patrimonioMensual12 = patrimonioAcumulado(
    filterMonthsByPeriod(ingresosMensuales, 12),
    filterMonthsByPeriod(gastosMensuales, 12)
  );
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
    <div key={`chart-${period}`} className="w-full h-full">
      <CombinedChartCard 
        ingresos={chartIngresos} 
        gastos={chartGastos}
        isDailyView={isDailyView}
      />
    </div>
  );
} 