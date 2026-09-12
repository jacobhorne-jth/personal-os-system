"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Folder, FolderPlus, Inbox, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { noteLabels } from "@/lib/note-labels";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { Button, Card, EmptyState, Page, PageHeader, iconButtonClass, inputClass } from "@/components/ui/primitives";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type FolderFilter = "all" | "unfiled" | string;

function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function NotesWorkspace() {
  const router = useRouter();
  const responsibilities = useAppStore((state) => state.responsibilities);
  const activeResponsibilities = useActiveResponsibilities();
  const notes = useAppStore((state) => state.notes);
  const noteFolders = useAppStore((state) => state.noteFolders);
  const addNote = useAppStore((state) => state.addNote);
  const addNoteFolder = useAppStore((state) => state.addNoteFolder);
  const updateNoteFolder = useAppStore((state) => state.updateNoteFolder);
  const deleteNoteFolder = useAppStore((state) => state.deleteNoteFolder);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<ResponsibilityColor>("blue");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deleteConfirmFolderId, setDeleteConfirmFolderId] = useState<string | null>(null);

  const selectedFolder = noteFolders.find((folder) => folder.id === folderFilter);
  const unfiledCount = notes.filter((note) => !note.folderId).length;
  const heading = folderFilter === "all" ? "All notes" : folderFilter === "unfiled" ? "Unfiled" : selectedFolder?.name ?? "Folder";

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter((note) => {
        const responsibility = responsibilities.find((item) => item.id === note.responsibilityId);
        const folder = noteFolders.find((item) => item.id === note.folderId);
        const textMatch = normalized
          ? `${note.title} ${note.body} ${responsibility?.name ?? ""} ${folder?.name ?? ""} ${(note.labels ?? []).join(" ")}`.toLowerCase().includes(normalized)
          : true;
        const labelMatch = labelFilter === "all" || (note.labels ?? []).includes(labelFilter);
        const folderMatch =
          folderFilter === "all" ||
          (folderFilter === "unfiled" ? !note.folderId : note.folderId === folderFilter);
        return textMatch && labelMatch && folderMatch;
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastOpenedAt ?? a.updatedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.lastOpenedAt ?? b.updatedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [folderFilter, labelFilter, noteFolders, notes, query, responsibilities]);

  function createBlankNote() {
    const noteId = addNote({
      title: "",
      body: "",
      responsibilityId: activeResponsibilities[0]?.id ?? "personal",
      folderId: folderFilter === "all" || folderFilter === "unfiled" ? undefined : folderFilter,
      labels: labelFilter === "all" ? [] : [labelFilter]
    });
    router.push(`/notes/${noteId}`);
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folderId = addNoteFolder({ name, color: newFolderColor });
    setNewFolderName("");
    setFolderFilter(folderId);
  }

  function startEditingFolder(folderId: string, name: string) {
    setEditingFolderId(folderId);
    setEditingFolderName(name);
    setDeleteConfirmFolderId(null);
  }

  function saveFolderName() {
    if (!editingFolderId) return;
    const nextName = editingFolderName.trim();
    if (nextName) updateNoteFolder(editingFolderId, { name: nextName });
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  function removeFolder(folderId: string) {
    if (deleteConfirmFolderId !== folderId) {
      setDeleteConfirmFolderId(folderId);
      return;
    }
    deleteNoteFolder(folderId);
    if (folderFilter === folderId) setFolderFilter("all");
    setDeleteConfirmFolderId(null);
  }

  const navRow = (active: boolean) =>
    cn(
      "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors",
      active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
    );

  return (
    <Page width="wide">
      <PageHeader
        title="Notes"
        description={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        actions={
          <Button variant="primary" onClick={createBlankNote}>
            <Plus className="size-4" />
            New note
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-8">
          <div className="space-y-0.5">
            <button type="button" onClick={() => setFolderFilter("all")} className={navRow(folderFilter === "all")}>
              <FileText className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">All notes</span>
              <span className="text-xs tabular-nums text-subtle">{notes.length}</span>
            </button>
            <button type="button" onClick={() => setFolderFilter("unfiled")} className={navRow(folderFilter === "unfiled")}>
              <Inbox className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Unfiled</span>
              <span className="text-xs tabular-nums text-subtle">{unfiledCount}</span>
            </button>
          </div>

          <p className="mb-1 mt-5 px-2.5 text-[11px] font-medium text-subtle">Folders</p>
          <div className="space-y-0.5">
            {noteFolders.map((folder) => {
              const tone = getTone(folder.color) ?? getTone("blue");
              const count = notes.filter((note) => note.folderId === folder.id).length;
              const isEditing = editingFolderId === folder.id;
              const active = folderFilter === folder.id;
              return (
                <div
                  key={folder.id}
                  className={cn(
                    "group flex h-8 items-center gap-1 rounded-lg pl-2.5 pr-1 transition-colors",
                    active ? "bg-hover text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
                  )}
                >
                  <Folder className="size-4 shrink-0" style={{ color: tone.hex }} />
                  {isEditing ? (
                    <>
                      <input
                        value={editingFolderName}
                        onChange={(event) => setEditingFolderName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveFolderName();
                          if (event.key === "Escape") setEditingFolderId(null);
                        }}
                        autoFocus
                        aria-label="Folder name"
                        className="ml-1.5 h-6 min-w-0 flex-1 rounded border border-line bg-panel px-1.5 text-[13px] text-ink outline-none focus:border-ink/25"
                      />
                      <button type="button" onClick={saveFolderName} className={iconButtonClass("size-6")} aria-label={`Save ${folder.name}`}>
                        <Check className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingFolderId(null)} className={iconButtonClass("size-6")} aria-label={`Cancel renaming ${folder.name}`}>
                        <X className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setFolderFilter(folder.id)} className={cn("ml-1.5 min-w-0 flex-1 truncate text-left text-[13px]", active && "font-medium")}>
                        {folder.name}
                      </button>
                      <span className="text-xs tabular-nums text-subtle group-hover:hidden">{count}</span>
                      <span className="hidden items-center group-hover:flex">
                        <ResponsibilityColorPicker value={folder.color} onChange={(color) => updateNoteFolder(folder.id, { color })} compact />
                        <button type="button" onClick={() => startEditingFolder(folder.id, folder.name)} className={iconButtonClass("size-6")} aria-label={`Rename ${folder.name}`}>
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFolder(folder.id)}
                          className={cn(iconButtonClass("size-6 hover:text-danger"), deleteConfirmFolderId === folder.id && "w-auto px-1.5 text-danger")}
                          aria-label={`${deleteConfirmFolderId === folder.id ? "Confirm deleting" : "Delete"} ${folder.name}`}
                        >
                          {deleteConfirmFolderId === folder.id ? <span className="text-[11px] font-medium">Delete?</span> : <Trash2 className="size-3" />}
                        </button>
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-1 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-muted focus-within:bg-hover/70">
            <FolderPlus className="size-4 shrink-0" />
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createFolder();
              }}
              placeholder="New folder"
              aria-label="New folder name"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-subtle"
            />
            {newFolderName.trim() && <ResponsibilityColorPicker value={newFolderColor} onChange={setNewFolderColor} compact />}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <h2 className="mr-auto text-[13px] font-semibold text-ink">{heading}</h2>
            <label className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes"
                aria-label="Search notes"
                className={cn(inputClass, "pl-9")}
              />
            </label>
            <select
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className={cn(inputClass, "sm:w-40")}
              aria-label="Filter by label"
            >
              <option value="all">All labels</option>
              {noteLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Card className="overflow-hidden">
            {filteredNotes.length > 0 ? (
              <div className="divide-y divide-line">
                {filteredNotes.map((note) => {
                  const folder = noteFolders.find((item) => item.id === note.folderId);
                  const snippet = note.body.split("\n").find((line) => line.trim())?.trim();
                  return (
                    <Link
                      key={note.id}
                      href={`/notes/${note.id}`}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-hover/50"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-subtle" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", note.title ? "text-ink" : "text-muted")}>
                          {note.title || "Untitled"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">{snippet || "Empty note"}</p>
                      </div>
                      <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs text-subtle sm:flex">
                        <span>{relativeDate(note.lastOpenedAt ?? note.updatedAt ?? note.createdAt)}</span>
                        <span className="flex items-center gap-1.5">
                          {folder && (
                            <>
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: getTone(folder.color).hex }} />
                              {folder.name}
                            </>
                          )}
                          {note.labels?.[0] && <span>{folder ? " · " : ""}{note.labels[0]}</span>}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={notes.length ? "No notes match" : "No notes yet"}
                description={notes.length ? "Try a different search, folder, or label." : "Write down anything worth keeping."}
                action={!notes.length ? <Button size="sm" variant="primary" onClick={createBlankNote}><Plus className="size-3.5" />New note</Button> : undefined}
              />
            )}
          </Card>
        </section>
      </div>
    </Page>
  );
}
