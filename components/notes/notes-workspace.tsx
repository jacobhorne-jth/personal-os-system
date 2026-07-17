"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Folder, FolderPlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { noteLabels } from "@/lib/note-labels";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type FolderFilter = "all" | "unfiled" | string;

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

  return (
    <main className="grid min-h-[calc(100dvh-96px)] min-w-0 overflow-hidden rounded-lg border border-line bg-[#242528] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-[#202124] lg:border-b-0 lg:border-r">
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-medium text-ink">Notes</h1>
            <button
              type="button"
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-line hover:text-ink disabled:opacity-40"
              aria-label="Create folder"
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex h-9 items-center gap-2 rounded-md border border-line bg-paper px-2">
            <FolderPlus className="size-4 text-muted" />
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createFolder();
              }}
              placeholder="New folder"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            <ResponsibilityColorPicker value={newFolderColor} onChange={setNewFolderColor} compact />
          </div>
        </div>

        <div className="max-h-[34dvh] overflow-y-auto p-2 lg:max-h-none">
          <button
            type="button"
            onClick={() => setFolderFilter("all")}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm transition",
              folderFilter === "all" ? "bg-line text-ink" : "text-muted hover:bg-line hover:text-ink"
            )}
          >
            <FileText className="size-4" />
            <span className="min-w-0 flex-1 truncate">All notes</span>
            <span className="text-xs text-muted">{notes.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setFolderFilter("unfiled")}
            className={cn(
              "mt-1 flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm transition",
              folderFilter === "unfiled" ? "bg-line text-ink" : "text-muted hover:bg-line hover:text-ink"
            )}
          >
            <Folder className="size-4" />
            <span className="min-w-0 flex-1 truncate">Unfiled</span>
            <span className="text-xs text-muted">{unfiledCount}</span>
          </button>

          <div className="mt-3 space-y-1">
            {noteFolders.map((folder) => {
              const tone = responsibilityTone[folder.color] ?? responsibilityTone.blue;
              const count = notes.filter((note) => note.folderId === folder.id).length;
              const isEditing = editingFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className={cn(
                    "group flex min-h-10 items-center gap-2 rounded-md px-2 transition",
                    folderFilter === folder.id ? "bg-line text-ink" : "text-muted hover:bg-line hover:text-ink"
                  )}
                >
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3 py-2">
                      <Folder className="size-4 shrink-0" style={{ color: tone.hex }} />
                      <input
                        value={editingFolderName}
                        onChange={(event) => setEditingFolderName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveFolderName();
                          if (event.key === "Escape") setEditingFolderId(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        autoFocus
                        className="h-7 min-w-0 flex-1 rounded border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-blue"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFolderFilter(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                    >
                      <Folder className="size-4 shrink-0" style={{ color: tone.hex }} />
                      <span className="min-w-0 flex-1 truncate text-sm">{folder.name}</span>
                    </button>
                  )}
                  {isEditing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <ResponsibilityColorPicker value={folder.color} onChange={(color) => updateNoteFolder(folder.id, { color })} compact />
                      <button type="button" onClick={saveFolderName} className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-mint" aria-label="Save folder">
                        <Check className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingFolderId(null)} className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-ink" aria-label="Cancel rename">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="w-5 text-right text-xs text-muted">{count}</span>
                      <span className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <ResponsibilityColorPicker value={folder.color} onChange={(color) => updateNoteFolder(folder.id, { color })} compact />
                      </span>
                      <button type="button" onClick={() => startEditingFolder(folder.id, folder.name)} className="grid size-7 place-items-center rounded text-muted opacity-100 hover:bg-paper hover:text-ink lg:opacity-0 lg:group-hover:opacity-100" aria-label="Rename folder">
                        <Pencil className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => removeFolder(folder.id)} className={cn("grid h-7 place-items-center rounded px-1.5 text-muted opacity-100 hover:bg-paper hover:text-coral lg:opacity-0 lg:group-hover:opacity-100", deleteConfirmFolderId === folder.id && "text-coral opacity-100")} aria-label="Delete folder">
                        {deleteConfirmFolderId === folder.id ? <span className="text-[11px] font-medium">Confirm</span> : <Trash2 className="size-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-medium text-ink">{heading}</h2>
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

        <div className="grid grid-cols-[auto_minmax(0,1fr)_150px_150px_110px] gap-3 border-b border-line px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted max-md:grid-cols-[auto_minmax(0,1fr)_84px]">
          <span />
          <span>Name</span>
          <span className="max-md:hidden">Folder</span>
          <span>Label</span>
          <span className="max-md:hidden">Opened</span>
        </div>
        <div className="divide-y divide-line">
          {filteredNotes.map((note) => {
            const primaryLabel = note.labels?.[0] ?? "No label";
            const folder = noteFolders.find((item) => item.id === note.folderId);
            return (
              <Link key={note.id} href={`/notes/${note.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_150px_150px_110px] items-center gap-3 px-4 py-2 transition hover:bg-line max-md:grid-cols-[auto_minmax(0,1fr)_84px]">
                <FileText className="size-4 text-[#8ab4f8]" />
                <p className={cn("truncate text-sm font-medium", note.title ? "text-ink" : "text-muted")}>
                  {note.title || "Untitled"}
                </p>
                <span className="truncate text-xs text-muted max-md:hidden">{folder?.name ?? "Unfiled"}</span>
                <span className="truncate text-xs text-muted">{primaryLabel}</span>
                <p className="shrink-0 text-xs text-muted max-md:hidden">
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
      </section>
    </main>
  );
}
