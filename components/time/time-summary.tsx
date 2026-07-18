"use client";

import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";

export function TimeSummary() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  return (
    <div className="space-y-3 p-4">
      {responsibilities.slice(0, 4).map((item) => {
        const percent = Math.min(100, Math.round((item.actualHoursThisWeek / item.weeklyGoalHours) * 100));
        return (
          <div key={item.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-ink">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: getTone(item.color).hex }} />
                {item.name}
              </span>
              <span className="text-muted">{item.actualHoursThisWeek}h / {item.plannedHoursThisWeek}h planned</span>
            </div>
            <div className="h-2 rounded-full bg-line p-0.5">
              <div className="h-full rounded-full" style={{ backgroundColor: getTone(item.color).hex, width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
