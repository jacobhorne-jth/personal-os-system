"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Archive, ArchiveRestore, ArrowRight, CalendarDays, CheckCircle2, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { Responsibility, ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type EditState = {
  id: string | "new";
  name: string;
  description: string;
  color: ResponsibilityColor;
};

type LabelPillarId = "personal" | "professional" | "school";

type LabelOrgState = {
  assignments: Record<string, LabelPillarId>;
  order: string[];
};

const LABEL_ORG_STORAGE_KEY = "personal-system:label-page-org:v1";

const LABEL_PILLARS: { id: LabelPillarId; name: string }[] = [
  { id: "personal", name: "Personal" },
  { id: "professional", name: "Professional" },
  { id: "school", name: "School" },
];

function inferLabelPillar(item: Responsibility): LabelPillarId {
  const text = `${item.id} ${item.name} ${item.description}`.toLowerCase();
  if (/school|class|course|campus|university|college|homework|study|leetcode|system design/.test(text)) return "school";
  if (/work|job|career|professional|interview|application|office|client|company/.test(text)) return "professional";
  return "personal";
}

function readLabelOrg(): LabelOrgState {
  if (typeof window === "undefined") return { assignments: {}, order: [] };

  try {
    const raw = window.localStorage.getItem(LABEL_ORG_STORAGE_KEY);
    if (!raw) return { assignments: {}, order: [] };
    const parsed = JSON.parse(raw) as Partial<LabelOrgState>;
    return {
      assignments: parsed.assignments ?? {},
      order: Array.isArray(parsed.order) ? parsed.order : [],
    };
  } catch {
    return { assignments: {}, order: [] };
  }
}

function normalizeLabelOrg(org: LabelOrgState, items: Responsibility[]): LabelOrgState {
  const activeIds = items.map((item) => item.id);
  const activeIdSet = new Set(activeIds);
  const assignments: Record<string, LabelPillarId> = {};

  items.forEach((item) => {
    const assigned = org.assignments[item.id];
    assignments[item.id] = LABEL_PILLARS.some((pillar) => pillar.id === assigned) ? assigned : inferLabelPillar(item);
  });

  const order = [
    ...org.order.filter((id) => activeIdSet.has(id)),
    ...activeIds.filter((id) => !org.order.includes(id)),
  ];

  return { assignments, order };
}

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [labelOrg, setLabelOrg] = useState<LabelOrgState>(() => readLabelOrg());
  const [labelOrgReady, setLabelOrgReady] = useState(false);

  const archivedItems = responsibilities.filter((r) => r.archivedAt);
  const baseItems = responsibilities.filter((r) => !r.archivedAt);
  const normalizedOrg = useMemo(() => normalizeLabelOrg(labelOrg, baseItems), [baseItems, labelOrg]);
  const orderedItems = useMemo(() => {
    const byId = new Map(baseItems.map((item) => [item.id, item]));
    return normalizedOrg.order.map((id) => byId.get(id)).filter((item): item is Responsibility => Boolean(item));
  }, [baseItems, normalizedOrg.order]);
  const groupedItems = useMemo(() => {
    return LABEL_PILLARS.map((pillar) => ({
      ...pillar,
      items: orderedItems.filter((item) => normalizedOrg.assignments[item.id] === pillar.id),
    }));
  }, [normalizedOrg.assignments, orderedItems]);

  useEffect(() => {
    setLabelOrgReady(true);
  }, []);

  useEffect(() => {
    setLabelOrg((current) => {
      const next = normalizeLabelOrg(current, baseItems);
      return next.order.join() === current.order.join() && JSON.stringify(next.assignments) === JSON.stringify(current.assignments)
        ? current
        : next;
    });
  }, [baseItems]);

  useEffect(() => {
    if (!labelOrgReady || typeof window === "undefined") return;
    window.localStorage.setItem(LABEL_ORG_STORAGE_KEY, JSON.stringify(normalizedOrg));
  }, [labelOrgReady, normalizedOrg]);

  function moveLabel(labelId: string, pillarId: LabelPillarId, targetId?: string) {
    if (labelId === targetId) return;

    setLabelOrg((current) => {
      const normalized = normalizeLabelOrg(current, baseItems);
      const orderWithoutDragged = normalized.order.filter((id) => id !== labelId);
      const nextAssignments = { ...normalized.assignments, [labelId]: pillarId };
      let insertIndex = orderWithoutDragged.length;

      if (targetId) {
        const targetIndex = orderWithoutDragged.indexOf(targetId);
        if (targetIndex >= 0) {
          const originalOrder = normalized.order;
          const draggedIndex = originalOrder.indexOf(labelId);
          const targetOriginalIndex = originalOrder.indexOf(targetId);
          insertIndex = targetIndex + (draggedIndex < targetOriginalIndex ? 1 : 0);
        }
      } else {
        const lastInPillar = orderWithoutDragged.reduce((lastIndex, id, index) => {
          return nextAssignments[id] === pillarId ? index : lastIndex;
        }, -1);
        insertIndex = lastInPillar + 1;
      }

      const nextOrder = [...orderWithoutDragged];
      nextOrder.splice(insertIndex, 0, labelId);
      return { assignments: nextAssignments, order: nextOrder };
    });
  }

  function dragEnterCard(targetId: string, pillarId: LabelPillarId) {
    if (!dragId || dragId === targetId) return;
    moveLabel(dragId, pillarId, targetId);
  }

  function dropOnPillar(event: DragEvent<HTMLElement>, pillarId: LabelPillarId) {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData("text/plain") || dragId;
    if (!droppedId) return;
    moveLabel(droppedId, pillarId);
    setDragId(null);
  }

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
      const newId = addResponsibility({ name: editing.name.trim(), description: editing.description.trim(), color: editing.color });
      setLabelOrg((current) => {
        const normalized = normalizeLabelOrg(current, baseItems);
        return {
          assignments: { ...normalized.assignments, [newId]: "personal" },
          order: [...normalized.order, newId],
        };
      });
    } else {
      updateResponsibility(editing.id, { name: editing.name.trim(), description: editing.description.trim(), color: editing.color });
    }
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      deleteResponsibility(id);
      setLabelOrg((current) => ({
        assignments: Object.fromEntries(Object.entries(current.assignments).filter(([labelId]) => labelId !== id)),
        order: current.order.filter((labelId) => labelId !== id),
      }));
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
          <h1 className="text-3xl font-semibold text-ink">Labels</h1>
        </div>
        <button
          onClick={startNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          New label
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {groupedItems.map((pillar) => (
          <section
            key={pillar.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dropOnPillar(e, pillar.id)}
            className={cn(
              "min-h-[360px] rounded-xl border border-line bg-panel/70 p-3 shadow-glow transition",
              dragId && "border-blue/30 bg-panel"
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{pillar.name}</h2>
              <span className="rounded-full bg-line px-2 py-0.5 text-xs font-semibold text-muted">{pillar.items.length}</span>
            </div>

            <div className="space-y-3">
              {pillar.id === "personal" && editing?.id === "new" && (
                <div className="relative overflow-hidden rounded-lg border border-blue/40 bg-panel p-3.5 shadow-glow">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: getTone(editing.color).hex }} />
                  <div className="mt-1.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        placeholder="Label name"
                        className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-base font-medium text-ink outline-none focus:border-blue placeholder:text-muted"
                      />
                      <ResponsibilityColorPicker
                        value={editing.color}
                        onChange={(color) => setEditing((s) => s && { ...s, color })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={!editing.name.trim()}
                        className="flex-1 rounded-md bg-blue py-2 text-sm font-medium text-white disabled:opacity-40"
                      >
                        Create label
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-md border border-line bg-paper px-4 py-2 text-sm text-muted hover:text-ink"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pillar.items.map((item) => {
                const isEditing = editing?.id === item.id;
                const tone = getTone(isEditing ? editing!.color : item.color);

                if (isEditing) {
                  return (
                    <div key={item.id} className="relative overflow-hidden rounded-lg border border-blue/40 bg-paper p-4 shadow-glow">
                      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone.hex }} />
                      <div className="mt-1.5 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editing!.name}
                            onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                            placeholder="Label name"
                            className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-base font-medium text-ink outline-none focus:border-blue placeholder:text-muted"
                          />
                          <ResponsibilityColorPicker
                            value={editing!.color}
                            onChange={(color) => setEditing((s) => s && { ...s, color })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={!editing!.name.trim()}
                            className="flex-1 rounded-md bg-blue py-2 text-sm font-medium text-white disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-md border border-line bg-paper px-4 py-2 text-sm text-muted hover:text-ink"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className={cn(
                              "rounded-md border px-4 py-2 text-sm transition",
                              deleteConfirm === item.id
                                ? "border-red-500/40 bg-red-500/10 text-red-400"
                                : "border-line bg-paper text-muted hover:border-red-500/40 hover:text-red-400"
                            )}
                          >
                            {deleteConfirm === item.id ? "Confirm delete" : <Trash2 className="size-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(item.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragEnter={() => dragEnterCard(item.id, pillar.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "group relative z-0 cursor-grab overflow-hidden rounded-xl border border-line bg-paper p-4 shadow-glow transition duration-200 hover:z-20 hover:-translate-y-0.5 hover:border-blue/30 active:cursor-grabbing",
                      dragId === item.id && "opacity-40"
                    )}
                  >
                    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone.hex }} />
                    <div className="flex items-center justify-between gap-3 pt-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <GripVertical className="size-4 shrink-0 text-muted opacity-60" />
                        <p className="min-w-0 truncate text-lg font-semibold text-ink">{item.name}</p>
                      </div>
                      <ResponsibilityColorPicker
                        value={item.color}
                        onChange={(color) => updateResponsibilityColor(item.id, color)}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-mint" />
                          {item.taskCount} tasks
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-4 text-blue" />
                          {item.upcomingCount} upcoming
                        </span>
                      </p>
                      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-md p-1.5 text-muted hover:bg-line hover:text-ink"
                          title={`Edit ${item.name}`}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setResponsibilityArchived(item.id, true)}
                          className="rounded-md p-1.5 text-muted hover:bg-line hover:text-ink"
                          title={`Archive ${item.name}`}
                          aria-label={`Archive ${item.name}`}
                        >
                          <Archive className="size-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/responsibilities/${item.id}`)}
                          className="rounded-md p-1.5 text-muted hover:bg-line hover:text-ink"
                          title={`View ${item.name}`}
                          aria-label={`View ${item.name}`}
                        >
                          <ArrowRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {archivedItems.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
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
                const tone = getTone(item.color);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="size-2.5 shrink-0 rounded-full opacity-60" style={{ backgroundColor: tone.hex }} />
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
                        onClick={() => handleDelete(item.id)}
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
