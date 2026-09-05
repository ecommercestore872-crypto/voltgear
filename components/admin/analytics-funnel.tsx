"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FunnelUiStep = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

function formatRate(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

function rateOfTop(count: number, top: number): number | null {
  if (top <= 0) return null;
  return count / top;
}

function MetricCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--g-taupe)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--g-charcoal)]">
        {value}
      </p>
    </div>
  );
}

function FunnelStepRow({
  index,
  step,
  topCount,
  onClick,
}: {
  index: number;
  step: FunnelUiStep;
  topCount: number;
  onClick?: () => void;
}) {
  const ofTop = rateOfTop(step.count, topCount);
  const prevLabel =
    index === 0 ? "—" : formatRate(step.conversionFromPrevious);
  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--g-sage)]/25 text-xs font-semibold text-[var(--g-forest)]"
          aria-hidden
        >
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-[var(--g-charcoal)]">{step.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
            {step.count.toLocaleString()} · {prevLabel} of prev ·{" "}
            {formatRate(ofTop)} of start
          </p>
        </div>
      </div>
      <div className="hidden w-full max-w-md grid-cols-3 gap-4 sm:grid sm:w-auto sm:shrink-0">
        <MetricCell label="Count" value={step.count.toLocaleString()} />
        <MetricCell label="% previous" value={prevLabel} />
        <MetricCell label="% of start" value={formatRate(ofTop)} />
      </div>
    </>
  );

  const className = cn(
    "flex w-full flex-col gap-3 border-b border-[var(--g-line)] px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between",
    onClick &&
      "cursor-pointer text-left transition-colors hover:bg-[var(--g-sage)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function AnalyticsFunnelPanel({
  title,
  description,
  steps,
  empty,
  onStepClick,
}: {
  title: string;
  description: string;
  steps: FunnelUiStep[] | null;
  empty?: ReactNode;
  onStepClick?: (step: FunnelUiStep) => void;
}) {
  const list = steps ?? [];
  const topCount = list[0]?.count ?? 0;

  return (
    <section className="admin-analytics-panel">
      <header className="admin-analytics-panel-head">
        <h2 className="text-lg font-semibold text-[var(--g-charcoal)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--g-taupe)]">{description}</p>
      </header>
      {list.length === 0 ? (
        <div className="px-4 py-6 text-sm text-[var(--g-taupe)]">
          {empty ?? "Not available"}
        </div>
      ) : (
        <div>
          <div className="hidden border-b border-[var(--g-line)] bg-[color-mix(in_srgb,var(--g-cream-deep)_50%,white)] px-4 py-2 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--g-taupe)] sm:grid sm:grid-cols-[1fr_max-content] sm:gap-4">
            <span className="pl-10">Step</span>
            <div className="grid w-full max-w-md grid-cols-3 gap-4">
              <span>Count</span>
              <span>% previous</span>
              <span>% of start</span>
            </div>
          </div>
          {list.map((step, i) => (
            <FunnelStepRow
              key={step.key}
              index={i}
              step={step}
              topCount={topCount}
              onClick={
                onStepClick
                  ? () => onStepClick(step)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
