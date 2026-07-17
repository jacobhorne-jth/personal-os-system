"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { Panel } from "@/components/ui/panel";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function fromDateInput(value: string) {
  return value ? `${value}T17:00:00` : undefined;
}

type Priority = "low" | "medium" | "high" | "urgent";

const priorities: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function TaskDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const task = useAppStore((state) => state.tasks.find((item) => item.id === id));
  const responsibilities = useActiveResponsibilities();
  const toggleTask = useAppStore((state) => state.toggleTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [recurrence, setRecurrence] = useState("");
  const [responsibilityId, setResponsibilityId] = useState("");
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueAt(toDateInput(task.dueAt));
    setPriority(task.priority ?? "medium");
    setRecurrence(task.recurrence ?? "");
    setResponsibilityId(task.responsibilityId ?? "");
    setSubtasks(task.subtasks ?? []);
  }, [task]);

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Task not found. It may have been removed.
      </div>
    );
  }

  const resp = responsibilities.find((r) => r.id === responsibilityId);
  const respColor = resp ? responsibilityTone[resp.color].hex : "#6b7280";

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    updateTask(id, {
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: fromDateInput(dueAt),
      priority,
      recurrence: recurrence || undefined,
      responsibilityId: responsibilityId || undefined,
      labels: resp ? [resp.name] : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function remove() {
    deleteTask(id);
    router.push("/tasks");
  }

  function persistSubtasks(updated: typeof subtasks) {
    setSubtasks(updated);
    updateTask(id, { subtasks: updated });
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    persistSubtasks([...subtasks, { id: crypto.randomUUID(), title: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="relative overflow-hidden rounded-lg border border-line bg-panel p-5">
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: respColor }} />
        {resp && (
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-line px-2 py-1 text-xs text-muted">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: respColor }} />
            {resp.name}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-normal text-ink">{task.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {task.dueAt && (
            <span className="rounded-md border border-line bg-line px-2 py-1">
              due {new Date(task.dueAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
          {task.recurrence && (
            <span className="rounded-md border border-line bg-line px-2 py-1">{task.recurrence}</span>
          )}
          <span className="rounded-md border border-line bg-line px-2 py-1 capitalize">{task.priority}</span>
          <span className={cn(
            "rounded-md border px-2 py-1 capitalize",
            task.status === "done" ? "border-mint/30 bg-mint/10 text-mint" : "border-line bg-line"
          )}>
            {task.status}
          </span>
        </div>
      </header>

      <Panel title="Edit task">
        <form onSubmit={save} className="grid gap-3 p-4 text-sm md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs text-muted">Due date</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue"
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Repeats</span>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue"
            >
              <option value="">Never</option>
              <option value="every day">Every day</option>
              <option value="every week">Every week</option>
              <option value="every other week">Every other week</option>
              <option value="every month">Every month</option>
              <option value="every year">Every year</option>
              <option value="every monday">Every Monday</option>
              <option value="every tuesday">Every Tuesday</option>
              <option value="every wednesday">Every Wednesday</option>
              <option value="every thursday">Every Thursday</option>
              <option value="every friday">Every Friday</option>
              <option value="every saturday">Every Saturday</option>
              <option value="every sunday">Every Sunday</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Responsibility</span>
            <select
              value={responsibilityId}
              onChange={(e) => setResponsibilityId(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue"
            >
              <option value="">— None —</option>
              {responsibilities.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 w-full resize-y rounded-lg border border-line bg-paper p-3 leading-6 text-ink outline-none focus:border-blue"
            />
          </label>
          <div className="flex flex-col gap-2 border-t border-line pt-3 md:col-span-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={remove}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-coral px-4 text-sm text-coral transition hover:bg-coral hover:text-white"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm text-ink transition hover:bg-line"
              >
                <CheckCircle2 className="size-4" />
                {task.status === "done" ? "Reopen" : "Mark done"}
              </button>
              <button
                disabled={!title.trim()}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium text-white transition disabled:opacity-50",
                  saved ? "bg-mint" : "bg-blue hover:brightness-110"
                )}
              >
                {saved ? "Saved!" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </Panel>

      <Panel
        title="Subtasks"
        eyebrow={subtasks.length > 0 ? `${subtasks.filter((s) => s.done).length} / ${subtasks.length}` : undefined}
      >
        <div className="divide-y divide-line">
          {subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5">
              <button
                type="button"
                onClick={() => persistSubtasks(subtasks.map((s) => s.id === sub.id ? { ...s, done: !s.done } : s))}
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded border transition",
                  sub.done ? "border-mint bg-mint" : "border-muted hover:border-blue"
                )}
              >
                {sub.done && <span className="size-2 rounded-sm bg-white" />}
              </button>
              <span className={cn("flex-1 text-sm text-ink", sub.done && "text-muted line-through")}>{sub.title}</span>
              <button
                type="button"
                onClick={() => persistSubtasks(subtasks.filter((s) => s.id !== sub.id))}
                className="grid size-7 place-items-center rounded text-muted transition hover:bg-line hover:text-coral"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
              placeholder="Add subtask…"
              className="flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
            />
            <button
              type="button"
              onClick={addSubtask}
              disabled={!newSubtask.trim()}
              className="grid size-8 place-items-center rounded-md bg-line text-muted transition hover:bg-paper hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
