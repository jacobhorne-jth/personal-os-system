"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ListChecks, Plus, Repeat2, Trash2, X } from "lucide-react";
import { TaskCheckbox, dueDayLabel } from "@/components/tasks/task-row";
import { Button, ButtonLink, Card, CardHeader, EmptyState, Field, Page, iconButtonClass, inputClass, textareaClass } from "@/components/ui/primitives";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
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
      <Page width="narrow">
        <EmptyState
          icon={CheckCircle2}
          title="Task not found"
          description="It may have been completed or removed."
          action={<ButtonLink href="/tasks" size="sm">Back to tasks</ButtonLink>}
        />
      </Page>
    );
  }

  const resp = responsibilities.find((r) => r.id === responsibilityId);
  const respColor = resp ? getTone(resp.color).hex : "rgb(var(--color-subtle))";
  const done = task.status === "done";
  const subtasksDone = subtasks.filter((s) => s.done).length;

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
    <Page width="narrow">
      <Link href="/tasks" className="-ml-2 mb-6 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink">
        <ArrowLeft className="size-4" />
        Tasks
      </Link>

      <header className="mb-7 flex items-start gap-3">
        <div className="pt-2">
          <TaskCheckbox done={done} color={respColor} onToggle={() => toggleTask(task.id)} label={done ? "Reopen task" : "Mark task done"} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink", done && "text-muted line-through decoration-subtle")}>{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            {resp && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: respColor }} />
                {resp.name}
              </span>
            )}
            {task.dueAt && <span>Due {dueDayLabel(task.dueAt).replace(/^(Today|Tomorrow|Yesterday)$/, (word) => word.toLowerCase())}</span>}
            {task.recurrence && (
              <span className="inline-flex items-center gap-1"><Repeat2 className="size-3.5" />{task.recurrence}</span>
            )}
            {subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1"><ListChecks className="size-3.5" />{subtasksDone}/{subtasks.length}</span>
            )}
            <span className="capitalize">{task.priority} priority</span>
          </div>
        </div>
      </header>

      <Card>
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details" className={cn(textareaClass, "min-h-24 resize-y")} />
          </Field>
          <Field label="Due date">
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Label">
            <select value={responsibilityId} onChange={(e) => setResponsibilityId(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {responsibilities.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Repeats">
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className={inputClass}>
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
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-center gap-2 border-t border-line pt-4 sm:col-span-2">
            <Button variant="danger" size="sm" onClick={remove}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => toggleTask(task.id)} title={done ? "Reopen task" : "Mark task done"}>
                <CheckCircle2 className="size-3.5" />
                {done ? "Reopen" : "Mark done"}
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
                {saved ? "Saved" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="Subtasks" meta={subtasks.length > 0 ? `${subtasksDone}/${subtasks.length}` : undefined} />
        <div className="divide-y divide-line">
          {subtasks.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-3 px-4 py-2.5">
              <TaskCheckbox
                done={sub.done}
                color={respColor}
                onToggle={() => persistSubtasks(subtasks.map((s) => s.id === sub.id ? { ...s, done: !s.done } : s))}
                label={sub.done ? `Reopen ${sub.title}` : `Complete ${sub.title}`}
              />
              <span className={cn("flex-1 text-sm text-ink", sub.done && "text-muted line-through decoration-subtle")}>{sub.title}</span>
              <button
                type="button"
                onClick={() => persistSubtasks(subtasks.filter((s) => s.id !== sub.id))}
                aria-label={`Remove ${sub.title}`}
                className={iconButtonClass("size-7 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3 px-4 py-2">
            <Plus className="size-[18px] shrink-0 text-subtle" />
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
              placeholder="Add a subtask"
              aria-label="New subtask"
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
            />
            {newSubtask.trim() && (
              <Button size="sm" variant="primary" className="h-7" onClick={addSubtask}>Add</Button>
            )}
          </div>
        </div>
      </Card>
    </Page>
  );
}
