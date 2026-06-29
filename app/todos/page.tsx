"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarRange, Plus } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor, taskLabels } from "@/lib/task-labels";
import { cn } from "@/lib/utils";

function formatDue(dueAt: string, today: string) {
  const dateStr = dueAt.slice(0, 10);
  if (dateStr === today) return "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TodosPage() {
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);

  const today = localDateKey();
  const [view, setView] = useState<string>("today");
  const [addingTask, setAddingTask] = useState(false);

  const open = tasks.filter((t) => t.status !== "done");
  const todayTasks = open.filter((t) => t.dueAt?.startsWith(today));
  const upcomingTasks = open.filter((t) => t.dueAt && t.dueAt.slice(0, 10) > today);
  const selectedLabel = view.startsWith("label:") ? view.replace("label:", "") : "";

  const viewTasks =
    view === "today" ? todayTasks :
    view === "upcoming" ? upcomingTasks :
    view === "all" ? open :
    open.filter((t) => taskLabel(t.labels, t.responsibilityId) === selectedLabel);

  const viewLabel =
    view === "today" ? "Today" :
    view === "upcoming" ? "Upcoming" :
    view === "all" ? "All tasks" :
    selectedLabel;

  return (
    <div className="-mx-4 -mt-4 flex min-h-dvh sm:-mx-6 lg:-ml-[24px] lg:-mr-8 lg:-mt-4">
      {/* Todoist-style left sidebar */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#282828] bg-[#1a1a1a] py-3 lg:flex">
        <div className="mb-2 px-3">
          <button
            onClick={() => setAddingTask(true)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#dd4b39] transition hover:bg-[#242424]"
          >
            <Plus className="size-4" />
            Add task
          </button>
        </div>

        <nav className="space-y-0.5 px-2">
          <button
            onClick={() => setView("today")}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              view === "today" ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-[#dd4b39]" />
            <span className="flex-1 text-left">Today</span>
            {todayTasks.length > 0 && <span className="text-xs tabular-nums text-[#666]">{todayTasks.length}</span>}
          </button>
          <button
            onClick={() => setView("upcoming")}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              view === "upcoming" ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
            )}
          >
            <CalendarRange className="size-4 shrink-0 text-[#7b68ee]" />
            <span className="flex-1 text-left">Upcoming</span>
            {upcomingTasks.length > 0 && <span className="text-xs tabular-nums text-[#666]">{upcomingTasks.length}</span>}
          </button>
          <button
            onClick={() => setView("all")}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              view === "all" ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
            )}
          >
            <Plus className="size-4 shrink-0 text-[#999]" />
            <span className="flex-1 text-left">All</span>
            {open.length > 0 && <span className="text-xs tabular-nums text-[#666]">{open.length}</span>}
          </button>
        </nav>

        <div className="my-3 mx-4 h-px bg-[#2c2c2c]" />

        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-[#444]">Labels</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {taskLabels.map((label) => {
            const color = taskLabelColor(label);
            const count = open.filter((t) => taskLabel(t.labels, t.responsibilityId) === label).length;
            return (
              <button
                key={label}
                onClick={() => setView(`label:${label}`)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  view === `label:${label}` ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 truncate text-left">{label}</span>
                {count > 0 && <span className="text-xs tabular-nums text-[#555]">{count}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#1f1f1f]">
        <div className="mx-auto w-full max-w-2xl px-6 py-7">
          <div className="mb-6 flex items-center gap-3">
            {selectedLabel && (
              <span className="size-3 rounded-full" style={{ backgroundColor: taskLabelColor(selectedLabel) }} />
            )}
            <h1 className="text-xl font-semibold text-white">{viewLabel}</h1>
            <span className="text-sm text-[#555]">{viewTasks.length}</span>
          </div>

          {/* Add task form */}
          {addingTask ? (
            <div className="mb-4 rounded-lg border border-[#3a3a3a] bg-[#252525] p-4">
              <QuickCaptureForm
                key={view}
                defaultLabel={selectedLabel || undefined}
                dueAt={view === "today" ? `${today}T17:00:00` : undefined}
                placeholder="Title"
                onComplete={() => setAddingTask(false)}
                inputClassName="border-[#3a3a3a] bg-[#333] [&_input]:text-white [&_input::placeholder]:text-[#555]"
                selectClassName="border-[#3a3a3a] bg-[#333] text-[#999]"
                dateClassName="border-[#3a3a3a] bg-[#333] text-[#999]"
                descriptionClassName="border-[#3a3a3a] bg-[#333] text-white placeholder:text-[#555]"
              />
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAddingTask(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-sm text-[#777] transition hover:bg-[#333] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="mb-4 flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-sm text-[#555] transition hover:text-[#999] group"
            >
              <span className="grid size-5 place-items-center rounded-full border-[1.5px] border-[#3a3a3a] text-[#555] transition group-hover:border-[#555] group-hover:text-[#999]">
                <Plus className="size-3" />
              </span>
              Add task
            </button>
          )}

          {/* Task list */}
          {viewTasks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#444]">
                {view === "today" ? "Nothing due today." : view === "upcoming" ? "Nothing upcoming." : "No tasks in this view."}
              </p>
            </div>
          ) : (
            <div>
              {viewTasks.map((task) => {
                const label = taskLabel(task.labels, task.responsibilityId);
                const color = taskLabelColor(label);
                const isToday = task.dueAt?.startsWith(today);
                const isOverdue = task.dueAt && task.dueAt.slice(0, 10) < today;

                return (
                  <div key={task.id} className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition hover:bg-[#282828]">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label="Complete task"
                      className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60"
                      style={{ borderColor: color }}
                    />
                    <Link href={`/task/${task.id}`} className="min-w-0 flex-1">
                      <p className="text-sm text-[#ddd]">{task.title}</p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#666]">{task.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2.5">
                        {task.dueAt && (
                          <span className={cn("flex items-center gap-1 text-xs",
                            isOverdue ? "text-[#cf4444]" : isToday ? "text-[#cc9a2a]" : "text-[#666]"
                          )}>
                            <CalendarDays className="size-3" />
                            {formatDue(task.dueAt, today)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[#666]">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
