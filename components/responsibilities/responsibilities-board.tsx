"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, ArrowRight, CalendarDays, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import type { Responsibility, ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type EditState = {
  id: string | "new";
  name: string;
  description: string;
  color: ResponsibilityColor;
};

export function ResponsibilitiesBoard() {
  const router = useRouter();
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addResponsibility = useAppStore((s) => s.addResponsibility);
  const updateResponsibility = useAppStore((s) => s.updateResponsibility);
  const updateResponsibilityColor = useAppStore((s) => s.updateResponsibilityColor);
  const deleteResponsibility = useAppStore((s) => s.deleteResponsibility);
  const setResponsibilityArchived = useAppStore((s) => s.setResponsibilityArchived);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeItems = responsibilities.filter((r) => !r.archivedAt);
  const archivedItems = responsibilities.filter((r) => r.archivedAt);

  function startEdit(r: Responsibility) {
    setDeleteConfirm(null);
    setEditing({ id: r.id, name: r.name, description: r.description, color: r.color });
  }

  function startNew() {
    setEditing({ id: "new", name: "", description: "", color: "sage" });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit() {
    if (!editing || !editing.name.trim()) return;
    if (editing.id === "new") {
      addResponsibility({ name: editing.name.trim(), description: editing.description.trim(), color: editing.color });
    } else {
      updateResponsibility(editing.id, { name: editing.name.trim(), description: editing.description.trim(), color: editing.color });
    }
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      deleteResponsibility(id);
      setDeleteConfirm(null);
      if (editing?.id === id) setEditing(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Responsibilities</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Your operating areas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Add, rename, and color-code your labels. All tasks and events update immediately.
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          New label
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeItems.map((item) => {
          const isEditing = editing?.id === item.id;
          const tone = responsibilityTone[isEditing ? editing!.color : item.color];

          if (isEditing) {
            return (
              <div key={item.id} className="relative overflow-hidden rounded-lg border border-blue/40 bg-panel p-4 shadow-glow">
                <span className={cn("absolute inset-x-0 top-0 h-1", tone.dot)} />
                <div className="mt-1 space-y-3">
                  <input
                    autoFocus
                    value={editing!.name}
                    onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    placeholder="Label name"
                    className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  <textarea
                    value={editing!.description}
                    onChange={(e) => setEditing((s) => s && { ...s, description: e.target.value })}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full resize-none rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm leading-5 text-ink outline-none focus:border-blue placeholder:text-muted"
                  />
                  <div className="flex items-center justify-between rounded-lg border border-line bg-[#242528] p-3">
                    <p className="text-xs font-medium text-muted">Label color</p>
                    <ResponsibilityColorPicker
                      value={editing!.color}
                      onChange={(color) => setEditing((s) => s && { ...s, color })}
                      showLabels
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={!editing!.name.trim()}
                      className="flex-1 rounded-md bg-blue py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs transition",
                        deleteConfirm === item.id
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-line bg-paper text-muted hover:border-red-500/40 hover:text-red-400"
                      )}
                    >
                      {deleteConfirm === item.id ? "Confirm delete" : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="group relative z-0 overflow-hidden rounded-lg border border-line bg-panel p-4 shadow-glow transition duration-200 hover:z-20 hover:-translate-y-0.5 hover:border-muted hover:bg-[#303134]"
            >
              <span className={cn("absolute inset-x-0 top-0 h-1", tone.dot)} />
              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="mt-1.5 text-xs leading-5 text-muted line-clamp-2">{item.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded p-1 text-muted hover:bg-line hover:text-ink"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setResponsibilityArchived(item.id, true)}
                    className="rounded p-1 text-muted hover:bg-line hover:text-ink"
                    title="Archive"
                  >
                    <Archive className="size-3.5" />
                  </button>
                  <button
                    onClick={() => router.push(`/responsibilities/${item.id}`)}
                    className="rounded p-1 text-muted hover:bg-line hover:text-ink"
                    title="View"
                  >
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-[#242528] p-3">
                <p className="text-xs font-medium text-muted">Label color</p>
                <ResponsibilityColorPicker
                  value={item.color}
                  onChange={(color) => updateResponsibilityColor(item.id, color)}
                  showLabels
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                <div className="rounded-md border border-line bg-[#303134] p-2">
                  <CheckCircle2 className="mb-2 size-4 text-mint" />
                  <p className="text-ink">{item.taskCount}</p>
                  <p>tasks</p>
                </div>
                <div className="rounded-md border border-line bg-[#303134] p-2">
                  <CalendarDays className="mb-2 size-4 text-blue" />
                  <p className="text-ink">{item.upcomingCount}</p>
                  <p>upcoming</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* New label card */}
        {editing?.id === "new" && (
          <div className="relative overflow-hidden rounded-lg border border-blue/40 bg-panel p-4 shadow-glow">
            <span className={cn("absolute inset-x-0 top-0 h-1", responsibilityTone[editing.color].dot)} />
            <div className="mt-1 space-y-3">
              <input
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                placeholder="Label name"
                className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-blue placeholder:text-muted"
              />
              <textarea
                value={editing.description}
                onChange={(e) => setEditing((s) => s && { ...s, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full resize-none rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm leading-5 text-ink outline-none focus:border-blue placeholder:text-muted"
              />
              <div className="flex items-center justify-between rounded-lg border border-line bg-[#242528] p-3">
                <p className="text-xs font-medium text-muted">Label color</p>
                <ResponsibilityColorPicker
                  value={editing.color}
                  onChange={(color) => setEditing((s) => s && { ...s, color })}
                  showLabels
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={!editing.name.trim()}
                  className="flex-1 rounded-md bg-blue py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Create label
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-muted hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {archivedItems.length > 0 && (
        <div className="rounded-xl border border-line bg-panel overflow-hidden">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-line/40"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted">
              <Archive className="size-4" />
              Archived ({archivedItems.length})
            </span>
            <span className="text-xs text-muted">{showArchived ? "Hide" : "Show"}</span>
          </button>
          {showArchived && (
            <div className="divide-y divide-line border-t border-line">
              {archivedItems.map((item) => {
                const tone = responsibilityTone[item.color];
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("size-2.5 shrink-0 rounded-full opacity-60", tone.dot)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">{item.name}</p>
                        <p className="text-[11px] text-muted">
                          archived {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setResponsibilityArchived(item.id, false)}
                        className="flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink transition hover:bg-line"
                        title="Restore"
                      >
                        <ArchiveRestore className="size-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => {
                          if (deleteConfirm === item.id) {
                            deleteResponsibility(item.id);
                            setDeleteConfirm(null);
                          } else {
                            setDeleteConfirm(item.id);
                          }
                        }}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs transition",
                          deleteConfirm === item.id
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : "border-line bg-paper text-muted hover:text-red-400"
                        )}
                      >
                        {deleteConfirm === item.id ? "Confirm" : <Trash2 className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
