"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const noteLabels = [
  "class notes",
  "research",
  "shopping list",
  "random learning",
  "meeting notes",
  "project docs",
  "ideas",
  "writing",
  "deep work",
  "quick"
];

export function NotesWorkspace() {
  const router = useRouter();
  const responsibilities = useAppStore((state) => state.responsibilities);
  const notes = useAppStore((state) => state.notes);
  const addNote = useAppStore((state) => state.addNote);
  const [query, setQuery] = useState("");
  const [responsibilityFilter, setResponsibilityFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter((note) => {
        const responsibility = responsibilities.find((item) => item.id === note.responsibilityId);
        const textMatch = normalized
          ? `${note.title} ${note.body} ${responsibility?.name ?? ""} ${(note.labels ?? []).join(" ")}`.toLowerCase().includes(normalized)
          : true;
        const responsibilityMatch = responsibilityFilter === "all" || note.responsibilityId === responsibilityFilter;
        const labelMatch = labelFilter === "all" || (note.labels ?? []).includes(labelFilter);
        return textMatch && responsibilityMatch && labelMatch;
      })
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  }, [labelFilter, notes, query, responsibilities, responsibilityFilter]);

  function createBlankNote() {
    const noteId = addNote({
      title: "",
      body: "",
      responsibilityId: responsibilityFilter === "all" ? "personal" : responsibilityFilter,
      labels: labelFilter === "all" ? [] : [labelFilter]
    });
    router.push(`/notes/${noteId}`);
  }

  return (
    <div className="grid min-h-[calc(100dvh-96px)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <button
          type="button"
          onClick={createBlankNote}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New page
        </button>

        <section className="rounded-lg border border-line bg-[#242528] p-3">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-muted">
            <Search className="size-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes and docs"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
            />
          </label>
          <div className="mt-3 grid gap-2">
            <select
              value={responsibilityFilter}
              onChange={(event) => setResponsibilityFilter(event.target.value)}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
            >
              <option value="all">All responsibilities</option>
              {responsibilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className="h-10 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
            >
              <option value="all">All labels</option>
              {noteLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

      </aside>

      <main className="min-w-0 rounded-lg border border-line bg-[#242528]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Notes and docs</p>
            <p className="mt-0.5 text-xs text-muted">{filteredNotes.length} visible</p>
          </div>
          <button
            type="button"
            onClick={createBlankNote}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-line hover:text-ink"
            aria-label="Create note"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="divide-y divide-line">
          {filteredNotes.map((note) => {
            const responsibility = responsibilities.find((item) => item.id === note.responsibilityId);
            const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
            const primaryLabel = note.labels?.[0];
            return (
              <Link key={note.id} href={`/notes/${note.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2 transition hover:bg-line">
                <FileText className="size-4 text-muted" />
                <p className={cn("truncate text-sm font-medium", note.title ? "text-ink" : "text-muted")}>
                  {note.title || "Untitled"}
                </p>
                <span className="inline-flex max-w-[180px] items-center gap-1.5 truncate rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                  <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
                  <span className="truncate">{primaryLabel ?? responsibility?.name ?? "Unsorted"}</span>
                </span>
                <p className="shrink-0 text-[11px] text-muted">
                  {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
              </Link>
            );
          })}
          {!filteredNotes.length && (
            <div className="px-4 py-10 text-center text-sm text-muted">
              No notes match these filters.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
