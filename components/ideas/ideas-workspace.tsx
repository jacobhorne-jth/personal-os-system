"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lightbulb, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { Idea, IdeaStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const COLUMNS: { id: IdeaStatus; label: string; description: string }[] = [
  { id: "raw", label: "Raw", description: "Unfiltered captures" },
  { id: "considering", label: "Considering", description: "Worth thinking about" },
  { id: "active", label: "Active", description: "In progress" },
  { id: "paused", label: "Paused", description: "On hold" },
];

const STATUS_ORDER: IdeaStatus[] = ["raw", "considering", "active", "paused"];

type EditState = {
  id: string | "new";
  title: string;
  notes: string;
  responsibilityId: string;
  status: IdeaStatus;
};

export function IdeasWorkspace() {
  const ideas = useAppStore((s) => s.ideas);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addIdea = useAppStore((s) => s.addIdea);
  const updateIdea = useAppStore((s) => s.updateIdea);
  const deleteIdea = useAppStore((s) => s.deleteIdea);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [addingTo, setAddingTo] = useState<IdeaStatus | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const byStatus = useMemo(
    () =>
      STATUS_ORDER.reduce<Record<IdeaStatus, Idea[]>>(
        (acc, s) => ({
          ...acc,
          [s]: ideas.filter((i) => i.status === s),
        }),
        { raw: [], considering: [], active: [], paused: [] }
      ),
    [ideas]
  );

  function quickAdd(status: IdeaStatus) {
    if (!addTitle.trim()) return;
    addIdea({ title: addTitle.trim() });
    if (status !== "raw") {
      // addIdea always inserts at index 0 with status "raw"; get that id from store snapshot
      const newId = useAppStore.getState().ideas[0]?.id;
      if (newId) updateIdea(newId, { status });
    }
    setAddTitle("");
    setAddingTo(null);
  }

  function startEdit(idea: Idea) {
    setDeleteConfirm(null);
    setEditing({
      id: idea.id,
      title: idea.title,
      notes: idea.notes ?? "",
      responsibilityId: idea.responsibilityId ?? "",
      status: idea.status,
    });
  }

  function saveEdit() {
    if (!editing?.title.trim()) return;
    if (editing.id === "new") {
      addIdea({
        title: editing.title.trim(),
        notes: editing.notes.trim() || undefined,
        responsibilityId: editing.responsibilityId || undefined,
      });
      if (editing.status !== "raw") {
        const newId = useAppStore.getState().ideas[0]?.id;
        if (newId) updateIdea(newId, { status: editing.status });
      }
    } else {
      updateIdea(editing.id, {
        title: editing.title.trim(),
        notes: editing.notes.trim() || undefined,
        responsibilityId: editing.responsibilityId || undefined,
        status: editing.status,
      });
    }
    setEditing(null);
  }

  function moveIdea(idea: Idea, direction: -1 | 1) {
    const idx = STATUS_ORDER.indexOf(idea.status);
    const next = STATUS_ORDER[idx + direction];
    if (next) updateIdea(idea.id, { status: next });
  }

  function handleDelete(ideaId: string) {
    if (deleteConfirm === ideaId) {
      deleteIdea(ideaId);
      setDeleteConfirm(null);
      if (editing?.id === ideaId) setEditing(null);
    } else {
      setDeleteConfirm(ideaId);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Ideas</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Idea board</h1>
          <p className="mt-2 text-sm text-muted">Capture freely, filter deliberately, act when ready.</p>
        </div>
        <button
          onClick={() => setEditing({ id: "new", title: "", notes: "", responsibilityId: "", status: "raw" })}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          Add idea
        </button>
      </header>

      {/* Edit modal */}
      {editing && (
        <div className="rounded-xl border border-blue/40 bg-panel p-4 shadow-glow">
          <p className="mb-3 text-xs font-medium text-blue">{editing.id === "new" ? "New idea" : "Edit idea"}</p>
          <div className="space-y-3">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
              placeholder="Idea title"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
            />
            <textarea
              value={editing.notes}
              onChange={(e) => setEditing((s) => s && { ...s, notes: e.target.value })}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Label</label>
                <select
                  value={editing.responsibilityId}
                  onChange={(e) => setEditing((s) => s && { ...s, responsibilityId: e.target.value })}
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
                >
                  <option value="">— none —</option>
                  {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing((s) => s && { ...s, status: e.target.value as IdeaStatus })}
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={!editing.title.trim()}
                className="flex-1 rounded-lg bg-blue py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                {editing.id === "new" ? "Create idea" : "Save changes"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
              {editing.id !== "new" && (
                <button
                  onClick={() => handleDelete(editing.id as string)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs transition",
                    deleteConfirm === editing.id
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-line bg-paper text-muted hover:border-red-500/40 hover:text-red-400"
                  )}
                >
                  {deleteConfirm === editing.id ? "Confirm" : <Trash2 className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colIdeas = byStatus[col.id];
          const isAdding = addingTo === col.id;

          return (
            <div key={col.id} className="flex flex-col rounded-xl border border-line bg-panel overflow-hidden">
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-line bg-line/40 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink">{col.label}</p>
                  <p className="text-[10px] text-muted">{col.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {colIdeas.length > 0 && (
                    <span className="rounded-full bg-line px-2 py-0.5 text-[10px] text-muted">{colIdeas.length}</span>
                  )}
                  <button
                    onClick={() => { setAddingTo(isAdding ? null : col.id); setAddTitle(""); }}
                    className="grid size-6 place-items-center rounded text-muted hover:bg-paper hover:text-ink transition"
                  >
                    {isAdding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick add */}
              {isAdding && (
                <div className="border-b border-blue/30 bg-blue/5 p-2">
                  <input
                    autoFocus
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") quickAdd(col.id);
                      if (e.key === "Escape") { setAddingTo(null); setAddTitle(""); }
                    }}
                    placeholder="Idea title…"
                    className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => quickAdd(col.id)}
                      disabled={!addTitle.trim()}
                      className="rounded-md bg-blue px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setAddTitle(""); }}
                      className="text-[11px] text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
                {colIdeas.length === 0 && !isAdding && (
                  <div className="flex flex-1 items-center justify-center py-6">
                    <Lightbulb className="size-5 text-muted opacity-20" />
                  </div>
                )}
                {colIdeas.map((idea) => {
                  const responsibility = responsibilities.find((r) => r.id === idea.responsibilityId);
                  const tone = responsibility ? getTone(responsibility.color) : null;
                  const statusIdx = STATUS_ORDER.indexOf(idea.status);

                  return (
                    <div
                      key={idea.id}
                      className="group relative rounded-lg border border-line bg-paper p-3 transition hover:border-blue/30"
                    >
                      <p className="pr-6 text-sm text-ink leading-snug">{idea.title}</p>
                      {idea.notes && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] text-muted">{idea.notes}</p>
                      )}
                      {tone && (
                        <span
                          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${tone.hex}20`, color: tone.hex }}
                        >
                          {responsibility?.name}
                        </span>
                      )}

                      {/* Hover actions */}
                      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => moveIdea(idea, -1)}
                          disabled={statusIdx === 0}
                          className="grid size-5 place-items-center rounded text-muted hover:bg-line hover:text-ink disabled:opacity-30"
                          title="Move left"
                        >
                          <ChevronLeft className="size-3" />
                        </button>
                        <button
                          onClick={() => moveIdea(idea, 1)}
                          disabled={statusIdx === STATUS_ORDER.length - 1}
                          className="grid size-5 place-items-center rounded text-muted hover:bg-line hover:text-ink disabled:opacity-30"
                          title="Move right"
                        >
                          <ChevronRight className="size-3" />
                        </button>
                        <button
                          onClick={() => startEdit(idea)}
                          className="grid size-5 place-items-center rounded text-muted hover:bg-line hover:text-ink"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
