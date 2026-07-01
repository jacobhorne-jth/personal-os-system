"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { noteLabels } from "@/lib/note-labels";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

export function NotesWorkspace() {
  const router = useRouter();
  const responsibilities = useAppStore((state) => state.responsibilities);
  const notes = useAppStore((state) => state.notes);
  const addNote = useAppStore((state) => state.addNote);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter((note) => {
        const responsibility = responsibilities.find((item) => item.id === note.responsibilityId);
        const textMatch = normalized
          ? `${note.title} ${note.body} ${responsibility?.name ?? ""} ${(note.labels ?? []).join(" ")}`.toLowerCase().includes(normalized)
          : true;
        const labelMatch = labelFilter === "all" || (note.labels ?? []).includes(labelFilter);
        return textMatch && labelMatch;
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastOpenedAt ?? a.updatedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.lastOpenedAt ?? b.updatedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [labelFilter, notes, query, responsibilities]);

  function createBlankNote() {
    const noteId = addNote({
      title: "",
      body: "",
      responsibilityId: "personal",
      labels: labelFilter === "all" ? [] : [labelFilter]
    });
    router.push(`/notes/${noteId}`);
  }

  return (
    <main className="min-h-[calc(100dvh-96px)] min-w-0 rounded-lg border border-line bg-[#242528]">
      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-medium text-ink">Notes</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-muted sm:w-[320px]">
              <Search className="size-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes"
                className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
              />
            </label>
            <select
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue sm:w-[180px]"
              aria-label="Filter by label"
            >
              <option value="all">All labels</option>
              {noteLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createBlankNote}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue px-4 text-sm font-medium text-white transition hover:brightness-110"
            >
              <Plus className="size-4" />
              New
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_160px_110px] gap-3 border-b border-line px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
          <span />
          <span>Name</span>
          <span>Label</span>
          <span>Opened</span>
        </div>
        <div className="divide-y divide-line">
          {filteredNotes.map((note) => {
            const primaryLabel = note.labels?.[0] ?? "No label";
            return (
              <Link key={note.id} href={`/notes/${note.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_160px_110px] items-center gap-3 px-4 py-2 transition hover:bg-line">
                <FileText className="size-4 text-[#8ab4f8]" />
                <p className={cn("truncate text-sm font-medium", note.title ? "text-ink" : "text-muted")}>
                  {note.title || "Untitled"}
                </p>
                <span className="truncate text-xs text-muted">{primaryLabel}</span>
                <p className="shrink-0 text-xs text-muted">
                  {new Date(note.lastOpenedAt ?? note.updatedAt ?? note.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
              </Link>
            );
          })}
          {!filteredNotes.length && (
            <div className="px-4 py-10 text-center text-sm text-muted">
              No notes match this view.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
