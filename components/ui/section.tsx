import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  containerClass?: string;
  bleed?: boolean;
}

export function Section({
  children,
  className,
  containerClass,
  bleed = false,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-12 md:py-16 lg:py-24", className)} {...props}>
      <div
        className={cn(
          !bleed && "container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl",
          containerClass,
        )}
      >
        {children}
      </div>
    </section>
  );
}

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6",
        className,
      )}
      {...props}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[13px] font-bold uppercase tracking-widest text-primary md:mb-3">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-4 md:mt-5 text-[15px] md:text-[17px] font-medium text-slate-500 leading-relaxed max-w-xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
