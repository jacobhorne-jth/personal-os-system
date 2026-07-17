"use client";

import { useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { localDateKey, formatDateHeading } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import { cn } from "@/lib/utils";

const dateFilters = ["Today", "All"] as const;

function taskDate(taskDate?: string) {
  return taskDate?.slice(0, 10);
}

function matchesDate(filter: (typeof dateFilters)[number], today: string, dueAt?: string) {
  const due = taskDate(dueAt);
  if (filter === "All") return true;
  // "Today" includes overdue — they're still today's reality
  return due !== undefined && due <= today;
}

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);

  const [dateFilter, setDateFilter] = useState<(typeof dateFilters)[number]>("Today");
  const [labelFilter, setLabelFilter] = useState("all");
  const today = localDateKey();
  const todayHeading = formatDateHeading();

  const filteredTasks = tasks
    .filter((task) => {
      const statusMatch = task.status !== "done";
      const labelMatch = labelFilter === "all" || taskLabel(task.labels, task.responsibilityId, responsibilities) === labelFilter;
      return statusMatch && labelMatch && matchesDate(dateFilter, today, task.dueAt);
    })
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-y-auto bg-[#1f1f1f] xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-visible">
      <main className="min-h-[70dvh] min-w-0 xl:min-h-0">
        <FullCalendarBoard />
      </main>

      <aside className="flex min-h-0 flex-col border-t border-[#303134] bg-[#1f1f1f] [--panel-inset:20px] xl:border-l xl:border-t-0">
        <div className="shrink-0 border-b border-[#303134] px-[var(--panel-inset)] py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#e8eaed]">{todayHeading}</p>
            <span className="text-xs text-[#9aa0a6]">{filteredTasks.length} visible</span>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-b border-[#303134] p-[var(--panel-inset)]">
          <div className="grid grid-cols-2 gap-2">
            {dateFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-medium transition",
                  dateFilter === filter
                    ? "border-blue bg-blue/15 text-blue"
                    : "border-[#3c4043] text-[#bdc1c6] hover:text-[#e8eaed]"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-md border border-[#3c4043] bg-[#282a2d] px-2">
            <Search className="size-3.5 text-[#bdc1c6]" />
            <select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#bdc1c6] outline-none">
              <option value="all">All labels</option>
              {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {filteredTasks.length === 0 ? (
            <p className="p-[var(--panel-inset)] text-sm text-[#9aa0a6]">No tasks match these filters.</p>
          ) : (
            <div className="divide-y divide-[#303134]">
              {filteredTasks.map((task) => {
                const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
                const labelColor = taskLabelColor(label, responsibilities);
                return (
                  <div key={task.id} className="flex items-start gap-3 px-[var(--panel-inset)] py-3 transition hover:bg-[#282a2d]">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
                      className={cn("mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60", task.status === "done" && "bg-mint")}
                      style={{ borderColor: task.status === "done" ? "#34a853" : labelColor }}
                    >
                      {task.status === "done" && <CheckCircle2 className="size-3 text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#e8eaed]">{task.title}</p>
                      {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-[#9aa0a6]">{task.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#9aa0a6]">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: labelColor }} />
                          {label}
                        </span>
                        {task.dueAt && (
                          <span className={cn(taskDate(task.dueAt)! < today && "font-medium text-[#cf4444]")}>
                            {taskDate(task.dueAt)! < today ? "Overdue · " : ""}
                            {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#303134] bg-[#1f1f1f] p-[var(--panel-inset)]">
          <QuickCaptureForm
            dueAt={`${today}T17:00:00`}
            inputClassName="border-[#3c4043] bg-[#282a2d] text-[#e8eaed] [&_input]:text-[#e8eaed] [&_input::placeholder]:text-[#9aa0a6] [&_svg]:text-[#bdc1c6]"
            selectClassName="border-[#3c4043] bg-[#282a2d] text-[#bdc1c6]"
            dateClassName="border-[#3c4043] bg-[#282a2d] text-[#bdc1c6]"
            descriptionClassName="border-[#3c4043] bg-[#282a2d] text-[#e8eaed] placeholder:text-[#9aa0a6]"
          />
        </div>
      </aside>
    </div>
  );
}
