"use client";

import { useState } from "react";
import { CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, GitPullRequestArrow, ListChecks, ListTodo, Mail, Pencil, X } from "lucide-react";
import { DateTimeRow } from "@/components/calendar/date-time-picker";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ReviewWorkspace() {
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

  const pending = items.filter((entry) => entry.status !== "approved" && entry.status !== "rejected");
  const safeIdx = Math.min(pendingIdx, Math.max(0, pending.length - 1));
  const item = pending[safeIdx] ?? items[0];

  if (!item) {
    return (
      <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        No pending captures. New parsed captures will appear here for review.
      </div>
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
    })),
    ...(item.proposedListItems ?? []).map((listItem) => ({
      id: `list-${listItem.listTitle}:${listItem.itemTitle}`,
      kind: "List item",
      icon: ListChecks,
      title: `${listItem.itemTitle} -> ${listItem.listTitle}`,
      editTitle: listItem.itemTitle,
      meta: listItem.responsibilityId,
      startsAt: undefined as string | undefined,
      endsAt: undefined as string | undefined,
      detail: `Add "${listItem.itemTitle}" to "${listItem.listTitle}".`,
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
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-glow">
        <div className="border-b border-line bg-line px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-mint text-white">
              <GitPullRequestArrow className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{item.summary}</p>
              <p className="mt-1 text-xs text-muted">Review proposed changes before anything is committed.</p>
            </div>
            {pending.length > 1 && (
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-paper px-1 py-0.5">
                <button
                  onClick={() => setPendingIdx((i) => Math.max(0, i - 1))}
                  disabled={safeIdx === 0}
                  className="grid size-6 place-items-center rounded text-muted transition hover:text-ink disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-xs tabular-nums text-muted">{safeIdx + 1} / {pending.length}</span>
                <button
                  onClick={() => setPendingIdx((i) => Math.min(pending.length - 1, i + 1))}
                  disabled={safeIdx >= pending.length - 1}
                  className="grid size-6 place-items-center rounded text-muted transition hover:text-ink disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        {(item.sourceTitle || item.sourceDetail) && (
          <div className="border-b border-line bg-paper/70">
            <button
              type="button"
              onClick={() => setSourceOpen((open) => !open)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-hover"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-panel text-muted">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted">Source</p>
                <p className="truncate text-sm font-medium text-ink">{item.sourceTitle ?? item.summary}</p>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", sourceOpen && "rotate-180")} />
            </button>
            {sourceOpen && item.sourceDetail && (
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap border-t border-line px-4 py-3 text-xs leading-5 text-muted">
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
              <div key={row.id} className={cn("grid gap-3 p-4 transition sm:grid-cols-[1fr_auto]", isApproved ? "bg-mint/5" : "bg-coral/5 opacity-75")}>
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
                  <div className="grid size-9 place-items-center rounded-lg border bg-line text-muted" style={{ borderColor: tone.hex }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === row.id ? (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
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
                            className="h-9 rounded-md border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-blue"
                          />
                          <select
                            value={row.meta ?? ""}
                            onChange={(event) => updateExtractionProposal(item.id, row.id, { responsibilityId: event.target.value })}
                            className="h-9 rounded-md border border-line bg-paper px-2 text-xs text-ink outline-none focus:border-blue"
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
                        <div className="flex min-w-0 items-center gap-2">
                          <p className={cn("truncate text-sm font-medium text-ink", isRejected && "line-through text-muted")}>{row.title}</p>
                          <span className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            isRejected ? "bg-coral/15 text-coral" : explicitApproved ? "bg-mint/15 text-mint" : "bg-blue/15 text-blue"
                          )}>
                            {isRejected ? "Rejected" : explicitApproved ? "Approved" : "Suggested"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {row.kind} - {responsibility?.name ?? "Unsorted"}
                          {row.startsAt && (
                            <> · {new Date(row.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>
                          )}
                        </p>
                        {expanded && row.detail && (
                          <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-paper p-3 text-xs leading-5 text-muted">
                            {row.detail}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                  <ChevronDown className={cn("mt-2 size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (editingId === row.id) {
                        saveDraft();
                      } else {
                        startEditing(row);
                      }
                    }}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:border-muted hover:text-ink",
                      editingId === row.id && "border-blue text-blue"
                    )}
                    title={editingId === row.id ? "Done editing" : "Edit proposed item"}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setExtractionDecision(item.id, row.id, true);
                    }}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border transition hover:brightness-110",
                      isApproved ? "border-mint bg-mint text-white" : "border-line bg-paper text-muted"
                    )}
                    title="Approve suggestion"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setExtractionDecision(item.id, row.id, false);
                    }}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border transition hover:brightness-110",
                      isRejected ? "border-coral bg-coral text-white" : "border-line bg-paper text-muted"
                    )}
                    title="Reject suggestion"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="h-fit rounded-lg border border-line bg-panel p-4 shadow-glow">
        <p className="text-sm font-medium text-ink">Commit summary</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{approvedCount}</p>
        <p className="text-xs text-muted">approved changes</p>
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-line p-3 text-xs text-muted">
          <p>Approved items will become real tasks, events, notes, or logs.</p>
          <p>Rejected items stay attached to the capture for audit.</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button onClick={() => commitExtraction(item.id)} className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:bg-ink/90">Commit approved</button>
          <button onClick={() => rejectExtraction(item.id)} className="w-full rounded-lg border border-coral px-3 py-2 text-sm font-medium text-coral transition hover:bg-coral hover:text-white">Reject capture</button>
        </div>
      </aside>
    </div>
  );
}
