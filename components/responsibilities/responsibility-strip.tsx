"use client";

import Link from "next/link";
import { ColorBadge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/stores/app-store";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ResponsibilityStrip() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const updateResponsibilityColor = useAppStore((state) => state.updateResponsibilityColor);
  return (
    <div className="flex gap-3 overflow-x-auto p-4 no-scrollbar">
      {responsibilities.filter((resp) => !resp.archivedAt).map((item) => (
        <Link
          href={`/r/${item.id}`}
          key={item.id}
          className="group relative min-w-[190px] overflow-hidden rounded-lg border border-line bg-[#303134] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-muted hover:bg-[#4a4d52]"
        >
          <span className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: getTone(item.color).hex }} />
          <ColorBadge color={item.color}>{item.name}</ColorBadge>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xl font-semibold text-ink">{item.actualHoursThisWeek}h</p>
              <p className="text-xs text-muted">of {item.weeklyGoalHours}h goal</p>
            </div>
            <p className="text-xs text-muted">{item.taskCount} tasks</p>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-line">
            <div className="h-full rounded-full" style={{ backgroundColor: getTone(item.color).hex, width: `${Math.min(100, (item.actualHoursThisWeek / item.weeklyGoalHours) * 100)}%` }} />
          </div>
          <div className="mt-3">
            <ResponsibilityColorPicker value={item.color} onChange={(color) => updateResponsibilityColor(item.id, color)} compact />
          </div>
        </Link>
      ))}
    </div>
  );
}
