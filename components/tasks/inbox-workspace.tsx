"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, ExternalLink, Inbox, Mail, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { ReviewWorkspace } from "@/components/capture/review-workspace";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { taskLabel, taskLabelColor } from "@/lib/task-labels";
import type { CaptureExtraction, Task } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type SelectedInboxItem = { kind: "review" | "task"; id: string };

function toDateInput(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function fromDateInput(value: string) {
  return value ? `${value}T17:00:00` : undefined;
}

function isActiveReview(item: CaptureExtraction) {
  if (item.status === "approved" || item.status === "rejected") return false;
  return !item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= Date.now();
}

function reviewSource(item: CaptureExtraction) {
  if (item.externalSource === "gmail" || item.source === "email") return "Email";
  if (item.externalSource === "google_calendar" || item.source === "calendar") return "Calendar";
  return "Capture";
}

function reviewSuggestionCount(item: CaptureExtraction) {
  return item.proposedTasks.length + item.proposedEvents.length + item.proposedNotes.length + (item.proposedListItems?.length ?? 0);
}

function selectedKey(item: SelectedInboxItem) {
  return `${item.kind}-${item.id}`;
}

export function InboxWorkspace() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useActiveResponsibilities();
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const syncGoogleCalendar = useAppStore((state) => state.syncGoogleCalendar);
  const syncGmail = useAppStore((state) => state.syncGmail);
  const [selected, setSelected] = useState<SelectedInboxItem | null>(null);
  const [syncing, setSyncing] = useState<"calendar" | "email" | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const activeReviews = useMemo(() => aiReviewItems.filter(isActiveReview), [aiReviewItems]);
  const snoozedReviews = useMemo(
    () => aiReviewItems.filter((item) => item.snoozedUntil && new Date(item.snoozedUntil).getTime() > Date.now()),
    [aiReviewItems],
  );
  const inboxTasks = useMemo(() => tasks.filter((task) => !task.responsibilityId && task.status !== "done"), [tasks]);

  const queueItems = useMemo(
    () => [
      ...activeReviews.map((item) => ({ kind: "review" as const, id: item.id })),
      ...inboxTasks.map((task) => ({ kind: "task" as const, id: task.id })),
    ],
    [activeReviews, inboxTasks],
  );

  useEffect(() => {
    if (selected && queueItems.some((item) => selectedKey(item) === selectedKey(selected))) return;
    setSelected(queueItems[0] ?? null);
  }, [queueItems, selected]);

  const selectedReview = selected?.kind === "review" ? activeReviews.find((item) => item.id === selected.id) : undefined;
  const selectedTask = selected?.kind === "task" ? inboxTasks.find((task) => task.id === selected.id) : undefined;

  function taskDestination(task: Task) {
    const label = taskLabel(task.labels, task.responsibilityId, responsibilities);
    const color = taskLabelColor(label, responsibilities);
    return { label, color };
  }

  async function pullCalendar() {
    setSyncing("calendar");
    setSyncMessage(null);
    try {
      const result = await syncGoogleCalendar();
      setSyncMessage(result.errors.length ? result.errors[0] : `Calendar checked ${result.synced} item${result.synced === 1 ? "" : "s"}.`);
    } catch (err) {
      setSyncMessage(String(err));
    } finally {
      setSyncing(null);
    }
  }

  async function pullEmail() {
    setSyncing("email");
    setSyncMessage(null);
    try {
      const result = await syncGmail();
      setSyncMessage(result.errors.length ? result.errors[0] : `Email added ${result.proposed} review item${result.proposed === 1 ? "" : "s"}.`);
    } catch (err) {
      setSyncMessage(String(err));
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-2rem)] gap-4 xl:grid-cols-[390px_1fr]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-glow">
        <header className="border-b border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Inbox</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink">Universal queue</h1>
            </div>
            <div className="rounded-full bg-blue/15 px-3 py-1 text-sm font-semibold text-blue">
              {queueItems.length}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pullEmail}
              disabled={syncing !== null}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-ink transition hover:bg-paper disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", syncing === "email" && "animate-spin")} />
              Pull email
            </button>
            <button
              type="button"
              onClick={pullCalendar}
              disabled={syncing !== null}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-ink transition hover:bg-paper disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", syncing === "calendar" && "animate-spin")} />
              Pull calendar
            </button>
          </div>
          {syncMessage && (
            <p className="mt-2 line-clamp-2 text-xs text-muted">{syncMessage}</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="text-lg font-semibold text-ink">{activeReviews.length}</p>
              <p className="text-muted">review</p>
            </div>
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="text-lg font-semibold text-ink">{inboxTasks.length}</p>
              <p className="text-muted">tasks</p>
            </div>
            <div className="rounded-lg bg-paper px-2 py-2">
              <p className="text-lg font-semibold text-ink">{snoozedReviews.length}</p>
              <p className="text-muted">snoozed</p>
            </div>
          </div>
        </header>

        <div className="border-b border-line p-4">
          <QuickCaptureForm inboxOnly placeholder="Capture anything" submitLabel="Add" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeReviews.map((item) => {
            const source = reviewSource(item);
            const Icon = source === "Email" ? Mail : source === "Calendar" ? CalendarDays : Sparkles;
            const active = selected?.kind === "review" && selected.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected({ kind: "review", id: item.id })}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-paper",
                  active && "bg-blue/10"
                )}
              >
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-muted">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">{item.summary}</p>
                    <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {source}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {reviewSuggestionCount(item)} suggestion{reviewSuggestionCount(item) === 1 ? "" : "s"} · {Math.round(item.confidence * 100)}% confidence
                  </p>
                </div>
                <ChevronRight className="mt-2 size-4 shrink-0 text-muted" />
              </button>
            );
          })}

          {inboxTasks.map((task) => {
            const { label, color } = taskDestination(task);
            const active = selected?.kind === "task" && selected.id === task.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelected({ kind: "task", id: task.id })}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-paper",
                  active && "bg-blue/10"
                )}
              >
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-muted">
                  <Inbox className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                    {task.dueAt && <> · {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}</>}
                  </p>
                </div>
                <ChevronRight className="mt-2 size-4 shrink-0 text-muted" />
              </button>
            );
          })}

          {queueItems.length === 0 && (
            <div className="grid min-h-56 place-items-center p-6 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-paper text-muted">
                  <CheckCircle2 className="size-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-ink">Inbox is clear</p>
                <p className="mt-1 text-xs text-muted">New emails, calendar reviews, captures, and loose tasks will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0">
        {selectedReview && (
          <ReviewWorkspace
            selectedId={selectedReview.id}
            onQueueChange={() => {
              setSelected(null);
            }}
          />
        )}

        {selectedTask && (
          <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-glow">
            <header className="border-b border-line bg-line px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Unassigned task</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{selectedTask.title}</h2>
            </header>
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
              <div>
                {selectedTask.description ? (
                  <p className="whitespace-pre-wrap rounded-lg border border-line bg-paper p-4 text-sm leading-6 text-muted">
                    {selectedTask.description}
                  </p>
                ) : (
                  <div className="rounded-lg border border-dashed border-line bg-paper p-4 text-sm text-muted">
                    No description yet.
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/task/${selectedTask.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink transition hover:bg-paper">
                    <ExternalLink className="size-4" />
                    Open task
                  </Link>
                  <button
                    onClick={() => {
                      toggleTask(selectedTask.id);
                      setSelected(null);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-3 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    <CheckCircle2 className="size-4" />
                    Complete
                  </button>
                  <button
                    onClick={() => {
                      deleteTask(selectedTask.id);
                      setSelected(null);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-coral px-3 text-sm font-medium text-coral transition hover:bg-coral hover:text-white"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </div>
              </div>

              <aside className="h-fit rounded-lg border border-line bg-paper p-4">
                <p className="text-sm font-medium text-ink">Process task</p>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-xs font-medium text-muted">
                    Label
                    <select
                      value={selectedTask.responsibilityId ?? ""}
                      onChange={(event) => {
                        const nextResponsibility = responsibilities.find((r) => r.id === event.target.value);
                        updateTask(selectedTask.id, {
                          responsibilityId: event.target.value || undefined,
                          labels: nextResponsibility ? [nextResponsibility.name] : selectedTask.labels,
                        });
                      }}
                      className="h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none focus:border-blue"
                    >
                      <option value="">Unsorted</option>
                      {responsibilities.map((responsibility) => (
                        <option key={responsibility.id} value={responsibility.id}>
                          {responsibility.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted">
                    Due date
                    <input
                      type="date"
                      value={toDateInput(selectedTask.dueAt)}
                      onChange={(event) => updateTask(selectedTask.id, { dueAt: fromDateInput(event.target.value) })}
                      className="h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none focus:border-blue"
                    />
                  </label>
                </div>
              </aside>
            </div>
          </div>
        )}

        {!selectedReview && !selectedTask && (
          <div className="grid min-h-[420px] place-items-center rounded-xl border border-line bg-panel p-8 text-center shadow-glow">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-paper text-muted">
                <Plus className="size-6" />
              </div>
              <p className="mt-4 text-sm font-medium text-ink">Select an inbox item</p>
              <p className="mt-1 text-sm text-muted">Review suggestions, process loose tasks, or capture something new.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
