"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ExternalLink, Inbox, Mail, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { ReviewWorkspace } from "@/components/capture/review-workspace";
import { Button, ButtonLink, Card, EmptyState, Field, Page, PageHeader, inputClass } from "@/components/ui/primitives";
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
  return item.proposedTasks.length + item.proposedEvents.length + item.proposedNotes.length;
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

  const summary = [
    `${activeReviews.length} to review`,
    `${inboxTasks.length} unsorted ${inboxTasks.length === 1 ? "task" : "tasks"}`,
    snoozedReviews.length ? `${snoozedReviews.length} snoozed` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Page width="wide">
      <PageHeader
        title="Inbox"
        description={syncMessage ?? summary}
        actions={
          <>
            <Button size="sm" onClick={pullEmail} disabled={syncing !== null}>
              <RefreshCw className={cn("size-3.5", syncing === "email" && "animate-spin")} />
              Check email
            </Button>
            <Button size="sm" onClick={pullCalendar} disabled={syncing !== null}>
              <RefreshCw className={cn("size-3.5", syncing === "calendar" && "animate-spin")} />
              Sync calendar
            </Button>
            <ButtonLink href="/capture" size="sm" variant="primary">
              <Sparkles className="size-3.5" />
              Capture
            </ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-8">
          <div className="border-b border-line p-3">
            <QuickCaptureForm inboxOnly placeholder="Jot something down" submitLabel="Add" />
          </div>

          <div className="max-h-[60dvh] overflow-y-auto xl:max-h-[calc(100dvh-16rem)]">
            {activeReviews.map((item) => {
              const source = reviewSource(item);
              const Icon = source === "Email" ? Mail : source === "Calendar" ? CalendarDays : Sparkles;
              const active = selected?.kind === "review" && selected.id === item.id;
              const count = reviewSuggestionCount(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected({ kind: "review", id: item.id })}
                  className={cn(
                    "relative flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0",
                    active ? "bg-hover" : "hover:bg-hover/50"
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ink" />}
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium leading-5 text-ink">{item.summary}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {source} · {count} suggestion{count === 1 ? "" : "s"} · {Math.round(item.confidence * 100)}%
                    </span>
                  </span>
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
                    "relative flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0",
                    active ? "bg-hover" : "hover:bg-hover/50"
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ink" />}
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-hover text-muted">
                    <Inbox className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-5 text-ink">{task.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                      {task.dueAt && <> · {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}</>}
                    </span>
                  </span>
                </button>
              );
            })}

            {queueItems.length === 0 && (
              <EmptyState icon={CheckCircle2} title="Inbox zero" description="New emails, calendar reviews, captures, and loose tasks land here." />
            )}
          </div>
        </Card>

        <section className="min-w-0">
          {selectedReview && (
            <ReviewWorkspace
              selectedId={selectedReview.id}
              onQueueChange={() => {
                setSelected(null);
              }}
            />
          )}

          {selectedTask && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <p className="text-xs font-medium text-muted">Unsorted task</p>
                <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">{selectedTask.title}</h2>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
                <div>
                  {selectedTask.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{selectedTask.description}</p>
                  ) : (
                    <p className="text-sm text-muted">No notes on this task.</p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        toggleTask(selectedTask.id);
                        setSelected(null);
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Complete
                    </Button>
                    <ButtonLink href={`/task/${selectedTask.id}`} size="sm">
                      <ExternalLink className="size-3.5" />
                      Open
                    </ButtonLink>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        deleteTask(selectedTask.id);
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid h-fit gap-3 rounded-lg bg-paper p-4">
                  <p className="text-[13px] font-semibold text-ink">File it</p>
                  <Field label="Label">
                    <select
                      value={selectedTask.responsibilityId ?? ""}
                      onChange={(event) => {
                        const nextResponsibility = responsibilities.find((r) => r.id === event.target.value);
                        updateTask(selectedTask.id, {
                          responsibilityId: event.target.value || undefined,
                          labels: nextResponsibility ? [nextResponsibility.name] : selectedTask.labels,
                        });
                      }}
                      className={inputClass}
                    >
                      <option value="">Unsorted</option>
                      {responsibilities.map((responsibility) => (
                        <option key={responsibility.id} value={responsibility.id}>
                          {responsibility.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Due date">
                    <input
                      type="date"
                      value={toDateInput(selectedTask.dueAt)}
                      onChange={(event) => updateTask(selectedTask.id, { dueAt: fromDateInput(event.target.value) })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {!selectedReview && !selectedTask && (
            <Card>
              <EmptyState icon={Inbox} title="Nothing selected" description="Pick an item from the queue to review or file it." className="py-20" />
            </Card>
          )}
        </section>
      </div>
    </Page>
  );
}
