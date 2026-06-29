"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { Panel } from "@/components/ui/panel";
import { taskLabel, taskLabelColor, taskLabels } from "@/lib/task-labels";

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function fromDateInput(value: string) {
  return value ? `${value}T17:00:00` : undefined;
}

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const task = useAppStore((state) => state.tasks.find((item) => item.id === id));
  const toggleTask = useAppStore((state) => state.toggleTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [label, setLabel] = useState(taskLabels[0]);

  useEffect(() => {
    if (!task) {
      return;
    }
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueAt(toDateInput(task.dueAt));
    setLabel(taskLabel(task.labels, task.responsibilityId));
  }, [task]);

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Task not found. It may have been removed from local state.
      </div>
    );
  }

  const labelColor = taskLabelColor(label);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    updateTask(id, {
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: fromDateInput(dueAt),
      labels: [label]
    });
  }

  function remove() {
    deleteTask(id);
    router.push("/tasks");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="relative overflow-hidden rounded-lg border border-line bg-panel p-5">
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: labelColor }} />
        <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-line px-2 py-1 text-xs text-muted">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: labelColor }} />
          {label}
        </span>
        <h1 className="mt-3 text-3xl font-normal text-ink">{task.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {task.dueAt && <span className="rounded-md border border-line bg-line px-2 py-1">due {new Date(task.dueAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>}
        </div>
      </header>

      <Panel title="Edit Task">
        <form onSubmit={save} className="grid gap-3 p-4 text-sm md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs text-muted">Date</span>
            <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Label</span>
            <select value={label} onChange={(event) => setLabel(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue">
              {taskLabels.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-32 w-full resize-y rounded-lg border border-line bg-paper p-3 leading-6 text-ink outline-none focus:border-blue" />
          </label>
          <div className="flex flex-col gap-2 border-t border-line pt-3 md:col-span-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={remove} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-coral px-4 text-sm text-coral transition hover:bg-coral hover:text-white">
              <Trash2 className="size-4" />
              Delete
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggleTask(task.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm text-ink transition hover:bg-line">
                <CheckCircle2 className="size-4" />
                {task.status === "done" ? "Reopen" : "Mark done"}
              </button>
              <button disabled={!title.trim()} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue px-4 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50">
                Save changes
              </button>
            </div>
          </div>
        </form>
      </Panel>
    </div>
  );
}
