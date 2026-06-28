"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { useAppStore } from "@/lib/stores/app-store";

const labels = ["urgent", "deep work", "quick", "follow-up", "email", "coding", "errand", "waiting"];

export function InboxWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkResponsibility, setBulkResponsibility] = useState(responsibilities[0]?.id ?? "");
  const [bulkLabel, setBulkLabel] = useState(labels[0]);

  const inboxTasks = useMemo(() => tasks.filter((task) => !task.responsibilityId && task.status !== "done"), [tasks]);

  function addInboxTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), labels: [], priority: "medium" });
    setTitle("");
  }

  function applyBulk(action: "assign" | "label" | "complete" | "archive" | "delete") {
    selected.forEach((taskId) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      if (action === "assign") updateTask(taskId, { responsibilityId: bulkResponsibility });
      if (action === "label") updateTask(taskId, { labels: Array.from(new Set([...(task.labels ?? []), bulkLabel])) });
      if (action === "complete") toggleTask(taskId);
      if (action === "archive") updateTask(taskId, { status: "done" });
      if (action === "delete") deleteTask(taskId);
    });
    setSelected([]);
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-muted">Inbox</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Fast capture</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Tasks without a responsibility stay here until they are assigned, dated, labeled, completed, or archived.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Quick Add" eyebrow="unsorted">
          <form onSubmit={addInboxTask} className="space-y-3 p-4">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Capture a task" className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue" />
            <button disabled={!title.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue text-sm font-medium text-white disabled:opacity-40">
              <Plus className="size-4" />
              Add to inbox
            </button>
          </form>
        </Panel>

        <Panel
          title="Unassigned Tasks"
          eyebrow={`${inboxTasks.length} open`}
          action={<span className="text-xs text-muted">{selected.length} selected</span>}
        >
          <div className="border-b border-line p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto]">
              <select value={bulkResponsibility} onChange={(event) => setBulkResponsibility(event.target.value)} className="h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none">
                {responsibilities.map((responsibility) => (
                  <option key={responsibility.id} value={responsibility.id}>{responsibility.name}</option>
                ))}
              </select>
              <select value={bulkLabel} onChange={(event) => setBulkLabel(event.target.value)} className="h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none">
                {labels.map((label) => <option key={label} value={label}>{label}</option>)}
              </select>
              <button disabled={!selected.length} onClick={() => applyBulk("assign")} className="h-9 rounded-md border border-line px-3 text-xs text-muted hover:text-ink disabled:opacity-40">Assign</button>
              <button disabled={!selected.length} onClick={() => applyBulk("label")} className="h-9 rounded-md border border-line px-3 text-xs text-muted hover:text-ink disabled:opacity-40">Label</button>
              <button disabled={!selected.length} onClick={() => applyBulk("complete")} className="h-9 rounded-md bg-mint px-3 text-xs font-medium text-white disabled:opacity-40">Done</button>
            </div>
          </div>
          <div className="divide-y divide-line">
            {inboxTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-line">
                <input
                  type="checkbox"
                  checked={selected.includes(task.id)}
                  onChange={(event) => setSelected((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(task.labels ?? []).map((label) => <span key={label} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">@{label}</span>)}
                  </div>
                </div>
                <button onClick={() => toggleTask(task.id)} title="Mark complete" className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"><CheckCircle2 className="size-4" /></button>
                <button onClick={() => updateTask(task.id, { status: "done" })} title="Archive" className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-ink"><Archive className="size-4" /></button>
                <button onClick={() => deleteTask(task.id)} title="Delete" className="grid size-8 place-items-center rounded-md text-muted hover:bg-paper hover:text-coral"><Trash2 className="size-4" /></button>
              </div>
            ))}
            {!inboxTasks.length && <p className="p-4 text-sm text-muted">Inbox is clear.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
