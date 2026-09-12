"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarRange, Check, ChevronDown, CheckCircle2, Layers, Pencil, Trash2, X } from "lucide-react";
import { DueDatePicker } from "@/components/capture/due-date-picker";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { TaskRow, dueDayLabel } from "@/components/tasks/task-row";
import { Card, EmptyState, Page, PageHeader, iconButtonClass } from "@/components/ui/primitives";
import { addDays, dateFromKey, dateKeyOf, localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import type { Task } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function sortByDue(arr: Task[]) {
  return [...arr].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

type TaskGroup = { key: string; label: string; detail?: string; danger?: boolean; tasks: Task[] };

// Overdue first, then one group per due day, then undated
function groupByDay(list: Task[], today: string): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const task of list) {
    let group: Omit<TaskGroup, "tasks">;
    if (!task.dueAt) {
      group = { key: "none", label: "No date" };
    } else {
      const day = dateKeyOf(task.dueAt);
      if (day < today) {
        group = { key: "overdue", label: "Overdue", danger: true };
      } else {
        const date = dateFromKey(day);
        const nearby = day <= addDays(today, 6);
        group = {
          key: day,
          label: dueDayLabel(task.dueAt, today),
          detail: nearby ? date.toLocaleDateString("en-US", { weekday: day === today ? "short" : undefined, month: "short", day: "numeric" }) : undefined,
        };
      }
    }
    const existing = groups.get(group.key) ?? { ...group, tasks: [] };
    existing.tasks.push(task);
    groups.set(group.key, existing);
  }
  const rank = (key: string) => (key === "overdue" ? 0 : key === "none" ? 2 : 1);
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
}

export default function TasksPage() {
  const tasks = useAppStore((s) => s.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const today = localDateKey();
  const [view, setView] = useState<string>("today");
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const open = tasks.filter((t) => t.status !== "done");
  const overdueTasks = sortByDue(open.filter((t) => t.dueAt && dateKeyOf(t.dueAt) < today));
  const todayTasks = sortByDue(open.filter((t) => t.dueAt && dateKeyOf(t.dueAt) === today));
  const todayTotal = overdueTasks.length + todayTasks.length;
  const upcomingTasks = sortByDue(open.filter((t) => t.dueAt && dateKeyOf(t.dueAt) > today));
  const selectedLabel = view.startsWith("label:") ? view.replace("label:", "") : "";
  const labels = responsibilities.filter((r) => !r.archivedAt);
  const labelOf = (t: Task) => taskLabel(t.labels, t.responsibilityId, responsibilities);

  const viewTasks =
    view === "today" ? [...overdueTasks, ...todayTasks] :
    view === "upcoming" ? upcomingTasks :
    view === "all" ? sortByDue(open) :
    sortByDue(open.filter((t) => labelOf(t) === selectedLabel));

  const completedTasks = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done");
    if (view === "today") return done.filter((t) => t.dueAt && dateKeyOf(t.dueAt) === today);
    if (view === "upcoming") return [];
    if (view === "all") return done.slice(0, 30);
    return done.filter((t) => labelOf(t) === selectedLabel).slice(0, 30);
    // labelOf closes over responsibilities
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, view, today, selectedLabel, responsibilities]);

  const groups = groupByDay(viewTasks, today);

  function saveEdit() {
    if (!editing) return;
    const title = editing.title.trim();
    if (title) updateTask(editing.id, { title });
    setEditing(null);
  }

  function reschedule(taskId: string, date: string | null) {
    updateTask(taskId, { dueAt: date ? `${date}T17:00:00` : undefined });
  }

  function handleDelete(taskId: string) {
    if (deleteConfirm === taskId) {
      deleteTask(taskId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(taskId);
    }
  }

  const views = [
    { id: "today", label: "Today", icon: CalendarDays, count: todayTotal },
    { id: "upcoming", label: "Upcoming", icon: CalendarRange, count: upcomingTasks.length },
    { id: "all", label: "All tasks", icon: Layers, count: open.length },
  ];

  const viewTitle =
    view === "today" ? "Today" :
    view === "upcoming" ? "Upcoming" :
    view === "all" ? "All tasks" :
    selectedLabel;
  const viewDescription =
    view === "today"
      ? overdueTasks.length
        ? `${todayTasks.length} due today · ${overdueTasks.length} overdue`
        : `${todayTasks.length} due · ${dateFromKey(today).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
      : `${viewTasks.length} open`;

  function renderRow(task: Task) {
    if (editing?.id === task.id) {
      return (
        <div key={task.id} className="flex items-center gap-2 px-3 py-2">
          <input
            autoFocus
            value={editing.title}
            onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") setEditing(null);
            }}
            aria-label="Task title"
            className="h-8 min-w-0 flex-1 rounded-md border border-line bg-panel px-2.5 text-sm text-ink outline-none focus:border-ink/25"
          />
          <button onClick={saveEdit} title={`Save ${task.title}`} aria-label={`Save ${task.title}`} className={iconButtonClass("size-7 text-ink")}>
            <Check className="size-4" />
          </button>
          <button onClick={() => setEditing(null)} title={`Cancel editing ${task.title}`} aria-label={`Cancel editing ${task.title}`} className={iconButtonClass("size-7")}>
            <X className="size-4" />
          </button>
        </div>
      );
    }
    return (
      <TaskRow
        key={task.id}
        task={task}
        showDue={view !== "today" || dateKeyOf(task.dueAt ?? today) < today}
        actions={
          // Phones open the task for edit/reschedule/delete instead of a row of icons
          <div className="hidden shrink-0 items-center gap-0.5 transition-opacity lg:flex lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
            <DueDatePicker variant="icon" value={task.dueAt ? dateKeyOf(task.dueAt) : null} onChange={(date) => reschedule(task.id, date)} />
            <button
              onClick={() => { setEditing({ id: task.id, title: task.title }); setDeleteConfirm(null); }}
              title={`Edit ${task.title}`}
              aria-label={`Edit ${task.title}`}
              className={iconButtonClass("size-7")}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              title={`${deleteConfirm === task.id ? "Confirm deleting" : "Delete"} ${task.title}`}
              aria-label={`${deleteConfirm === task.id ? "Confirm deleting" : "Delete"} ${task.title}`}
              className={
                deleteConfirm === task.id
                  ? "h-7 rounded-md bg-danger/10 px-2 text-xs font-medium text-danger"
                  : iconButtonClass("size-7 hover:text-danger")
              }
            >
              {deleteConfirm === task.id ? "Delete?" : <Trash2 className="size-3.5" />}
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-8 lg:flex">
        <p className="mb-1 px-2.5 text-[11px] font-medium text-subtle">Views</p>
        <div className="space-y-0.5">
          {views.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                  active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "today" && overdueTasks.length > 0 && <span className="size-1.5 rounded-full bg-danger" title={`${overdueTasks.length} overdue`} />}
                {item.count > 0 && <span className="text-xs tabular-nums text-subtle">{item.count}</span>}
              </button>
            );
          })}
        </div>

        <p className="mb-1 mt-6 px-2.5 text-[11px] font-medium text-subtle">Labels</p>
        <div className="space-y-0.5">
          {labels.map((r) => {
            const color = taskLabelColor(r.name, responsibilities);
            const count = open.filter((t) => labelOf(t) === r.name).length;
            const active = view === `label:${r.name}`;
            return (
              <button
                key={r.id}
                onClick={() => setView(`label:${r.name}`)}
                className={cn(
                  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                  active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
                )}
              >
                <span className="grid size-4 shrink-0 place-items-center">
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                </span>
                <span className="flex-1 truncate text-left">{r.name}</span>
                {count > 0 && <span className="text-xs tabular-nums text-subtle">{count}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Page width="narrow">
          {/* Phone: the sidebar's views as a scrollable chip row */}
          <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:hidden">
            {[...views.map((item) => ({ id: item.id, label: item.label, count: item.count, color: undefined as string | undefined })),
              ...labels.map((r) => ({ id: `label:${r.name}`, label: r.name, count: 0, color: taskLabelColor(r.name, responsibilities) }))].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  view === item.id ? "border-ink bg-ink text-paper" : "border-line text-muted"
                )}
              >
                {item.color && <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />}
                {item.label}
                {item.count > 0 && <span className="tabular-nums opacity-60">{item.count}</span>}
              </button>
            ))}
          </div>

          <PageHeader
            title={
              <span className="flex items-center gap-2.5">
                {selectedLabel && <span className="size-3 rounded-full" style={{ backgroundColor: taskLabelColor(selectedLabel, responsibilities) }} />}
                {viewTitle}
              </span>
            }
            description={viewDescription}
            className="mb-5"
          />

          <QuickCaptureForm
            key={view}
            defaultLabel={selectedLabel || undefined}
            dueAt={view === "today" ? `${today}T17:00:00` : undefined}
            placeholder={view === "today" ? "Add a task for today" : selectedLabel ? `Add a task to ${selectedLabel}` : "Add a task"}
            className="mb-6"
          />

          {groups.length === 0 ? (
            <Card>
              <EmptyState
                icon={CheckCircle2}
                title={view === "today" ? "You're clear for today" : view === "upcoming" ? "Nothing scheduled ahead" : "No open tasks here"}
                description={view === "today" ? "Add something above, or pull a task forward from Upcoming." : "Tasks you add will show up here."}
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.key}>
                  <div className="mb-2 flex items-baseline gap-2 px-1">
                    <h2 className={cn("text-[13px] font-semibold", group.danger ? "text-danger" : "text-ink")}>{group.label}</h2>
                    {group.detail && <span className="text-xs text-muted">{group.detail}</span>}
                    <span className="ml-auto text-xs tabular-nums text-subtle">{group.tasks.length}</span>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">{group.tasks.map(renderRow)}</Card>
                </section>
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowCompleted((value) => !value)}
                aria-expanded={showCompleted}
                className="flex h-8 items-center gap-1.5 px-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
              >
                <ChevronDown className={cn("size-3.5 transition-transform", !showCompleted && "-rotate-90")} />
                Completed · {completedTasks.length}
              </button>
              {showCompleted && (
                <Card className="mt-2 divide-y divide-line overflow-hidden">
                  {completedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </Card>
              )}
            </div>
          )}
        </Page>
      </div>
    </div>
  );
}
