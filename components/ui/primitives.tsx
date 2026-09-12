import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Buttons ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md";

export function buttonClass({
  variant = "secondary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
    size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
    variant === "primary" && "bg-ink text-paper hover:bg-ink/85",
    variant === "accent" && "bg-accent text-white hover:bg-accent/90",
    variant === "secondary" && "border border-line bg-panel text-ink hover:bg-hover",
    variant === "ghost" && "text-muted hover:bg-hover hover:text-ink",
    variant === "danger" && "border border-line bg-panel text-danger hover:border-danger/40 hover:bg-danger/10",
    className
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export function iconButtonClass(className?: string) {
  return cn(
    "grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-30",
    className
  );
}

export function IconButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} className={iconButtonClass(className)} {...props} />;
}

// ─── Page scaffolding ─────────────────────────────────────────────────────────

export function Page({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: "narrow" | "default" | "wide" | "full";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[1440px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-medium text-muted">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// ─── Surfaces ─────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-line bg-panel", className)}>{children}</section>;
}

export function CardHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        {meta !== undefined && meta !== null && <span className="shrink-0 text-xs tabular-nums text-muted">{meta}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mb-2 px-1 text-[13px] font-semibold text-muted", className)}>{children}</h2>;
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  label,
}: {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-lg bg-hover p-0.5 no-scrollbar", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              active ? "bg-panel text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-muted hover:text-ink"
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className={cn("tabular-nums", active ? "text-muted" : "text-subtle")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const inputClass =
  "h-9 w-full min-w-0 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-ink/25 focus:ring-2 focus:ring-ink/[0.06]";

export const textareaClass =
  "w-full min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-subtle focus:border-ink/25 focus:ring-2 focus:ring-ink/[0.06]";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

// ─── Display ──────────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ElementType;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-hover text-muted">
          <Icon className="size-[18px]" />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[13px] leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-panel px-4 py-3.5", className)}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.01em] text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-md bg-hover px-1.5 text-[11px] font-medium tabular-nums text-muted", className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-hover", className)}>
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
