"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ListChecks, Repeat2 } from "lucide-react";
import { addDays, dateFromKey, dateKeyOf, localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import type { Task } from "@/lib/types/domain";
import { cn, formatTime } from "@/lib/utils";

export function dueDayLabel(dueAt: string, today = localDateKey()) {
  const key = dateKeyOf(dueAt);
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  const date = dateFromKey(key);
  const inWeek = key > today && key <= addDays(today, 6);
  return date.toLocaleDateString("en-US", inWeek ? { weekday: "long" } : { month: "short", day: "numeric" });
}

// Tasks default to 5 PM when no time was given; only show deliberate times
export function dueTimeLabel(dueAt: string) {
  if (!dueAt.includes("T")) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime()) || (date.getHours() === 17 && date.getMinutes() === 0)) return null;
  return formatTime(dueAt);
}

export function TaskCheckbox({
  done,
  color,
  onToggle,
  label,
}: {
  done: boolean;
  color: string;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="group/check mt-[1px] grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors"
      style={{ borderColor: color, backgroundColor: done ? color : undefined }}
    >
      <Check
        className={cn(
          "size-3 transition-opacity",
          done ? "text-white opacity-100" : "opacity-0 group-hover/check:opacity-60"
        )}
        style={done ? undefined : { color }}
        strokeWidth={3}
      />
    </button>
  );
}

export function TaskRow({
  task,
  showDue = true,
  actions,
  className,
}: {
  task: Task;
  showDue?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const [completing, setCompleting] = useState(false);
  const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
  const color = taskLabelColor(label, responsibilities);
  const done = task.status === "done";
  const today = localDateKey();
  const overdue = !done && Boolean(task.dueAt && dateKeyOf(task.dueAt) < today);
  const time = task.dueAt ? dueTimeLabel(task.dueAt) : null;
  const subtasksDone = task.subtasks?.filter((item) => item.done).length ?? 0;

  function handleToggle() {
    if (done) {
      toggleTask(task.id);
      return;
    }
    // Let the check land before the row leaves the list
    setCompleting(true);
    window.setTimeout(() => {
      toggleTask(task.id);
      setCompleting(false);
    }, 260);
  }

  return (
    <div className={cn("group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-hover/50", completing && "opacity-60", className)}>
      <TaskCheckbox done={done || completing} color={color} onToggle={handleToggle} label={done ? `Reopen ${task.title}` : `Complete ${task.title}`} />
      <Link href={`/task/${task.id}`} className="min-w-0 flex-1">
        <p className={cn("text-sm leading-5 text-ink", (done || completing) && "text-muted line-through decoration-subtle")}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {showDue && task.dueAt && (
            <span className={cn(overdue && "text-danger")}>
              {dueDayLabel(task.dueAt, today)}
              {time && `, ${time}`}
            </span>
          )}
          {!showDue && time && <span>{time}</span>}
          {task.recurrence && (
            <span className="inline-flex items-center gap-1" title={task.recurrence}>
              <Repeat2 className="size-3" />
              <span className="max-w-28 truncate">{task.recurrence.startsWith("{") ? "Repeats" : task.recurrence}</span>
            </span>
          )}
          {task.subtasks?.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" />
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{label}</span>
          </span>
        </div>
      </Link>
      {actions}
    </div>
  );
}
