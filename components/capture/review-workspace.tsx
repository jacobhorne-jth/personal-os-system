"use client";

import { CalendarPlus, Check, FileText, GitPullRequestArrow, ListChecks, ListTodo, Pencil, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ReviewWorkspace() {
  const items = useAppStore((state) => state.aiReviewItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const setExtractionDecision = useAppStore((state) => state.setExtractionDecision);
  const commitExtraction = useAppStore((state) => state.commitExtraction);
  const item = items.find((entry) => entry.status !== "approved" && entry.status !== "rejected") ?? items[0];

  if (!item) {
    return (
      <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        No pending captures. New parsed captures will appear here for review.
      </div>
    );
  }

  const rows = [
    ...item.proposedTasks.map((task) => ({ id: `task-${task.title}`, kind: "Task", icon: ListTodo, title: task.title, meta: task.responsibilityId })),
    ...item.proposedEvents.map((event) => ({ id: `event-${event.title}`, kind: "Event", icon: CalendarPlus, title: event.title, meta: event.responsibilityId })),
    ...item.proposedNotes.map((note) => ({ id: `note-${note.title}`, kind: "Note", icon: FileText, title: note.title, meta: note.responsibilityId })),
    ...(item.proposedListItems ?? []).map((listItem) => ({
      id: `list-${listItem.listTitle}:${listItem.itemTitle}`,
      kind: "List item",
      icon: ListChecks,
      title: `${listItem.itemTitle} -> ${listItem.listTitle}`,
      meta: listItem.responsibilityId
    }))
  ];

  const approvedCount = rows.filter((row) => item.decisions?.[row.id] !== false).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-glow">
        <div className="border-b border-line bg-line px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-mint text-white">
              <GitPullRequestArrow className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{item.summary}</p>
              <p className="mt-1 text-xs text-muted">Review proposed changes before anything is committed.</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-line">
          {rows.map((row) => {
            const Icon = row.icon;
            const isApproved = item.decisions?.[row.id] !== false;
            const responsibility = responsibilities.find((entry) => entry.id === row.meta);
            const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
            return (
              <div key={row.id} className={cn("grid gap-3 p-4 transition sm:grid-cols-[1fr_auto]", isApproved && "bg-mint/5")}>
                <div className="flex items-start gap-3">
                  <div className={cn("grid size-9 place-items-center rounded-lg border bg-line text-muted", tone.border)}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{row.title}</p>
                    <p className="mt-1 text-xs text-muted">{row.kind} - {responsibility?.name ?? "Unsorted"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:border-muted hover:text-ink">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      setExtractionDecision(item.id, row.id, true);
                    }}
                    className="grid size-9 place-items-center rounded-lg bg-mint text-white transition hover:brightness-110"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      setExtractionDecision(item.id, row.id, false);
                    }}
                    className="grid size-9 place-items-center rounded-lg bg-coral text-white transition hover:brightness-110"
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
        <button onClick={() => commitExtraction(item.id)} className="mt-4 w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:bg-ink/90">Commit approved</button>
      </aside>
    </div>
  );
}
