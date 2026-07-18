import { cn } from "@/lib/utils";
import { getTone } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";

export function ColorBadge({ color, children, className }: { color: ResponsibilityColor; children: React.ReactNode; className?: string }) {
  const tone = getTone(color);
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium", className)}
      style={{ backgroundColor: tone.hex, color: tone.eventText }}
    >
      {children}
    </span>
  );
}
