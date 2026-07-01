"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/stores/app-store";
import { localDateKey } from "@/lib/dates";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import { cn } from "@/lib/utils";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";

export function TaskList({
  responsibilityId,
  quickAdd = false,
  todayOnly = false,
  upcomingOnly = false
}: {
  responsibilityId?: string;
  quickAdd?: boolean;
  todayOnly?: boolean;
  upcomingOnly?: boolean;
}) {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const today = localDateKey();
  const visibleTasks = tasks
    .filter((task) => {
      const matchesResponsibility = !responsibilityId || task.responsibilityId === responsibilityId;
      const matchesDate = !todayOnly || task.dueAt?.startsWith(today);
      const matchesUpcoming = !upcomingOnly || Boolean(task.dueAt && task.dueAt.slice(0, 10) > today);
      return task.status !== "done" && matchesResponsibility && matchesDate && matchesUpcoming;
    })
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

  return (
    <div>
      {quickAdd && <QuickTaskForm responsibilityId={responsibilityId} compact={Boolean(responsibilityId)} />}
      <div className="divide-y divide-line">
        {visibleTasks.map((task) => {
          const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
          const color = taskLabelColor(label, responsibilities);
          return (
            <Link
              key={task.id}
              href={`/task/${task.id}`}
              className="group flex items-start gap-3 py-3 pl-3 pr-4 transition hover:bg-line"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <button
                onClick={(event) => {
                  event.preventDefault();
                  toggleTask(task.id);
                }}
                aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
                className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border bg-transparent transition group-hover:bg-paper", task.status === "done" ? "border-mint bg-mint" : "border-muted")}
                style={task.status !== "done" ? { borderColor: `${color}80` } : undefined}
              >
                {task.status === "done" && <span className="size-2 rounded-full bg-white" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="min-w-0 text-sm font-medium text-ink">{task.title}</p>
                  <span className="text-xs text-muted">|</span>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </p>
                  {task.dueAt && <span className="text-xs text-muted">{new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                </div>
                {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{task.description}</p>}
              </div>
            </Link>
          );
        })}
        {!visibleTasks.length && <p className="p-4 text-sm text-muted">No tasks here yet.</p>}
      </div>
    </div>
  );
}
