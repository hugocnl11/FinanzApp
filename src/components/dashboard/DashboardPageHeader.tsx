import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  className?: string;
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  titleId,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id={titleId}
          className="truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="mt-1 text-[11px] text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
