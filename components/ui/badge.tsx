import { cn } from "@/lib/utils";
import { responsibilityTone } from "@/lib/theme";

export function ColorBadge({ color, children, className }: { color: keyof typeof responsibilityTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ring-1", responsibilityTone[color].chip, className)}>
      {children}
    </span>
  );
}
