"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
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
  const responsibilities = useAppStore((state) => state.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const visibleTasks = tasks.filter((task) => {
    const matchesResponsibility = !responsibilityId || task.responsibilityId === responsibilityId;
    const matchesDate = !todayOnly || task.dueAt?.startsWith("2026-05-07");
    const matchesUpcoming = !upcomingOnly || Boolean(task.dueAt && task.dueAt.slice(0, 10) > "2026-05-07");
    return task.status !== "done" && matchesResponsibility && matchesDate && matchesUpcoming;
  });

  return (
    <div>
      {quickAdd && <QuickTaskForm responsibilityId={responsibilityId} compact={Boolean(responsibilityId)} />}
      <div className="divide-y divide-line">
        {visibleTasks.map((task) => {
          const responsibility = responsibilities.find((entry) => entry.id === task.responsibilityId);
          const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
          return (
            <Link
              key={task.id}
              href={`/task/${task.id}`}
              className="group flex items-start gap-3 py-3 pl-3 pr-4 transition hover:bg-line"
              style={{ borderLeft: `3px solid ${tone.hex}` }}
            >
              <button
                onClick={(event) => {
                  event.preventDefault();
                  toggleTask(task.id);
                }}
                aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
                className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border bg-transparent transition group-hover:bg-paper", task.status === "done" ? "border-mint bg-mint" : "border-muted")}
                style={task.status !== "done" ? { borderColor: tone.hex + "80" } : undefined}
              >
                {task.status === "done" && <span className="size-2 rounded-full bg-white" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="min-w-0 text-sm font-medium text-ink">{task.title}</p>
                  <span className="text-xs text-muted">|</span>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 rounded-full" style={{ backgroundColor: tone.hex }} />
                    <span>{responsibility?.name ?? "Inbox"}</span>
                  </p>
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
