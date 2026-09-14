"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, ListTodo, Mail, Pencil, X } from "lucide-react";
import { DateTimeRow } from "@/components/calendar/date-time-picker";
import { Button, Card, iconButtonClass } from "@/components/ui/primitives";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ReviewWorkspaceProps = {
  selectedId?: string;
  onQueueChange?: () => void;
};

function isActiveReviewItem(item: { status?: string; snoozedUntil?: string }) {
  if (item.status === "approved" || item.status === "rejected") return false;
  return !item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= Date.now();
}

export function ReviewWorkspace({ selectedId, onQueueChange }: ReviewWorkspaceProps = {}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingIdx, setPendingIdx] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const items = useAppStore((state) => state.aiReviewItems);
  const responsibilities = useActiveResponsibilities();
  const setExtractionDecision = useAppStore((state) => state.setExtractionDecision);
  const updateExtractionProposal = useAppStore((state) => state.updateExtractionProposal);
  const commitExtraction = useAppStore((state) => state.commitExtraction);
  const rejectExtraction = useAppStore((state) => state.rejectExtraction);
  const snoozeExtraction = useAppStore((state) => state.snoozeExtraction);

  const pending = items.filter(isActiveReviewItem);
  const safeIdx = Math.min(pendingIdx, Math.max(0, pending.length - 1));
  const selectedItem = selectedId ? pending.find((entry) => entry.id === selectedId) : undefined;
  const item = selectedItem ?? pending[safeIdx] ?? items.find(isActiveReviewItem);

  useEffect(() => {
    setEditingId(null);
    setDraftTitle("");
    setExpandedRows(new Set());
    setSourceOpen(true);
  }, [item?.id]);

  if (!item) {
    return (
      <Card className="p-6 text-sm text-muted">
        No pending captures. New parsed captures will appear here for review.
      </Card>
    );
  }

  const rows = [
    ...item.proposedTasks.map((task) => ({
      id: `task-${task.title}`,
      kind: "Task",
      icon: ListTodo,
      title: task.title,
      editTitle: task.title,
      meta: task.responsibilityId,
      startsAt: undefined as string | undefined,
      endsAt: undefined as string | undefined,
      detail: [
        `Priority: ${task.priority ?? "medium"}`,
        task.dueAt ? `Due: ${new Date(task.dueAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "No due date",
      ].join("\n"),
    })),
    ...item.proposedEvents.map((event) => ({
      id: `event-${event.title}`,
      kind: "Event",
      icon: CalendarPlus,
      title: event.title,
      editTitle: event.title,
      meta: event.responsibilityId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      detail: [
        event.location && `Location: ${event.location}`,
        event.notes && `Description:\n${event.notes}`,
      ].filter(Boolean).join("\n\n"),
    })),
    ...item.proposedNotes.map((note) => ({
      id: `note-${note.title}`,
      kind: "Note",
      icon: FileText,
      title: note.title,
      editTitle: note.title,
      meta: note.responsibilityId,
      startsAt: undefined as string | undefined,
      endsAt: undefined as string | undefined,
      detail: note.body,
    }))
  ];

  const approvedCount = rows.filter((row) => item.decisions?.[row.id] !== false).length;

  function startEditing(row: { id: string; editTitle: string }) {
    setEditingId(row.id);
    setDraftTitle(row.editTitle);
  }

  function saveDraft() {
    if (!editingId) return;
    const title = draftTitle.trim();
    if (title) updateExtractionProposal(item.id, editingId, { title });
    setEditingId(null);
    setDraftTitle("");
  }

  function toggleRow(rowId: string) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Proposed changes</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">{item.summary}</h2>
          </div>
          {pending.length > 1 && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button onClick={() => setPendingIdx((i) => Math.max(0, i - 1))} disabled={safeIdx === 0} className={iconButtonClass("size-7")} aria-label="Previous capture">
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-1 text-xs tabular-nums text-muted">{safeIdx + 1} / {pending.length}</span>
              <button onClick={() => setPendingIdx((i) => Math.min(pending.length - 1, i + 1))} disabled={safeIdx >= pending.length - 1} className={iconButtonClass("size-7")} aria-label="Next capture">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {(item.sourceTitle || item.sourceDetail) && (
          <div className="border-b border-line">
            <button
              type="button"
              onClick={() => setSourceOpen((open) => !open)}
              title={sourceOpen ? "Hide capture source" : "Show capture source"}
              aria-label={sourceOpen ? "Hide capture source" : "Show capture source"}
              aria-expanded={sourceOpen}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-hover/50"
            >
              <Mail className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.sourceTitle ?? item.summary}</span>
              <ChevronDown className={cn("size-4 shrink-0 text-subtle transition-transform", sourceOpen && "rotate-180")} />
            </button>
            {sourceOpen && item.sourceDetail && (
              <pre className="mx-5 mb-4 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-xs leading-5 text-muted">
                {item.sourceDetail}
              </pre>
            )}
          </div>
        )}

        <div className="divide-y divide-line">
          {rows.map((row) => {
            const Icon = row.icon;
            const decision = item.decisions?.[row.id];
            const isRejected = decision === false;
            const isApproved = !isRejected;
            const explicitApproved = decision === true;
            const expanded = expandedRows.has(row.id);
            const responsibility = responsibilities.find((entry) => entry.id === row.meta);
            const tone = responsibility ? getTone(responsibility.color) : getTone("blue");
            return (
              <div key={row.id} className={cn("grid gap-3 px-5 py-4 transition-opacity sm:grid-cols-[1fr_auto]", isRejected && "opacity-60")}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRow(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleRow(row.id);
                    }
                  }}
                  className="flex min-w-0 cursor-pointer items-start gap-3 text-left"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${tone.hex}1f`, color: tone.hex }}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {editingId === row.id ? (
                      <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
                          <input
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveDraft();
                              if (event.key === "Escape") {
                                setEditingId(null);
                                setDraftTitle("");
                              }
                            }}
                            aria-label="Proposed title"
                            className="h-8 rounded-md border border-line bg-panel px-2.5 text-sm text-ink outline-none focus:border-ink/25"
                          />
                          <select
                            value={row.meta ?? ""}
                            onChange={(event) => updateExtractionProposal(item.id, row.id, { responsibilityId: event.target.value })}
                            aria-label="Proposed label"
                            className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink outline-none focus:border-ink/25"
                          >
                            <option value="">Unsorted</option>
                            {responsibilities.map((entry) => (
                              <option key={entry.id} value={entry.id}>{entry.name}</option>
                            ))}
                          </select>
                        </div>
                        {row.kind === "Event" && row.startsAt && row.endsAt && (
                          <DateTimeRow
                            startsAt={row.startsAt}
                            endsAt={row.endsAt}
                            onChange={(startsAt, endsAt) => updateExtractionProposal(item.id, row.id, { startsAt, endsAt })}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className={cn("min-w-0 truncate text-sm font-medium text-ink", isRejected && "text-muted line-through")}>{row.title}</p>
                          <span className={cn(
                            "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium",
                            isRejected ? "bg-danger/10 text-danger" : explicitApproved ? "bg-success/10 text-success" : "bg-hover text-muted"
                          )}>
                            {isRejected ? "Skipped" : explicitApproved ? "Approved" : "Suggested"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {row.kind} · {responsibility?.name ?? "Unsorted"}
                          {row.startsAt && (
                            <> · {new Date(row.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>
                          )}
                        </p>
                        {expanded && row.detail && (
                          <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-xs leading-5 text-muted">
                            {row.detail}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 sm:self-start">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (editingId === row.id) {
                        saveDraft();
                      } else {
                        startEditing(row);
                      }
                    }}
                    className={iconButtonClass(cn(editingId === row.id && "bg-hover text-ink"))}
                    title={editingId === row.id ? "Done editing" : "Edit proposed item"}
                    aria-label={editingId === row.id ? "Done editing proposed item" : "Edit proposed item"}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setExtractionDecision(item.id, row.id, true);
                    }}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg border transition-colors",
                      isApproved ? "border-success/30 bg-success/10 text-success" : "border-line text-muted hover:text-ink"
                    )}
                    title="Approve suggestion"
                    aria-label="Approve suggestion"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setExtractionDecision(item.id, row.id, false);
                    }}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg border transition-colors",
                      isRejected ? "border-danger/30 bg-danger/10 text-danger" : "border-line text-muted hover:text-ink"
                    )}
                    title="Reject suggestion"
                    aria-label="Reject suggestion"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 lg:sticky lg:top-8">
        <p className="text-[13px] text-muted">Ready to commit</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          {approvedCount} <span className="text-sm font-normal text-muted">of {rows.length}</span>
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">Approved items become real tasks, events, and notes. Skipped ones stay with the capture.</p>
        <div className="mt-4 grid gap-2">
          <Button
            variant="primary"
            onClick={() => {
              commitExtraction(item.id);
              onQueueChange?.();
            }}
          >
            Commit {approvedCount} {approvedCount === 1 ? "change" : "changes"}
          </Button>
          <Button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              snoozeExtraction(item.id, tomorrow.toISOString());
              onQueueChange?.();
            }}
          >
            <Clock className="size-4" />
            Snooze until tomorrow
          </Button>
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => {
              rejectExtraction(item.id);
              onQueueChange?.();
            }}
          >
            Discard capture
          </Button>
        </div>
      </Card>
    </div>
  );
}
