"use client";

import Link from "next/link";
import { DailyReview } from "@/components/time/daily-review";
import { TimerControl } from "@/components/time/timer-control";
import { Panel } from "@/components/ui/panel";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const totalActual = responsibilities.reduce((sum, item) => sum + item.actualHoursThisWeek, 0);
  const totalPlanned = responsibilities.reduce((sum, item) => sum + item.plannedHoursThisWeek, 0);
  const focusBlocks = calendarItems.filter((item) => item.type === "time_block").length;
  const timeLogs = calendarItems.filter((item) => item.type === "time_log").length;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-line bg-panel p-5 shadow-glow">
        <p className="text-sm text-muted">Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Planned vs actual</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Planned vs actual across responsibilities, tasks, planned blocks, and logged time this week.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
          <p className="text-3xl font-semibold text-ink">{totalActual}h</p>
          <p className="mt-1 text-sm text-muted">tracked this week</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
          <p className="text-3xl font-semibold text-ink">{totalPlanned}h</p>
          <p className="mt-1 text-sm text-muted">planned this week</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
          <p className="text-3xl font-semibold text-ink">{tasks.filter((task) => task.status !== "done").length}</p>
          <p className="mt-1 text-sm text-muted">open tasks</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
          <p className="text-3xl font-semibold text-ink">{focusBlocks}/{timeLogs}</p>
          <p className="mt-1 text-sm text-muted">planned/logged blocks</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="Responsibility Load" eyebrow="weekly balance">
            <div className="divide-y divide-line">
              {responsibilities.map((item) => {
                const tone = responsibilityTone[item.color];
                const itemTasks = tasks.filter((task) => task.responsibilityId === item.id && task.status !== "done").length;
                return (
                  <Link key={item.id} href={`/r/${item.id}`} className="grid gap-3 px-4 py-4 transition hover:bg-line sm:grid-cols-[180px_1fr_90px] sm:items-center">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        <span className={cn("size-1.5 rounded-full", tone.dot)} />
                        {item.name}
                      </p>
                      <p className="text-xs text-muted">{itemTasks} open tasks</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="mb-1 text-[11px] text-muted">Planned</div>
                        <div className="h-2 rounded-full bg-line">
                          <div className="h-full rounded-full bg-blue" style={{ width: `${Math.min(100, (item.plannedHoursThisWeek / item.weeklyGoalHours) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] text-muted">Actual</div>
                        <div className="h-2 rounded-full bg-line">
                          <div className={cn("h-full rounded-full", tone.dot)} style={{ width: `${Math.min(100, (item.actualHoursThisWeek / item.weeklyGoalHours) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-right text-sm text-muted">{item.actualHoursThisWeek}h</p>
                  </Link>
                );
              })}
            </div>
          </Panel>
          <DailyReview />
        </div>
        <div className="space-y-4">
          <TimerControl />
          <Panel title="This week" eyebrow="weekly summary">
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-lg border border-line bg-line p-3">
                <p className="text-2xl font-semibold text-ink">{totalActual}h</p>
                <p className="text-xs text-muted">tracked</p>
              </div>
              <div className="rounded-lg border border-line bg-line p-3">
                <p className="text-2xl font-semibold text-ink">{Math.max(0, totalPlanned - totalActual)}h</p>
                <p className="text-xs text-muted">remaining plan</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
