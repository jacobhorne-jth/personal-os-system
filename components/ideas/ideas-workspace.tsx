"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Card, Field, Page, PageHeader, iconButtonClass, inputClass, textareaClass } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { Idea, IdeaStatus } from "@/lib/types/domain";

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
    <Page width="wide">
      <PageHeader
        title="Ideas"
        description="Capture freely, filter deliberately, act when ready."
        actions={
          <Button variant="primary" onClick={() => setEditing({ id: "new", title: "", notes: "", responsibilityId: "", status: "raw" })}>
            <Plus className="size-4" />
            New idea
          </Button>
        }
      />

      {editing && (
        <Card className="mb-6 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">{editing.id === "new" ? "New idea" : "Edit idea"}</p>
          <div className="space-y-3">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
              placeholder="Idea"
              aria-label="Idea title"
              className={inputClass}
            />
            <textarea
              value={editing.notes}
              onChange={(e) => setEditing((s) => s && { ...s, notes: e.target.value })}
              placeholder="Notes (optional)"
              rows={3}
              className={`${textareaClass} resize-none`}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Label">
                <select
                  value={editing.responsibilityId}
                  onChange={(e) => setEditing((s) => s && { ...s, responsibilityId: e.target.value })}
                  aria-label="Idea label"
                  className={inputClass}
                >
                  <option value="">None</option>
                  {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={editing.status}
                  onChange={(e) => setEditing((s) => s && { ...s, status: e.target.value as IdeaStatus })}
                  aria-label="Idea status"
                  className={inputClass}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-2 border-t border-line pt-4">
              {editing.id !== "new" && (
                <Button variant="danger" size="sm" onClick={() => handleDelete(editing.id as string)}>
                  {deleteConfirm === editing.id ? "Confirm delete" : <><Trash2 className="size-3.5" />Delete</>}
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={saveEdit} disabled={!editing.title.trim()}>
                  {editing.id === "new" ? "Create idea" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colIdeas = byStatus[col.id];
          const isAdding = addingTo === col.id;

          return (
            <section key={col.id} className="flex min-h-[200px] flex-col rounded-xl bg-hover/50 p-2">
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[13px] font-semibold text-ink">{col.label}</h2>
                  <span className="text-xs tabular-nums text-subtle">{colIdeas.length}</span>
                </div>
                <button
                  onClick={() => { setAddingTo(isAdding ? null : col.id); setAddTitle(""); }}
                  className={iconButtonClass("size-7 hover:bg-panel")}
                  aria-label={isAdding ? `Cancel adding to ${col.label}` : `Add idea to ${col.label}`}
                >
                  {isAdding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {isAdding && (
                  <div className="rounded-lg border border-line bg-panel p-2">
                    <input
                      autoFocus
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") quickAdd(col.id);
                        if (e.key === "Escape") { setAddingTo(null); setAddTitle(""); }
                      }}
                      placeholder="New idea…"
                      aria-label={`New idea in ${col.label}`}
                      className="h-8 w-full bg-transparent px-1 text-sm text-ink outline-none placeholder:text-subtle"
                    />
                    <div className="mt-1 flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAddingTo(null); setAddTitle(""); }}>Cancel</Button>
                      <Button size="sm" variant="primary" className="h-7" onClick={() => quickAdd(col.id)} disabled={!addTitle.trim()}>Add</Button>
                    </div>
                  </div>
                )}

                {colIdeas.length === 0 && !isAdding && (
                  <p className="px-2 py-4 text-xs text-subtle">{col.description}</p>
                )}

                {colIdeas.map((idea) => {
                  const responsibility = responsibilities.find((r) => r.id === idea.responsibilityId);
                  const tone = responsibility ? getTone(responsibility.color) : null;
                  const statusIdx = STATUS_ORDER.indexOf(idea.status);

                  return (
                    <div key={idea.id} className="group relative rounded-lg border border-line bg-panel p-3 shadow-glow">
                      <p className="pr-2 text-sm leading-snug text-ink">{idea.title}</p>
                      {idea.notes && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{idea.notes}</p>}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        {tone ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                            <span className="truncate">{responsibility?.name}</span>
                          </span>
                        ) : <span />}
                        <div className="flex gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                          <button
                            onClick={() => moveIdea(idea, -1)}
                            disabled={statusIdx === 0}
                            className={iconButtonClass("size-6")}
                            title={`Move ${idea.title} left`}
                            aria-label={`Move ${idea.title} left`}
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            onClick={() => moveIdea(idea, 1)}
                            disabled={statusIdx === STATUS_ORDER.length - 1}
                            className={iconButtonClass("size-6")}
                            title={`Move ${idea.title} right`}
                            aria-label={`Move ${idea.title} right`}
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                          <button
                            onClick={() => startEdit(idea)}
                            className={iconButtonClass("size-6")}
                            title={`Edit ${idea.title}`}
                            aria-label={`Edit ${idea.title}`}
                          >
                            <Pencil className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
