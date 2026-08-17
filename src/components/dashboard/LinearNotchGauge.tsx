"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

type LinearNotchGaugeProps = {
  value: number;
  notches?: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  label?: string;
};

export function LinearNotchGauge({
  value,
  notches = 28,
  className,
  trackClassName,
  fillClassName = "bg-primary",
  label,
}: LinearNotchGaugeProps) {
  const percent = clampPercent(value);
  const filled = Math.round((percent / 100) * notches);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("flex h-2.5 w-full items-stretch gap-[2px]", trackClassName)}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={label}
      >
        {Array.from({ length: notches }, (_, index) => {
          const isOn = index < filled;
          return (
            <motion.span
              key={index}
              className={cn(
                "block h-2.5 min-h-2.5 min-w-0 flex-1 origin-bottom rounded-[1.5px]",
                isOn ? fillClassName : "bg-border"
              )}
              initial={{ opacity: 0.35, scaleY: 0.55 }}
              animate={{
                opacity: isOn ? 1 : 0.55,
                scaleY: 1,
              }}
              transition={{
                duration: 0.28,
                delay: 0.04 + index * 0.012,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
