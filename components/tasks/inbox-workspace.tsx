"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { ReviewWorkspace } from "@/components/capture/review-workspace";
import { Panel } from "@/components/ui/panel";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function fromDateInput(value: string) {
  return value ? `${value}T17:00:00` : undefined;
}

export function InboxWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useActiveResponsibilities();
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const updateTask = useAppStore((state) => state.updateTask);

  const inboxTasks = useMemo(() => tasks.filter((task) => !task.responsibilityId && task.status !== "done"), [tasks]);
  const pendingReviews = useMemo(() => aiReviewItems.filter((item) => item.status !== "approved" && item.status !== "rejected"), [aiReviewItems]);

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-muted">Inbox</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">
          {pendingReviews.length > 0 ? "Review captures" : "Fast capture"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {pendingReviews.length > 0
            ? `${pendingReviews.length} capture${pendingReviews.length > 1 ? "s" : ""} waiting — approve or reject each item, then commit.`
            : "Captured tasks stay here until they are assigned to a responsibility, completed, or deleted."}
        </p>
      </header>

      {/* AI review — shown when captures are pending */}
      {pendingReviews.length > 0 && <ReviewWorkspace />}

      {/* Standard task inbox */}
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Capture" eyebrow="quick add">
          <div className="p-4">
            <QuickCaptureForm inboxOnly placeholder="Capture task" submitLabel="Add to inbox" />
          </div>
        </Panel>

        <Panel title="Unassigned tasks" eyebrow={`${inboxTasks.length} unresolved`}>
          <div className="divide-y divide-line">
            {inboxTasks.map((task) => {
              const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
              const color = taskLabelColor(label, responsibilities);
              return (
                <div key={task.id} className="grid gap-3 px-4 py-3 transition hover:bg-line lg:grid-cols-[1fr_auto]">
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      title="Mark complete"
                      className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]"
                      style={{ borderColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{task.title}</p>
                      {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        {task.dueAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[160px_180px_auto] lg:min-w-[430px]">
                    <select
                      value=""
                      onChange={(event) => {
                        const nextResponsibility = responsibilities.find((r) => r.id === event.target.value);
                        updateTask(task.id, {
                          responsibilityId: event.target.value || undefined,
                          labels: nextResponsibility ? [nextResponsibility.name] : task.labels,
                        });
                      }}
                      aria-label="Assign responsibility"
                      className="h-9 rounded-md border border-line bg-paper px-2 text-xs text-ink outline-none focus:border-blue"
                    >
                      <option value="">Assign...</option>
                      {responsibilities.map((responsibility) => (
                        <option key={responsibility.id} value={responsibility.id}>
                          {responsibility.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={toDateInput(task.dueAt)}
                      onChange={(event) => updateTask(task.id, { dueAt: fromDateInput(event.target.value) })}
                      aria-label="Set due date"
                      className="h-9 rounded-md border border-line bg-paper px-2 text-xs text-ink outline-none focus:border-blue"
                    />
                    <div className="flex justify-end gap-1">
                      <Link href={`/task/${task.id}`} title="Open task" className="grid size-9 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink">
                        <ExternalLink className="size-4" />
                      </Link>
                      <button onClick={() => toggleTask(task.id)} title="Mark complete" className="grid size-9 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"><CheckCircle2 className="size-4" /></button>
                      <button onClick={() => deleteTask(task.id)} title="Delete" className="grid size-9 place-items-center rounded-md text-muted hover:bg-paper hover:text-coral"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!inboxTasks.length && <p className="p-4 text-sm text-muted">Inbox is clear.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
