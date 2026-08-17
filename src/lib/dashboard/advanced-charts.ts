import type { MoneyByMonth, Movement } from "./types";
import { patrimonioAcumulado } from "./selectors";

export type ComposedMonth = {
  mes: string;
  ingresos: number;
  gastos: number;
  flujo: number;
  saldo: number;
};

export type SankeyLayer = "in" | "method" | "out";

export type MoneyFlowNode = {
  id: string;
  name: string;
  layer: SankeyLayer;
};

export type MoneyFlowLink = {
  source: string;
  target: string;
  value: number;
};

export type MoneyFlowGraph = {
  nodes: MoneyFlowNode[];
  links: MoneyFlowLink[];
};

export type HeatmapDay = {
  date: string;
  weekday: number;
  gastado: number;
  ingresado: number;
  movimientos: number;
};

export type HeatmapWeek = {
  days: Array<HeatmapDay | null>;
};

const MAX_SANKEY_LEAVES = 6;

function topKeys(map: Map<string, number>, limit: number): Set<string> {
  return new Set(
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key)
  );
}

function remapName(name: string, keep: Set<string>, fallback: string) {
  return keep.has(name) ? name : fallback;
}

export function buildComposedCashFlow(ingresos: MoneyByMonth[], gastos: MoneyByMonth[]): ComposedMonth[] {
  const saldoSeries = patrimonioAcumulado(ingresos, gastos);
  return ingresos.map((ing, i) => {
    const gasto = gastos[i]?.valor ?? 0;
    return {
      mes: ing.mes,
      ingresos: ing.valor,
      gastos: gasto,
      flujo: ing.valor - gasto,
      saldo: saldoSeries[i]?.valor ?? 0,
    };
  });
}

export function yearsWithMovements(movimientos: Movement[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  for (const movement of movimientos) {
    const year = Number(movement.fecha.slice(0, 4));
    if (year && year <= currentYear) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function buildMoneyFlowGraph(movimientos: Movement[], year: number): MoneyFlowGraph {
  const inByCat = new Map<string, number>();
  const outByCat = new Map<string, number>();
  const methodTotals = new Map<string, number>();
  const inToMethod = new Map<string, number>();
  const methodToOut = new Map<string, number>();
  const yearPrefix = String(year);
  let hasMethod = false;

  for (const movement of movimientos) {
    if (!movement.fecha.startsWith(yearPrefix)) continue;
    const amount = Math.abs(movement.cantidad);
    if (!amount) continue;
    const method = movement.metodoPago?.trim() || "Tesorería";
    if (movement.metodoPago?.trim()) hasMethod = true;

    if (movement.tipo === "Ingreso") {
      inByCat.set(movement.categoria, (inByCat.get(movement.categoria) ?? 0) + amount);
      const key = `${movement.categoria}\0${method}`;
      inToMethod.set(key, (inToMethod.get(key) ?? 0) + amount);
      methodTotals.set(method, (methodTotals.get(method) ?? 0) + amount);
    } else if (movement.tipo === "Gasto" || movement.tipo === "Inversión" || movement.tipo === "Ahorro") {
      outByCat.set(movement.categoria, (outByCat.get(movement.categoria) ?? 0) + amount);
      const key = `${method}\0${movement.categoria}`;
      methodToOut.set(key, (methodToOut.get(key) ?? 0) + amount);
      methodTotals.set(method, (methodTotals.get(method) ?? 0) + amount);
    }
  }

  if (!inByCat.size && !outByCat.size) return { nodes: [], links: [] };

  const keepIn = topKeys(inByCat, MAX_SANKEY_LEAVES);
  const keepOut = topKeys(outByCat, MAX_SANKEY_LEAVES);
  const keepMethod = hasMethod ? topKeys(methodTotals, 5) : new Set(["Tesorería"]);
  const methodFallback = hasMethod ? "Otros métodos" : "Tesorería";

  const nodes = new Map<string, MoneyFlowNode>();
  const links = new Map<string, MoneyFlowLink>();

  const addNode = (layer: SankeyLayer, name: string) => {
    const id = `${layer}:${name}`;
    if (!nodes.has(id)) nodes.set(id, { id, name, layer });
    return id;
  };

  const addLink = (source: string, target: string, value: number) => {
    if (value <= 0) return;
    const key = `${source}\0${target}`;
    const current = links.get(key);
    if (current) current.value += value;
    else links.set(key, { source, target, value });
  };

  for (const [raw, value] of inToMethod) {
    const [cat, method] = raw.split("\0");
    const inName = remapName(cat, keepIn, "Otros ingresos");
    const methodName = remapName(method, keepMethod, methodFallback);
    addLink(addNode("in", inName), addNode("method", methodName), value);
  }

  for (const [raw, value] of methodToOut) {
    const [method, cat] = raw.split("\0");
    const methodName = remapName(method, keepMethod, methodFallback);
    const outName = remapName(cat, keepOut, "Otros destinos");
    addLink(addNode("method", methodName), addNode("out", outName), value);
  }

  return { nodes: [...nodes.values()], links: [...links.values()] };
}

export function buildYearHeatmap(movimientos: Movement[], year: number): HeatmapWeek[] {
  const byDate = new Map<string, HeatmapDay>();
  const yearPrefix = String(year);

  for (const movement of movimientos) {
    if (!movement.fecha.startsWith(yearPrefix)) continue;
    const date = movement.fecha.slice(0, 10);
    const current = byDate.get(date) ?? {
      date,
      weekday: weekdayMondayFirst(date),
      gastado: 0,
      ingresado: 0,
      movimientos: 0,
    };
    const amount = Math.abs(movement.cantidad);
    if (movement.tipo === "Gasto") current.gastado += amount;
    if (movement.tipo === "Ingreso") current.ingresado += amount;
    current.movimientos += 1;
    byDate.set(date, current);
  }

  const weeks: HeatmapWeek[] = [];
  const cursor = new Date(year, 0, 1);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));

  while (cursor.getFullYear() <= year) {
    const days: Array<HeatmapDay | null> = [];
    let hasYearDay = false;
    for (let i = 0; i < 7; i++) {
      const inYear = cursor.getFullYear() === year;
      if (inYear) hasYearDay = true;
      const iso = toISODate(cursor);
      days.push(inYear ? byDate.get(iso) ?? emptyDay(iso) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (hasYearDay) weeks.push({ days });
  }

  return weeks;
}

function weekdayMondayFirst(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(year, month - 1, day).getDay() + 6) % 7;
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyDay(date: string): HeatmapDay {
  return { date, weekday: weekdayMondayFirst(date), gastado: 0, ingresado: 0, movimientos: 0 };
}

export function heatmapLevel(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio < 0.2) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

export type LaidOutFlowNode = MoneyFlowNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
};

export type LaidOutFlowLink = MoneyFlowLink & {
  path: string;
  thickness: number;
  sourceName: string;
  targetName: string;
};

export function layoutMoneyFlow(
  graph: MoneyFlowGraph,
  width: number,
  height: number
): { nodes: LaidOutFlowNode[]; links: LaidOutFlowLink[] } {
  if (!graph.nodes.length || width <= 0 || height <= 0) return { nodes: [], links: [] };

  const nodeWidth = 14;
  const nodePad = 10;
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const node of graph.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
  }
  for (const link of graph.links) {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  }
  const valueById = new Map<string, number>();
  for (const node of graph.nodes) {
    valueById.set(node.id, Math.max(incoming.get(node.id) ?? 0, outgoing.get(node.id) ?? 0));
  }

  const columns: Record<SankeyLayer, MoneyFlowNode[]> = { in: [], method: [], out: [] };
  for (const node of graph.nodes) columns[node.layer].push(node);
  for (const layer of Object.keys(columns) as SankeyLayer[]) {
    columns[layer].sort((a, b) => (valueById.get(b.id) ?? 0) - (valueById.get(a.id) ?? 0));
  }

  const colX: Record<SankeyLayer, number> = {
    in: 0,
    method: (width - nodeWidth) / 2,
    out: width - nodeWidth,
  };

  const laidNodes = new Map<string, LaidOutFlowNode>();
  for (const layer of ["in", "method", "out"] as SankeyLayer[]) {
    const col = columns[layer];
    const total = col.reduce((sum, node) => sum + (valueById.get(node.id) ?? 0), 0);
    const usable = Math.max(height - Math.max(col.length - 1, 0) * nodePad, 1);
    const scale = total > 0 ? usable / total : 0;
    let y = 0;
    for (const node of col) {
      const value = valueById.get(node.id) ?? 0;
      const h = Math.max(value * scale, 4);
      laidNodes.set(node.id, {
        ...node,
        x: colX[layer],
        y,
        width: nodeWidth,
        height: h,
        value,
      });
      y += h + nodePad;
    }
  }

  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();
  const links: LaidOutFlowLink[] = [];
  const sortedLinks = [...graph.links].sort((a, b) => b.value - a.value);

  for (const link of sortedLinks) {
    const source = laidNodes.get(link.source);
    const target = laidNodes.get(link.target);
    if (!source || !target || !link.value) continue;
    const sourceScale = source.value > 0 ? source.height / source.value : 0;
    const targetScale = target.value > 0 ? target.height / target.value : 0;
    const thickness = Math.max(link.value * Math.min(sourceScale, targetScale), 1);
    const sy = source.y + (outOffset.get(source.id) ?? 0);
    const ty = target.y + (inOffset.get(target.id) ?? 0);
    outOffset.set(source.id, (outOffset.get(source.id) ?? 0) + thickness);
    inOffset.set(target.id, (inOffset.get(target.id) ?? 0) + thickness);
    const x0 = source.x + source.width;
    const x1 = target.x;
    const mx = (x0 + x1) / 2;
    const path = `M${x0},${sy} C${mx},${sy} ${mx},${ty} ${x1},${ty} L${x1},${ty + thickness} C${mx},${ty + thickness} ${mx},${sy + thickness} ${x0},${sy + thickness} Z`;
    links.push({
      ...link,
      path,
      thickness,
      sourceName: source.name,
      targetName: target.name,
    });
  }

  return { nodes: [...laidNodes.values()], links };
}
