"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { ColorBadge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

function toDateTimeLocal(value?: string) {
  return value?.slice(0, 16) ?? "";
}

function fromDateTimeLocal(value: string) {
  return value ? `${value}:00-07:00` : undefined;
}

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const task = useAppStore((state) => state.tasks.find((item) => item.id === id));
  const responsibilities = useAppStore((state) => state.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [responsibilityId, setResponsibilityId] = useState("");

  useEffect(() => {
    if (!task) {
      return;
    }
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueAt(toDateTimeLocal(task.dueAt));
    setResponsibilityId(task.responsibilityId ?? "");
  }, [task]);

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Task not found. It may have been removed from local state.
      </div>
    );
  }

  const responsibility = responsibilities.find((item) => item.id === task.responsibilityId);
  const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    updateTask(id, {
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: fromDateTimeLocal(dueAt),
      responsibilityId: responsibilityId || undefined
    });
  }

  function remove() {
    deleteTask(id);
    router.push("/todos");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="relative overflow-hidden rounded-lg border border-line bg-panel p-5">
        <span className={cn("absolute inset-x-0 top-0 h-1", tone.dot)} />
        {responsibility && <ColorBadge color={responsibility.color}>{responsibility.name}</ColorBadge>}
        <h1 className="mt-3 text-3xl font-normal text-ink">{task.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-md border border-line bg-line px-2 py-1">{task.status}</span>
          {task.dueAt && <span className="rounded-md border border-line bg-line px-2 py-1">due {new Date(task.dueAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>}
        </div>
      </header>

      <Panel title="Edit Task" eyebrow="working item">
        <form onSubmit={save} className="grid gap-3 p-4 text-sm md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Task name</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Responsibility</span>
            <select value={responsibilityId} onChange={(event) => setResponsibilityId(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue">
              <option value="">Inbox</option>
              {responsibilities.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Due</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
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
