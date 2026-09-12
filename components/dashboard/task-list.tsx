"use client";

import { useAppStore } from "@/lib/stores/app-store";
import { localDateKey } from "@/lib/dates";
import { QuickTaskForm } from "@/components/tasks/quick-task-form";
import { TaskRow } from "@/components/tasks/task-row";

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
      {quickAdd && <QuickTaskForm responsibilityId={responsibilityId} />}
      <div className="divide-y divide-line">
        {visibleTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
      {!visibleTasks.length && <p className="px-4 py-6 text-center text-[13px] text-muted">No open tasks.</p>}
    </div>
  );
}
