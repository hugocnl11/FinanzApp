"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GoalMilestone } from "@/lib/dashboard/types";

function chartSizeForCount(count: number) {
  const n = Math.max(1, count);
  const padding = 26;
  const stroke = 12;
  const gap = 8;
  const inner = 48;
  const outer = inner + (n - 1) * (stroke + gap) + stroke;
  const fromRings = (outer + padding) * 2;
  const fromLegend = n * 68;
  return Math.round(Math.min(340, Math.max(208, Math.max(fromRings, Math.min(fromLegend + 16, 340)))));
}

export const RING_FALLBACK_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export type GoalsRingItem = {
  id: string;
  label: string;
  percent: number;
  saved: number;
  color?: string;
  milestones?: GoalMilestone[];
  target: number;
  isBudget?: boolean;
};

type GoalsRingChartProps = {
  items: GoalsRingItem[];
  completed: number;
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
  className?: string;
};

function clampProgress(percent: number) {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(1, Math.max(0, percent / 100));
}

function polar(center: number, radius: number, angle: number) {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

const MILESTONE_EPSILON = 1e-6;

function isMilestoneReached(item: GoalsRingItem, amount: number) {
  if (!Number.isFinite(amount)) return false;
  const saved = Number(item.saved);
  const fromSaved = Number.isFinite(saved) && saved + MILESTONE_EPSILON >= amount;
  const target = Number(item.target);
  const percent = Number(item.percent);
  const fromPercent =
    Number.isFinite(target) &&
    Number.isFinite(percent) &&
    (percent / 100) * target + MILESTONE_EPSILON >= amount;
  return fromSaved || fromPercent;
}

function RingLayer({
  index,
  item,
  center,
  radius,
  strokeWidth,
  isHovered,
  isFaded,
  onHoverChange,
}: {
  index: number;
  item: GoalsRingItem;
  center: number;
  radius: number;
  strokeWidth: number;
  isHovered: boolean;
  isFaded: boolean;
  onHoverChange: (index: number | null) => void;
}) {
  const progress = clampProgress(item.percent);
  const circumference = 2 * Math.PI * radius;
  const color = item.color || RING_FALLBACK_COLORS[index % RING_FALLBACK_COLORS.length];

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{
        opacity: isFaded ? 0.35 : 1,
        scale: isHovered ? 1.03 : 1,
      }}
      transition={{
        opacity: { duration: 0.18 },
        scale: { type: "spring", stiffness: 380, damping: 26 },
        delay: index * 0.06,
      }}
      style={{ transformOrigin: `${center}px ${center}px`, cursor: "pointer" }}
      onMouseEnter={() => onHoverChange(index)}
      onMouseLeave={() => onHoverChange(null)}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={strokeWidth}
      />
      {progress > 0.004 ? (
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.9, delay: 0.12 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            filter: isHovered ? `drop-shadow(0 0 10px ${color})` : "none",
          }}
        />
      ) : null}
      {item.milestones?.map((milestone, mi) => {
        const target = Number(item.target) || 0;
        const amount = Number(milestone.amount);
        if (target <= 0 || !Number.isFinite(amount) || amount <= 0) return null;
        const pct = Math.min(1, Math.max(0, amount / target));
        const angle = -Math.PI / 2 + pct * 2 * Math.PI;
        const { x, y } = polar(center, radius, angle);
        return (
          <MilestoneMarker
            key={`${item.id}-ms-${mi}`}
            x={x}
            y={y}
            label={Math.round(amount).toLocaleString("es-ES")}
            color={color}
            reached={isMilestoneReached(item, amount)}
            isHovered={isHovered}
          />
        );
      })}
    </motion.g>
  );
}

function MilestoneMarker({
  x,
  y,
  label,
  color,
  reached,
  isHovered,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  reached: boolean;
  isHovered: boolean;
}) {
  return (
    <g
      style={{
        filter: isHovered ? `drop-shadow(0 0 10px ${color})` : "none",
      }}
    >
      <title>{`Hito: ${label} €`}</title>
      <circle
        cx={x}
        cy={y}
        r={5.5}
        fill="hsl(var(--background))"
        stroke={color}
        strokeOpacity={reached ? 1 : 0.5}
        strokeWidth={1.75}
      />
      {reached ? (
        <>
          <circle cx={x} cy={y} r={5.5} fill={color} fillOpacity={0.22} stroke="none" />
          <path
            d="M-3.5 -0.5 L-1.5 2 L3.5 -2.5"
            transform={`translate(${x} ${y})`}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </g>
  );
}

function RingChartInner({
  width,
  height,
  items,
  completed,
  hoveredIndex,
  onHoverChange,
}: {
  width: number;
  height: number;
  items: GoalsRingItem[];
  completed: number;
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
}) {
  const size = Math.min(width, height);
  if (size < 40 || items.length === 0) return null;

  const center = size / 2;
  const padding = 22;
  const availableRadius = Math.max(24, center - padding);
  const ringCount = items.length;
  const designStroke = 12;
  const designGap = 8;
  const designInner = 52;
  const designOuter =
    designInner + (ringCount - 1) * (designStroke + designGap) + designStroke;
  const scale = Math.min(1, availableRadius / designOuter);
  const strokeWidth = Math.max(6, designStroke * scale);
  const ringGap = Math.max(5, designGap * scale);
  const baseInnerRadius = Math.max(28, designInner * scale);

  const hovered = hoveredIndex != null ? items[hoveredIndex] : null;

  return (
    <div className="relative mx-auto overflow-visible" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible" aria-hidden="true">
        {items.map((item, index) => {
          const radius = baseInnerRadius + index * (strokeWidth + ringGap) + strokeWidth / 2;
          return (
            <RingLayer
              key={item.id}
              index={index}
              item={item}
              center={center}
              radius={radius}
              strokeWidth={strokeWidth}
              isHovered={hoveredIndex === index}
              isFaded={hoveredIndex != null && hoveredIndex !== index}
              onHoverChange={onHoverChange}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="flex flex-col items-center justify-center px-3 text-center"
          style={{ width: Math.max(64, baseInnerRadius * 2 - 16) }}
        >
          {hovered ? (
            <>
              <p className="text-xl font-bold tabular-nums leading-none sm:text-2xl">
                {Math.round(hovered.percent)}%
              </p>
              <p className="mt-1 max-w-full truncate text-[11px] leading-tight text-muted-foreground">
                {hovered.label}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold tabular-nums leading-none sm:text-2xl">
                {completed}/{items.length}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                Completados
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoalsRingChart({
  items,
  completed,
  hoveredIndex,
  onHoverChange,
  className,
}: GoalsRingChartProps) {
  const size = chartSizeForCount(items.length);

  return (
    <div
      className={cn("relative mx-auto overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      <RingChartInner
        width={size}
        height={size}
        items={items}
        completed={completed}
        hoveredIndex={hoveredIndex}
        onHoverChange={onHoverChange}
      />
    </div>
  );
}
