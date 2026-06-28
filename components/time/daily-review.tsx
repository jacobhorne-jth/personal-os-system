"use client";

import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn, formatTime } from "@/lib/utils";

export function DailyReview() {
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const logs = calendarItems.filter((item) => item.type === "time_log" || item.type === "time_block");

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-glow">
      <div className="border-b border-line bg-line px-4 py-3">
        <p className="text-sm font-medium text-ink">Daily time review</p>
        <p className="mt-1 text-xs text-muted">Compare planned blocks against actual logs before closing the day.</p>
      </div>
      <div className="divide-y divide-line">
        {logs.map((item) => {
          const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
          const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
          return (
            <div key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[100px_1fr_90px] sm:items-center">
              <p className="text-xs text-muted">{formatTime(item.startsAt)} - {formatTime(item.endsAt)}</p>
              <div>
                <p className="text-sm text-ink">{item.title}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span className={cn("size-1.5 rounded-full", tone.dot)} />
                  {responsibility?.name}
                </p>
              </div>
              <span className="rounded-md bg-line px-2 py-1 text-center text-xs text-muted">{item.type.replace("_", " ")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
