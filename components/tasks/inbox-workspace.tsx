"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Trash2 } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { Panel } from "@/components/ui/panel";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";

export function InboxWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);

  const inboxTasks = useMemo(() => tasks.filter((task) => !task.responsibilityId && task.status !== "done"), [tasks]);

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-muted">Inbox</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Fast capture</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Captured tasks stay here until they are dated, labeled, completed, or deleted.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Capture" eyebrow="inbox">
          <div className="p-4">
            <QuickCaptureForm inboxOnly placeholder="Capture task" submitLabel="Add to inbox" />
          </div>
        </Panel>

        <Panel title="Tasks" eyebrow={`${inboxTasks.length} open`}>
          <div className="divide-y divide-line">
            {inboxTasks.map((task) => {
              const label = taskLabel(task.labels, task.responsibilityId);
              const color = taskLabelColor(label);
              return (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-line">
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
                <button onClick={() => toggleTask(task.id)} title="Mark complete" className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"><CheckCircle2 className="size-4" /></button>
                <button onClick={() => deleteTask(task.id)} title="Delete" className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-coral"><Trash2 className="size-4" /></button>
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
