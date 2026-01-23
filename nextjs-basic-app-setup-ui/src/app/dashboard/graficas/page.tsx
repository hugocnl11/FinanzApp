"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { patrimonioAcumulado, filterMonthsByPeriod, gastosPorCategoriaDesdeMovimientos } from "@/lib/dashboard/selectors";
import { formatNumber } from "@/lib/format";
import { ParentSize } from "@visx/responsive";
import { BarRounded, LinePath } from "@visx/shape";
import { scaleLinear, scalePoint, scaleBand } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function GraficasPage() {
  const { data } = useDashboardData();
  const { ingresosMensuales, gastosMensuales, gastosPorCategoria, ingresosPorCategoria } = data;

  // 1. Flujo de Caja Mensual (últimos 12 meses)
  const flujoCaja = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return ultimos12Ingresos.map((ing, i) => ({
      mes: ing.mes,
      valor: ing.valor - ultimos12Gastos[i].valor,
    }));
  }, [ingresosMensuales, gastosMensuales]);

  // 2. Tasa de Ahorro Mensual (últimos 12 meses)
  const tasaAhorro = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return ultimos12Ingresos.map((ing, i) => {
      const gasto = ultimos12Gastos[i].valor;
      const ahorro = ing.valor - gasto;
      const tasa = ing.valor ? (ahorro / ing.valor) * 100 : 0;
      return {
        mes: ing.mes,
        valor: tasa,
      };
    });
  }, [ingresosMensuales, gastosMensuales]);

  // 3. Presupuesto vs Gasto por Categoría
  const presupuestoVsGasto = useMemo(() => {
    return gastosPorCategoria.map((cat) => ({
      name: cat.name,
      presupuesto: cat.value * 1.2, // Mock: presupuesto 20% más
      gasto: cat.value,
    }));
  }, [gastosPorCategoria]);

  // 4. Tendencia de Saldo Acumulado (últimos 12 meses)
  const saldoAcumulado = useMemo(() => {
    const ultimos12Ingresos = filterMonthsByPeriod(ingresosMensuales, 12);
    const ultimos12Gastos = filterMonthsByPeriod(gastosMensuales, 12);
    return patrimonioAcumulado(ultimos12Ingresos, ultimos12Gastos);
  }, [ingresosMensuales, gastosMensuales]);

  // Colores para charts
  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"];
  const totalIngresos = useMemo(
    () => ingresosPorCategoria.reduce((acc, item) => acc + item.value, 0),
    [ingresosPorCategoria]
  );
  const totalGastos = useMemo(
    () => gastosPorCategoria.reduce((acc, item) => acc + item.value, 0),
    [gastosPorCategoria]
  );

  return (
    <div className="space-y-6 px-4 md:px-8">
      <div>
        <h1 className="text-3xl font-bold">Gráficas Avanzadas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análisis detallado de tus finanzas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Flujo de Caja Mensual */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Flujo de Caja Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Diferencia entre ingresos y gastos</p>
            </div>
            {flujoCaja.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="h-[280px]">
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scaleBand({
                    domain: flujoCaja.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.3,
                  });

                  const yScale = scaleLinear({
                    domain: [
                      Math.min(...flujoCaja.map((d) => d.valor), 0),
                      Math.max(...flujoCaja.map((d) => d.valor)),
                    ],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const zeroY = yScale(0);

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Línea del cero */}
                        <line
                          x1={0}
                          x2={innerWidth}
                          y1={zeroY}
                          y2={zeroY}
                          stroke="currentColor"
                          strokeWidth={1}
                          strokeDasharray="4 2"
                          className="text-muted-foreground/30"
                        />
                        {/* Barras */}
                        {flujoCaja.map((d, i) => {
                          const barHeight = Math.abs(yScale(d.valor) - zeroY);
                          const barY = d.valor >= 0 ? yScale(d.valor) : zeroY;
                          const labelY = d.valor >= 0 ? barY - 6 : barY + barHeight + 12;
                          return (
                            <motion.rect
                              key={d.mes}
                              x={xScale(d.mes)}
                              y={barY}
                              width={xScale.bandwidth()}
                              height={barHeight}
                              fill={d.valor >= 0 ? "#22c55e" : "#ef4444"}
                              rx={4}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 2.0, delay: i * 0.08 }}
                              style={{ transformOrigin: `center ${zeroY}px` }}
                            />
                          );
                        })}
                        {flujoCaja.map((d, i) => {
                          const barHeight = Math.abs(yScale(d.valor) - zeroY);
                          const barY = d.valor >= 0 ? yScale(d.valor) : zeroY;
                          const labelY = d.valor >= 0 ? barY - 6 : barY + barHeight + 12;
                          return (
                            <text
                              key={`value-${i}`}
                              x={(xScale(d.mes) || 0) + xScale.bandwidth() / 2}
                              y={labelY}
                              textAnchor="middle"
                              fontSize={10}
                              fill="currentColor"
                              className="text-foreground"
                            >
                              {formatNumber(d.valor)}
                            </text>
                          );
                        })}
                        {/* Etiquetas X */}
                        {flujoCaja.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={(xScale(d.mes) || 0) + xScale.bandwidth() / 2}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
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

        {/* 2. Tasa de Ahorro Mensual */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Tasa de Ahorro Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Porcentaje de ingresos ahorrados</p>
            </div>
            {tasaAhorro.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="h-[280px]">
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 30, right: 20, bottom: 40, left: 40 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scalePoint({
                    domain: tasaAhorro.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.5,
                  });

                  const yScale = scaleLinear({
                    domain: [0, Math.max(...tasaAhorro.map((d) => d.valor), 50)],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const linePath = LinePath({
                    data: tasaAhorro,
                    x: (d) => xScale(d.mes) || 0,
                    y: (d) => yScale(d.valor),
                    curve: curveMonotoneX,
                  });

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Línea meta 20% */}
                        <line
                          x1={0}
                          x2={innerWidth}
                          y1={yScale(20)}
                          y2={yScale(20)}
                          stroke="#22c55e"
                          strokeWidth={1}
                          strokeDasharray="6 3"
                          opacity={0.4}
                        />
                        <text
                          x={innerWidth - 5}
                          y={yScale(20) - 5}
                          textAnchor="end"
                          fontSize={10}
                          fill="#22c55e"
                          opacity={0.6}
                        >
                          Meta 20%
                        </text>
                        {/* Línea principal */}
                        <motion.path
                          d={linePath?.props.d || ""}
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeInOut" }}
                        />
                        {/* Puntos */}
                        {tasaAhorro.map((d, i) => (
                          <motion.circle
                            key={i}
                            cx={xScale(d.mes)}
                            cy={yScale(d.valor)}
                            r={4}
                            fill="#8b5cf6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                          />
                        ))}
                        {tasaAhorro.map((d, i) => (
                          <text
                            key={`value-${i}`}
                            x={xScale(d.mes)}
                            y={yScale(d.valor) - 10}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-foreground"
                          >
                            {d.valor.toFixed(0)}%
                          </text>
                        ))}
                        {/* Etiquetas X */}
                        {tasaAhorro.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={xScale(d.mes)}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
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

        {/* 3. Presupuesto vs Gasto por Categoría */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Presupuesto vs Gasto</h3>
              <p className="text-xs text-muted-foreground mt-1">Comparación por categoría</p>
            </div>
            {presupuestoVsGasto.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="h-[280px]">
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 10, right: 80, bottom: 20, left: 100 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;
                  const maxValue = Math.max(...presupuestoVsGasto.flatMap((d) => [d.presupuesto, d.gasto]));

                  const yScale = scaleBand({
                    domain: presupuestoVsGasto.map((d) => d.name),
                    range: [0, innerHeight],
                    padding: 0.25,
                  });

                  const xScale = scaleLinear({
                    domain: [0, maxValue],
                    range: [0, innerWidth],
                    nice: true,
                  });

                  return (
                    <svg width={width} height={height}>
                      <defs>
                        <linearGradient id="budget-gradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#cbd5f5" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.9" />
                        </linearGradient>
                        {presupuestoVsGasto.map((item, i) => (
                          <linearGradient key={item.name} id={`spend-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.6" />
                          </linearGradient>
                        ))}
                        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.2" />
                        </filter>
                      </defs>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {presupuestoVsGasto.map((d, i) => {
                          const barHeight = Math.max(8, yScale.bandwidth() / 3);
                          const gap = 6;
                          const yBase = (yScale(d.name) || 0) + (yScale.bandwidth() - (barHeight * 2 + gap)) / 2;
                          const yBudget = yBase;
                          const ySpent = yBase + barHeight + gap;
                          const labelY = (yScale(d.name) || 0) + yScale.bandwidth() / 2;
                          return (
                            <g key={d.name}>
                              {/* Track background */}
                              <rect
                                x={0}
                                y={yBudget}
                                width={xScale(maxValue)}
                                height={barHeight}
                                rx={6}
                                fill="hsl(var(--muted))"
                                opacity={0.35}
                              />
                              <rect
                                x={0}
                                y={ySpent}
                                width={xScale(maxValue)}
                                height={barHeight}
                                rx={6}
                                fill="hsl(var(--muted))"
                                opacity={0.35}
                              />
                              {/* Barra presupuesto (gris) */}
                              <motion.rect
                                x={0}
                                y={yBudget}
                                width={xScale(d.presupuesto)}
                                height={barHeight}
                                fill="url(#budget-gradient)"
                                rx={6}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2.0, delay: i * 0.1 }}
                                style={{ transformOrigin: "left" }}
                              />
                              <text
                                x={xScale(d.presupuesto) + 6}
                                y={yBudget + barHeight / 2}
                                textAnchor="start"
                                fontSize={10}
                                fill="currentColor"
                                className="text-muted-foreground"
                                dominantBaseline="middle"
                              >
                                €{formatNumber(d.presupuesto)}
                              </text>
                              {/* Barra gasto (color) */}
                              <motion.rect
                                x={0}
                                y={ySpent}
                                width={xScale(d.gasto)}
                                height={barHeight}
                                fill={`url(#spend-gradient-${i})`}
                                rx={6}
                                filter="url(#soft-shadow)"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2.0, delay: i * 0.1 + 0.15 }}
                                style={{ transformOrigin: "left" }}
                              />
                              <text
                                x={xScale(d.gasto) + 6}
                                y={ySpent + barHeight / 2}
                                textAnchor="start"
                                fontSize={10}
                                fill="currentColor"
                                className="text-foreground"
                                dominantBaseline="middle"
                              >
                                €{formatNumber(d.gasto)}
                              </text>
                              {/* Etiqueta categoría */}
                              <foreignObject x={-96} y={labelY - 12} width={88} height={24} style={{ pointerEvents: "none" }}>
                                <div className="flex h-6 items-center justify-center rounded-md bg-muted/60 px-2 text-[11px] font-medium text-foreground/90 truncate">
                                {d.name}
                                </div>
                              </foreignObject>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            )}
            <div className="flex gap-4 justify-center text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-400/80" /> Presupuesto
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary" /> Gasto real
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Tendencia de Saldo Acumulado */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Saldo Acumulado</h3>
              <p className="text-xs text-muted-foreground mt-1">Evolución del patrimonio neto</p>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(saldoAcumulado[saldoAcumulado.length - 1]?.valor ?? 0)} €
            </div>
            {saldoAcumulado.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
            <div className="h-[220px]">
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const xScale = scalePoint({
                    domain: saldoAcumulado.map((d) => d.mes),
                    range: [0, innerWidth],
                    padding: 0.5,
                  });

                  const yScale = scaleLinear({
                    domain: [0, Math.max(...saldoAcumulado.map((d) => d.valor))],
                    range: [innerHeight, 0],
                    nice: true,
                  });

                  const linePath = LinePath({
                    data: saldoAcumulado,
                    x: (d) => xScale(d.mes) || 0,
                    y: (d) => yScale(d.valor),
                    curve: curveMonotoneX,
                  });

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {/* Área bajo la línea */}
                        <motion.path
                          d={linePath?.props.d || ""}
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.9, ease: "easeInOut" }}
                        />
                        {/* Puntos */}
                        {saldoAcumulado.map((d, i) => (
                          <motion.circle
                            key={i}
                            cx={xScale(d.mes)}
                            cy={yScale(d.valor)}
                            r={4}
                            fill="#3b82f6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                          />
                        ))}
                        {saldoAcumulado.map((d, i) => (
                          <text
                            key={`value-${i}`}
                            x={xScale(d.mes)}
                            y={yScale(d.valor) - 10}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-foreground"
                          >
                            {formatNumber(d.valor)}
                          </text>
                        ))}
                        {/* Etiquetas X */}
                        {saldoAcumulado.map((d, i) => (
                          <text
                            key={`label-${i}`}
                            x={xScale(d.mes)}
                            y={innerHeight + 20}
                            textAnchor="middle"
                            fontSize={10}
                            fill="currentColor"
                            className="text-muted-foreground"
                          >
                            {d.mes.slice(0, 3)}
                          </text>
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

        {/* 5. Ingresos por Categoría */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Distribución de fuentes de ingreso</p>
            </div>
            {ingresosPorCategoria.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
              <>
                <div className="relative h-[280px]">
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-2xl font-semibold">{formatNumber(totalIngresos)} €</span>
                  </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ingresosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        cornerRadius={8}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                  >
                    {ingresosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {ingresosPorCategoria.map((entry, index) => {
                    const pct = totalIngresos ? (entry.value / totalIngresos) * 100 : 0;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate text-[11px]">{entry.name}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground text-[11px]">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* 6. Gastos por Categoría (expandido) */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gastos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Análisis detallado de gastos</p>
            </div>
            {gastosPorCategoria.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos disponibles
              </div>
            ) : (
              <>
                <div className="relative h-[280px]">
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-2xl font-semibold">{formatNumber(totalGastos)} €</span>
                  </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                        innerRadius={62}
                        outerRadius={98}
                        paddingAngle={3}
                        cornerRadius={8}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {gastosPorCategoria.map((entry, index) => {
                    const pct = totalGastos ? (entry.value / totalGastos) * 100 : 0;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate text-[11px]">{entry.name}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground text-[11px]">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
