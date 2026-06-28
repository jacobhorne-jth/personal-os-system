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
    <section className={cn("overflow-hidden rounded-lg border border-line bg-panel", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {eyebrow && <p className="mb-0.5 text-xs text-muted">{eyebrow}</p>}
            {title && <h2 className="text-sm font-medium text-ink">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
