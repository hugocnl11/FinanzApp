"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type AnimatedProgressProps = {
  value: number;
  className?: string;
  indicatorClassName?: string;
};

export function AnimatedProgress({ value, className, indicatorClassName }: AnimatedProgressProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCurrent(value);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <Progress
      value={current}
      className={cn("transition-all duration-500 ease-out [&>div]:transition-all [&>div]:duration-1000", className)}
      data-indicator-class={indicatorClassName}
    />
  );
}
