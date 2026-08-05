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
    <section className={cn("overflow-hidden rounded-xl border border-line bg-panel shadow-glow", className)}>
      {(title || action) && (
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {eyebrow && <p className="mb-0.5 text-xs text-muted">{eyebrow}</p>}
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
