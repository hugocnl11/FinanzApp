import type { DashboardData } from "@/lib/dashboard/types";
import { comparativaAnual } from "@/lib/dashboard/selectors";
import { buildMonthlySeries } from "@/lib/dashboard/derive";
import { formatCurrency } from "@/lib/format";

export type InformeRowMensual = {
  mesAnio: string;
  ingresos: number;
  gastos: number;
  ahorroInversion: number;
  patrimonio: number;
};

export type ResumenAnual = {
  anio: number;
  ingresos: number;
  gastos: number;
  ahorro: number;
};

export type InformeData = {
  fechaGeneracion: string;
  periodLabel: string;
  mensual: InformeRowMensual[];
  resumenAnual: ResumenAnual[];
  comparativa: ReturnType<typeof comparativaAnual>;
  gastosPorCategoria: { name: string; value: number }[];
  ingresosPorCategoria: { name: string; value: number }[];
};

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

function getMonthYearLabels(count: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`);
  }
  return out;
}

/** Construye la estructura del informe a partir de DashboardData */
export function buildReportData(data: DashboardData, currency = "EUR"): InformeData {
  const now = new Date();
  const fechaGeneracion = now.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const ingresosMensuales = data.ingresosMensuales;
  const gastosMensuales = data.gastosMensuales;
  const activosPorMes = data.activosPorMes ?? [];
  const inversionesMensuales = buildMonthlySeries(data.movimientos, "Inversión", 12);
  const ahorroMensuales = buildMonthlySeries(data.movimientos, "Ahorro", 12);

  const monthYearLabels = getMonthYearLabels(12);
  const mensual: InformeRowMensual[] = ingresosMensuales.map((ing, i) => {
    const gastos = gastosMensuales[i]?.valor ?? 0;
    const inv = inversionesMensuales[i]?.valor ?? 0;
    const ahorro = ahorroMensuales[i]?.valor ?? 0;
    return {
      mesAnio: monthYearLabels[i] ?? ing.mes,
      ingresos: ing.valor,
      gastos,
      ahorroInversion: inv + ahorro,
      patrimonio: activosPorMes[i]?.valor ?? 0,
    };
  });

  const comparativa = comparativaAnual(data.movimientos);
  const thisY = now.getFullYear();
  const lastY = thisY - 1;

  const sumYear = (year: number, source: "ingresos" | "gastos") => {
    return data.movimientos
      .filter((m) => new Date(m.fecha).getFullYear() === year)
      .reduce((acc, m) => {
        if (source === "ingresos" && m.tipo === "Ingreso") return acc + m.cantidad;
        if (source === "gastos" && m.tipo === "Gasto") return acc + Math.abs(m.cantidad);
        return acc;
      }, 0);
  };

  const ahorroYear = (year: number) => {
    return data.movimientos
      .filter((m) => new Date(m.fecha).getFullYear() === year)
      .reduce((acc, m) => {
        if (m.tipo === "Inversión" || m.tipo === "Ahorro") return acc + Math.abs(m.cantidad);
        return acc;
      }, 0);
  };

  const resumenAnual: ResumenAnual[] = [];
  const ingThis = sumYear(thisY, "ingresos");
  const gasThis = sumYear(thisY, "gastos");
  const ahorThis = ahorroYear(thisY);
  if (ingThis !== 0 || gasThis !== 0 || ahorThis !== 0) {
    resumenAnual.push({
      anio: thisY,
      ingresos: ingThis,
      gastos: gasThis,
      ahorro: ahorThis,
    });
  }
  const ingLast = sumYear(lastY, "ingresos");
  const gasLast = sumYear(lastY, "gastos");
  const ahorLast = ahorroYear(lastY);
  if (ingLast !== 0 || gasLast !== 0 || ahorLast !== 0) {
    resumenAnual.push({
      anio: lastY,
      ingresos: ingLast,
      gastos: gasLast,
      ahorro: ahorLast,
    });
  }

  return {
    fechaGeneracion,
    periodLabel: "Últimos 12 meses",
    mensual,
    resumenAnual,
    comparativa,
    gastosPorCategoria: data.gastosPorCategoria ?? [],
    ingresosPorCategoria: data.ingresosPorCategoria ?? [],
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Genera HTML del informe para imprimir/PDF */
export function toInformeHtml(informe: InformeData, currency = "EUR"): string {
  const fmt = (n: number) => formatCurrency(n, currency);
  const rowsMensual = informe.mensual
    .map(
      (r) =>
        `<tr>
          <td>${escapeHtml(r.mesAnio)}</td>
          <td style="text-align:right">${fmt(r.ingresos)}</td>
          <td style="text-align:right">${fmt(r.gastos)}</td>
          <td style="text-align:right">${fmt(r.ahorroInversion)}</td>
          <td style="text-align:right">${fmt(r.patrimonio)}</td>
        </tr>`
    )
    .join("");

  const rowsResumenAnual = informe.resumenAnual
    .map(
      (r) =>
        `<tr>
          <td>${r.anio}</td>
          <td style="text-align:right">${fmt(r.ingresos)}</td>
          <td style="text-align:right">${fmt(r.gastos)}</td>
          <td style="text-align:right">${fmt(r.ahorro)}</td>
        </tr>`
    )
    .join("");

  const rowsComparativaThis = informe.comparativa.thisYear
    .map(
      (r, i) =>
        `<tr>
          <td>${escapeHtml(r.mes)} ${new Date().getFullYear()}</td>
          <td style="text-align:right">${fmt(r.ingresos)}</td>
          <td style="text-align:right">${fmt(r.gastos)}</td>
        </tr>`
    )
    .join("");
  const rowsComparativaLast = informe.comparativa.lastYear
    .map(
      (r) =>
        `<tr>
          <td>${escapeHtml(r.mes)} ${new Date().getFullYear() - 1}</td>
          <td style="text-align:right">${fmt(r.ingresos)}</td>
          <td style="text-align:right">${fmt(r.gastos)}</td>
        </tr>`
    )
    .join("");

  const rowsGastosCat = informe.gastosPorCategoria
    .map((c) => `<tr><td>${escapeHtml(c.name)}</td><td style="text-align:right">${fmt(c.value)}</td></tr>`)
    .join("");
  const rowsIngresosCat = informe.ingresosPorCategoria
    .map((c) => `<tr><td>${escapeHtml(c.name)}</td><td style="text-align:right">${fmt(c.value)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe Financiero - FinanzApp</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
    h2 { font-size: 16px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Informe Financiero</h1>
  <p class="meta">Generado el ${escapeHtml(informe.fechaGeneracion)} · Periodo: ${escapeHtml(informe.periodLabel)}</p>

  <h2>Resumen por mes</h2>
  <table>
    <thead>
      <tr>
        <th>Mes</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Gastos</th>
        <th style="text-align:right">Ahorro/Inversión</th>
        <th style="text-align:right">Patrimonio</th>
      </tr>
    </thead>
    <tbody>${rowsMensual}</tbody>
  </table>

  <h2>Resumen por año</h2>
  <table>
    <thead>
      <tr>
        <th>Año</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Gastos</th>
        <th style="text-align:right">Ahorro</th>
      </tr>
    </thead>
    <tbody>${rowsResumenAnual}</tbody>
  </table>

  <h2>Comparativa anual (año actual)</h2>
  <table>
    <thead>
      <tr>
        <th>Mes</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Gastos</th>
      </tr>
    </thead>
    <tbody>${rowsComparativaThis}</tbody>
  </table>

  <h2>Comparativa anual (año anterior)</h2>
  <table>
    <thead>
      <tr>
        <th>Mes</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Gastos</th>
      </tr>
    </thead>
    <tbody>${rowsComparativaLast}</tbody>
  </table>

  <h2>Gastos por categoría</h2>
  <table>
    <thead>
      <tr><th>Categoría</th><th style="text-align:right">Importe</th></tr>
    </thead>
    <tbody>${rowsGastosCat || "<tr><td colspan=\"2\">Sin datos</td></tr>"}</tbody>
  </table>

  <h2>Ingresos por categoría</h2>
  <table>
    <thead>
      <tr><th>Categoría</th><th style="text-align:right">Importe</th></tr>
    </thead>
    <tbody>${rowsIngresosCat || "<tr><td colspan=\"2\">Sin datos</td></tr>"}</tbody>
  </table>
</body>
</html>`;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Genera CSV del informe (varios bloques con cabeceras) */
export function toInformeCsv(informe: InformeData, currency = "EUR"): string {
  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(",", ".");

  const lines: string[] = [];
  lines.push("Informe Financiero - FinanzApp");
  lines.push(`Generado;${informe.fechaGeneracion}`);
  lines.push(`Periodo;${informe.periodLabel}`);
  lines.push("");

  lines.push("Resumen por mes");
  lines.push("Mes;Ingresos;Gastos;Ahorro/Inversión;Patrimonio");
  for (const r of informe.mensual) {
    lines.push(
      [r.mesAnio, fmt(r.ingresos), fmt(r.gastos), fmt(r.ahorroInversion), fmt(r.patrimonio)].join(";")
    );
  }
  lines.push("");

  lines.push("Resumen por año");
  lines.push("Año;Ingresos;Gastos;Ahorro");
  for (const r of informe.resumenAnual) {
    lines.push([r.anio, fmt(r.ingresos), fmt(r.gastos), fmt(r.ahorro)].join(";"));
  }
  lines.push("");

  lines.push("Comparativa anual - Año actual");
  lines.push("Mes;Ingresos;Gastos");
  for (const r of informe.comparativa.thisYear) {
    lines.push([r.mes, fmt(r.ingresos), fmt(r.gastos)].join(";"));
  }
  lines.push("");

  lines.push("Comparativa anual - Año anterior");
  lines.push("Mes;Ingresos;Gastos");
  for (const r of informe.comparativa.lastYear) {
    lines.push([r.mes, fmt(r.ingresos), fmt(r.gastos)].join(";"));
  }
  lines.push("");

  lines.push("Gastos por categoría");
  lines.push("Categoría;Importe");
  for (const c of informe.gastosPorCategoria) {
    lines.push([escapeCsvCell(c.name), fmt(c.value)].join(";"));
  }
  lines.push("");

  lines.push("Ingresos por categoría");
  lines.push("Categoría;Importe");
  for (const c of informe.ingresosPorCategoria) {
    lines.push([escapeCsvCell(c.name), fmt(c.value)].join(";"));
  }

  return lines.join("\n");
}

/** Abre una ventana de impresión con el HTML del informe (para guardar como PDF) */
export function printInformePdf(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

/** Descarga el CSV del informe con nombre con fecha */
export function downloadInformeCsv(csvContent: string): void {
  const filename = `informe-finanzapp-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
