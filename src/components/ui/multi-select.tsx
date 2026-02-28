"use client";

import { cn } from "@/lib/utils";

type MultiSelectOption = {
  label: string;
  value: string;
};

type MultiSelectProps = {
  label?: string;
  value: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  className?: string;
};

export function MultiSelect({ label, value, options, onChange, className }: MultiSelectProps) {
  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
      return;
    }
    onChange([...value, optionValue]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleValue(option.value)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              value.includes(option.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
