"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Paperclip, TrendingUp } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { Panel } from "@/components/ui/panel";

export function WorkspacePanels({ responsibilityId, sections = ["notes", "files", "pulse"] }: { responsibilityId: string; sections?: Array<"notes" | "files" | "pulse"> }) {
  const allNotes = useAppStore((state) => state.notes);
  const allFiles = useAppStore((state) => state.files);
  const allTasks = useAppStore((state) => state.tasks);
  const allCalendarItems = useAppStore((state) => state.calendarItems);
  const notes = useMemo(() => allNotes.filter((note) => note.responsibilityId === responsibilityId), [allNotes, responsibilityId]);
  const files = useMemo(() => allFiles.filter((file) => file.responsibilityId === responsibilityId), [allFiles, responsibilityId]);
  const tasks = useMemo(() => allTasks.filter((task) => task.responsibilityId === responsibilityId), [allTasks, responsibilityId]);
  const calendarItems = useMemo(() => allCalendarItems.filter((item) => item.responsibilityId === responsibilityId), [allCalendarItems, responsibilityId]);
  const doneTasks = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="space-y-4">
      {sections.includes("notes") && <Panel title="Notes" eyebrow="context">
        <div className="divide-y divide-line">
          {notes.map((note) => (
            <Link key={note.id} href={`/notes/${note.id}`} className="block px-4 py-3 transition hover:bg-line">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-line text-muted">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink">{note.title || "Untitled"}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{note.body || "Empty page"}</p>
                </div>
              </div>
            </Link>
          ))}
          {!notes.length && <p className="p-4 text-sm text-muted">No notes yet.</p>}
        </div>
      </Panel>}
      {sections.includes("files") && <Panel title="Files" eyebrow="uploads">
        <div className="divide-y divide-line">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-line text-muted">
                  <Paperclip className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{file.filename}</p>
                  <p className="text-xs text-muted">{file.sizeLabel}</p>
                </div>
              </div>
              <span className="rounded-md border border-line bg-line px-2 py-1 text-xs text-muted">
                file
              </span>
            </div>
          ))}
          {!files.length && <p className="p-4 text-sm text-muted">No files yet.</p>}
        </div>
      </Panel>}
      {sections.includes("pulse") && <Panel title="Pulse" eyebrow="workspace analytics">
        <div className="grid grid-cols-3 gap-2 p-4">
          <div className="rounded-lg border border-line bg-line p-3">
            <TrendingUp className="mb-3 size-4 text-mint" />
            <p className="text-xl font-semibold text-ink">{calendarItems.length}</p>
            <p className="text-xs text-muted">calendar items</p>
          </div>
          <div className="rounded-lg border border-line bg-line p-3">
            <p className="text-xl font-semibold text-ink">{tasks.length}</p>
            <p className="mt-3 text-xs text-muted">open loops</p>
          </div>
          <div className="rounded-lg border border-line bg-line p-3">
            <p className="text-xl font-semibold text-ink">{doneTasks}</p>
            <p className="mt-3 text-xs text-muted">completed</p>
          </div>
        </div>
      </Panel>}
    </div>
  );
}
