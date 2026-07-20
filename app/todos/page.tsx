"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CalendarDays, CalendarRange, Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import { cn } from "@/lib/utils";

function formatDue(dueAt: string, today: string) {
  const dateStr = dueAt.slice(0, 10);
  if (dateStr === today) return "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}

function sortByDue(arr: ReturnType<typeof useAppStore.getState>["tasks"]) {
  return [...arr].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

export default function TodosPage() {
  const tasks = useAppStore((s) => s.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const today = localDateKey();
  const [view, setView] = useState<string>("today");
  const [addingTask, setAddingTask] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const open = tasks.filter((t) => t.status !== "done");
  const overdueTasks = sortByDue(open.filter((t) => t.dueAt && t.dueAt.slice(0, 10) < today));
  const todayTasks = sortByDue(open.filter((t) => t.dueAt?.startsWith(today)));
  const upcomingTasks = sortByDue(open.filter((t) => t.dueAt && t.dueAt.slice(0, 10) > today));
  const selectedLabel = view.startsWith("label:") ? view.replace("label:", "") : "";

  const viewTasks =
    view === "today" ? [...overdueTasks, ...todayTasks] :
    view === "upcoming" ? upcomingTasks :
    view === "all" ? sortByDue(open) :
    sortByDue(open.filter((t) => taskLabel(t.labels, t.responsibilityId, responsibilities) === selectedLabel));

  function saveEdit() {
    if (!editing || !editing.title.trim()) return;
    updateTask(editing.id, { title: editing.title.trim() });
    setEditing(null);
  }

  function reschedule(taskId: string, date: string) {
    if (date) updateTask(taskId, { dueAt: `${date}T17:00:00` });
    setRescheduling(null);
  }

  function handleDelete(taskId: string) {
    if (deleteConfirm === taskId) {
      deleteTask(taskId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(taskId);
    }
  }

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
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs tabular-nums text-[#cf4444]">
                <AlertCircle className="size-3" />
                {overdueTasks.length}
              </span>
            )}
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
          {responsibilities.filter((r) => !r.archivedAt).map((r) => {
            const label = r.name;
            const color = taskLabelColor(label, responsibilities);
            const count = open.filter((t) => taskLabel(t.labels, t.responsibilityId, responsibilities) === label).length;
            return (
              <button
                key={r.id}
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
        {/* Mobile view switcher — the sidebar's filters, as a scrollable row */}
        <div className="sticky top-0 z-10 border-b border-[#282828] bg-[#1f1f1f]/95 backdrop-blur lg:hidden">
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              ["today", "Today", overdueTasks.length],
              ["upcoming", "Upcoming", 0],
              ["all", "All", 0],
            ] as const).map(([v, labelText, badge]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                  view === v ? "border-blue bg-blue/15 text-blue" : "border-[#3a3a3a] text-[#999]"
                )}
              >
                {labelText}
                {badge > 0 && <span className="text-xs tabular-nums text-[#cf4444]">{badge}</span>}
              </button>
            ))}
            {responsibilities.filter((r) => !r.archivedAt).map((r) => (
              <button
                key={r.id}
                onClick={() => setView(`label:${r.name}`)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                  view === `label:${r.name}` ? "border-blue bg-blue/15 text-blue" : "border-[#3a3a3a] text-[#999]"
                )}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: taskLabelColor(r.name, responsibilities) }} />
                {r.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="mb-6 flex items-center gap-3">
            {selectedLabel && (
              <span className="size-3 rounded-full" style={{ backgroundColor: taskLabelColor(selectedLabel, responsibilities) }} />
            )}
            <h1 className="text-xl font-semibold text-white">{viewLabel}</h1>
            <span className="text-sm text-[#555]">{viewTasks.length}</span>
          </div>

          {/* Add task form */}
          {addingTask ? (
            <div className="mb-4 rounded-lg border border-[#3a3a3a] bg-[#252525] p-4">
              <QuickCaptureForm
                key={view}
                autoFocus
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
              {viewTasks.map((task, idx) => {
                const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
                const color = taskLabelColor(label, responsibilities);
                const isToday = task.dueAt?.startsWith(today);
                const isOverdue = task.dueAt && task.dueAt.slice(0, 10) < today;
                const isEditing = editing?.id === task.id;

                // Section headers when Today view mixes overdue + today
                const showOverdueHeader = view === "today" && overdueTasks.length > 0 && idx === 0;
                const showTodayHeader = view === "today" && overdueTasks.length > 0 && idx === overdueTasks.length;

                return (
                  <div key={task.id}>
                    {showOverdueHeader && (
                      <p className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-xs font-semibold text-[#cf4444]">
                        <AlertCircle className="size-3.5" /> Overdue
                      </p>
                    )}
                    {showTodayHeader && (
                      <p className="px-2 pb-1 pt-3 text-xs font-semibold text-[#999]">Today</p>
                    )}
                    <div className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition hover:bg-[#282828]">
                      <button
                        onClick={() => toggleTask(task.id)}
                        aria-label="Complete task"
                        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60"
                        style={{ borderColor: color }}
                      />
                      {isEditing ? (
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            autoFocus
                            value={editing?.title ?? ""}
                            onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                            className="h-8 min-w-0 flex-1 rounded-md border border-[#3a3a3a] bg-[#242424] px-2.5 text-sm text-white outline-none focus:border-[#4285f4]"
                          />
                          <button onClick={saveEdit} className="grid size-7 place-items-center rounded text-[#4285f4] hover:bg-[#333]"><Check className="size-4" /></button>
                          <button onClick={() => setEditing(null)} className="grid size-7 place-items-center rounded text-[#999] hover:bg-[#333]"><X className="size-4" /></button>
                        </div>
                      ) : (
                        <>
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
                              {task.recurrence && (
                                <span className="flex items-center gap-1 text-xs text-[#666]">
                                  <RefreshCw className="size-3" />
                                  {task.recurrence}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-[#666]">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                                {label}
                              </span>
                            </div>
                          </Link>
                          {/* Hover actions */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 transition lg:group-hover:opacity-100">
                            {rescheduling === task.id ? (
                              <input
                                autoFocus
                                type="date"
                                defaultValue={task.dueAt?.slice(0, 10) ?? today}
                                onChange={(e) => reschedule(task.id, e.target.value)}
                                onBlur={() => setRescheduling(null)}
                                className="h-7 rounded-md border border-[#3a3a3a] bg-[#242424] px-1.5 text-xs text-white outline-none"
                              />
                            ) : (
                              <button
                                onClick={() => { setRescheduling(task.id); setDeleteConfirm(null); }}
                                title="Reschedule"
                                className="grid size-7 place-items-center rounded text-[#777] hover:bg-[#333] hover:text-white"
                              >
                                <CalendarRange className="size-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditing({ id: task.id, title: task.title }); setDeleteConfirm(null); setRescheduling(null); }}
                              title="Edit"
                              className="grid size-7 place-items-center rounded text-[#777] hover:bg-[#333] hover:text-white"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              title="Delete"
                              className={cn(
                                "grid h-7 place-items-center rounded transition",
                                deleteConfirm === task.id ? "bg-[#cf4444]/15 px-1.5 text-xs text-[#cf4444]" : "size-7 text-[#777] hover:bg-[#333] hover:text-[#cf4444]"
                              )}
                            >
                              {deleteConfirm === task.id ? "Confirm" : <Trash2 className="size-3.5" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
