import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  action,
  eyebrow
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-line bg-panel", className)}>
      {(title || action) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>}
            {eyebrow && <p className="shrink-0 text-xs text-muted">{eyebrow}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
