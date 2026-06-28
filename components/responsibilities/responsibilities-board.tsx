"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { ColorBadge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ResponsibilitiesBoard() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const updateResponsibilityColor = useAppStore((state) => state.updateResponsibilityColor);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-line bg-panel p-5 shadow-glow">
        <p className="text-sm text-muted">Responsibilities</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Your operating areas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Customize each label color. Events tied to that responsibility update immediately.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {responsibilities.map((item) => (
          <Link
            key={item.id}
            href={`/responsibilities/${item.id}`}
            className="group relative overflow-visible rounded-lg border border-line bg-panel p-4 shadow-glow transition duration-200 hover:-translate-y-0.5 hover:border-muted hover:bg-[#303134]"
          >
            <span className={cn("absolute inset-x-0 top-0 h-1", responsibilityTone[item.color].dot)} />
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <ColorBadge color={item.color}>{item.name}</ColorBadge>
                <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              </div>
              <span className="rounded-md bg-line px-2 py-1 text-xs text-muted">{item.weeklyGoalHours}h goal</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-[#242528] p-3">
              <p className="text-xs font-medium text-muted">Label color</p>
              <ResponsibilityColorPicker value={item.color} onChange={(color) => updateResponsibilityColor(item.id, color)} showLabels />
            </div>
            <div className="mt-5 h-2 rounded-full bg-line p-0.5">
              <div className={cn("h-full rounded-full", responsibilityTone[item.color].dot)} style={{ width: `${Math.min(100, (item.actualHoursThisWeek / item.weeklyGoalHours) * 100)}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-muted">
              <div className="rounded-md border border-line bg-[#303134] p-2">
                <Clock3 className={cn("mb-2 size-4", responsibilityTone[item.color].text)} />
                <p className="text-ink">{item.actualHoursThisWeek}h</p>
                <p>tracked</p>
              </div>
              <div className="rounded-md border border-line bg-[#303134] p-2">
                <CheckCircle2 className="mb-2 size-4 text-mint" />
                <p className="text-ink">{item.taskCount}</p>
                <p>tasks</p>
              </div>
              <div className="rounded-md border border-line bg-[#303134] p-2">
                <CalendarDays className="mb-2 size-4 text-blue" />
                <p className="text-ink">{item.upcomingCount}</p>
                <p>upcoming</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Panel title="System behavior" eyebrow="architecture">
        <div className="grid gap-3 p-4 text-sm text-muted md:grid-cols-3">
          <p>Every task, note, file, event, and time log can be attached to one responsibility.</p>
          <p>Capture can stay uncategorized until review, keeping intake fast.</p>
          <p>Responsibility pages auto-filter the entire app surface into one focused workspace.</p>
        </div>
      </Panel>
    </div>
  );
}
