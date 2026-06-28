"use client";

import Link from "next/link";
import { ArrowRight, GitPullRequestArrow, Plus, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";

export function AiReviewCard() {
  const item = useAppStore((state) => state.aiReviewItems.find((entry) => entry.status !== "approved" && entry.status !== "rejected"));
  const responsibilities = useAppStore((state) => state.responsibilities);

  if (!item) {
    return <p className="p-4 text-sm text-muted">Nothing pending. Capture something messy and it will land here.</p>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-mint text-white">
          <GitPullRequestArrow className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{item.summary}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-line">
              <div className="h-full rounded-full bg-mint" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
            </div>
            <p className="text-xs text-muted">{Math.round(item.confidence * 100)}% confidence</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {item.proposedTasks.map((task) => (
          <div key={task.title} className="rounded-lg bg-mint p-3 text-white">
            <div className="flex items-start gap-2">
              <Plus className="mt-0.5 size-4 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">{task.title}</p>
                <p className="text-xs text-white/85">
                  Task - {responsibilities.find((entry) => entry.id === task.responsibilityId)?.name}
                </p>
              </div>
            </div>
          </div>
        ))}
        {item.proposedEvents.map((event) => (
          <div key={event.title} className="rounded-lg bg-blue p-3 text-white">
            <div className="flex items-start gap-2">
              <Plus className="mt-0.5 size-4 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">{event.title}</p>
                <p className="text-xs text-white/85">Calendar item - {new Date(event.startsAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Link href="/inbox" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:bg-ink/90">
          Review changes
          <ArrowRight className="size-4" />
        </Link>
        <button className="grid size-10 place-items-center rounded-lg border border-line text-muted">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
