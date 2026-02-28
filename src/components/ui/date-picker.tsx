"use client";

import { cn } from "@/lib/utils";

type DatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function DatePicker({ label, value, onChange, className }: DatePickerProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
          className
        )}
      />
    </label>
  );
}
