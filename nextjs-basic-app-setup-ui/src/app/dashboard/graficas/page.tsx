"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DASHBOARD_MOCK } from "@/lib/dashboard/mock";
import { patrimonioAcumulado, filterMonthsByPeriod, gastosPorCategoriaDesdeMovimientos } from "@/lib/dashboard/selectors";
import { formatNumber } from "@/lib/format";
import { ParentSize } from "@visx/responsive";
import { BarRounded, LinePath } from "@visx/shape";
import { scaleLinear, scalePoint, scaleBand } from "@visx/scale";
import { curveMonotoneX } from "d3-shape";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function GraficasPage() {
  const { ingresosMensuales, gastosMensuales, gastosPorCategoria, ingresosPorCategoria } = DASHBOARD_MOCK;

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
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                              style={{ transformOrigin: `center ${zeroY}px` }}
                            />
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
          </div>
        </Card>

        {/* 2. Tasa de Ahorro Mensual */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Tasa de Ahorro Mensual</h3>
              <p className="text-xs text-muted-foreground mt-1">Porcentaje de ingresos ahorrados</p>
            </div>
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
          </div>
        </Card>

        {/* 3. Presupuesto vs Gasto por Categoría */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Presupuesto vs Gasto</h3>
              <p className="text-xs text-muted-foreground mt-1">Comparación por categoría</p>
            </div>
            <div className="h-[280px]">
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 10, right: 80, bottom: 20, left: 100 };
                  const innerWidth = width - margin.left - margin.right;
                  const innerHeight = height - margin.top - margin.bottom;

                  const yScale = scaleBand({
                    domain: presupuestoVsGasto.map((d) => d.name),
                    range: [0, innerHeight],
                    padding: 0.25,
                  });

                  const xScale = scaleLinear({
                    domain: [0, Math.max(...presupuestoVsGasto.flatMap((d) => [d.presupuesto, d.gasto]))],
                    range: [0, innerWidth],
                    nice: true,
                  });

                  return (
                    <svg width={width} height={height}>
                      <g transform={`translate(${margin.left},${margin.top})`}>
                        {presupuestoVsGasto.map((d, i) => {
                          const barHeight = yScale.bandwidth() / 2.5;
                          const yPos = (yScale(d.name) || 0) + yScale.bandwidth() / 2 - barHeight;
                          return (
                            <g key={d.name}>
                              {/* Barra presupuesto (gris) */}
                              <motion.rect
                                x={0}
                                y={yPos - barHeight / 2}
                                width={xScale(d.presupuesto)}
                                height={barHeight}
                                fill="#94a3b8"
                                rx={3}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                style={{ transformOrigin: "left" }}
                              />
                              {/* Barra gasto (color) */}
                              <motion.rect
                                x={0}
                                y={yPos + barHeight / 2}
                                width={xScale(d.gasto)}
                                height={barHeight}
                                fill={COLORS[i % COLORS.length]}
                                rx={3}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.6, delay: i * 0.08 + 0.1 }}
                                style={{ transformOrigin: "left" }}
                              />
                              {/* Etiqueta categoría */}
                              <text
                                x={-8}
                                y={(yScale(d.name) || 0) + yScale.bandwidth() / 2}
                                textAnchor="end"
                                fontSize={11}
                                fill="currentColor"
                                className="text-foreground font-medium"
                                dominantBaseline="middle"
                              >
                                {d.name}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  );
                }}
              </ParentSize>
            </div>
            <div className="flex gap-4 justify-center text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-400" /> Presupuesto
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-primary" /> Gasto Real
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
          </div>
        </Card>

        {/* 5. Ingresos por Categoría */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Distribución de fuentes de ingreso</p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ingresosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {ingresosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* 6. Gastos por Categoría (expandido) */}
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gastos por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-1">Análisis detallado de gastos</p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ value }) => `€${formatNumber(value)}`}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    formatter={(value, entry: any) => {
                      const total = gastosPorCategoria.reduce((acc, cat) => acc + cat.value, 0);
                      const percent = ((entry.value / total) * 100).toFixed(1);
                      return `${value} (${percent}%)`;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => `€ ${formatNumber(value)}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
