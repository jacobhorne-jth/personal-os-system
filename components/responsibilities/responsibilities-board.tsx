"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Archive, ArchiveRestore, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { ResponsibilityColorPicker } from "@/components/responsibilities/color-picker";
import { Button, Card, Page, PageHeader, iconButtonClass, inputClass } from "@/components/ui/primitives";
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

  function renderEditor(isNew: boolean) {
    if (!editing) return null;
    return (
      <div className="rounded-lg border border-line bg-panel p-3 shadow-glow">
        <div className="flex items-center gap-2">
          <ResponsibilityColorPicker value={editing.color} onChange={(color) => setEditing((s) => s && { ...s, color })} />
          <input
            autoFocus
            value={editing.name}
            onChange={(e) => setEditing((s) => s && { ...s, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
            placeholder="Label name"
            aria-label="Label name"
            className={inputClass}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          {!isNew && (
            <Button variant="danger" size="sm" onClick={() => handleDelete(editing.id as string)}>
              {deleteConfirm === editing.id ? "Confirm delete" : <Trash2 className="size-3.5" />}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={cancelEdit}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={saveEdit} disabled={!editing.name.trim()}>
              {isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Labels"
        description="Labels color your calendar, tasks, and habits. Drag to organize."
        actions={
          <Button variant="primary" onClick={startNew}>
            <Plus className="size-4" />
            New label
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {groupedItems.map((pillar) => (
          <section
            key={pillar.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dropOnPillar(e, pillar.id)}
            className={cn(
              "min-h-[260px] rounded-xl bg-hover/50 p-2 transition-shadow",
              dragId && "ring-1 ring-inset ring-ink/10"
            )}
          >
            <div className="flex items-baseline gap-2 px-2 pb-2 pt-1">
              <h2 className="text-[13px] font-semibold text-ink">{pillar.name}</h2>
              <span className="text-xs tabular-nums text-subtle">{pillar.items.length}</span>
            </div>

            <div className="space-y-2">
              {pillar.id === "personal" && editing?.id === "new" && renderEditor(true)}

              {pillar.items.map((item) => {
                if (editing?.id === item.id) {
                  return <div key={item.id}>{renderEditor(false)}</div>;
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
                      "group cursor-grab rounded-lg border border-line bg-panel p-3 shadow-glow transition-opacity active:cursor-grabbing",
                      dragId === item.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ResponsibilityColorPicker value={item.color} onChange={(color) => updateResponsibilityColor(item.id, color)} />
                      <button
                        onClick={() => router.push(`/responsibilities/${item.id}`)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink hover:underline"
                        title={`Open ${item.name}`}
                      >
                        {item.name}
                      </button>
                      <div className="flex shrink-0 items-center transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                        <button onClick={() => startEdit(item)} className={iconButtonClass("size-7")} title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`}>
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => setResponsibilityArchived(item.id, true)} className={iconButtonClass("size-7")} title={`Archive ${item.name}`} aria-label={`Archive ${item.name}`}>
                          <Archive className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 pl-9 text-xs text-muted">
                      {item.taskCount} open {item.taskCount === 1 ? "task" : "tasks"} · {item.upcomingCount} upcoming
                    </p>
                  </div>
                );
              })}

              {pillar.items.length === 0 && !(pillar.id === "personal" && editing?.id === "new") && (
                <p className="px-2 py-6 text-center text-xs text-subtle">Drag a label here</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {archivedItems.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <button
            onClick={() => setShowArchived((s) => !s)}
            aria-expanded={showArchived}
            className="flex h-12 w-full items-center gap-2 px-4 text-left text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", !showArchived && "-rotate-90")} />
            Archived · {archivedItems.length}
          </button>
          {showArchived && (
            <div className="divide-y divide-line border-t border-line">
              {archivedItems.map((item) => {
                const tone = getTone(item.color);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="size-2 shrink-0 rounded-full opacity-60" style={{ backgroundColor: tone.hex }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">{item.name}</p>
                        <p className="text-xs text-muted">
                          Archived {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button size="sm" onClick={() => setResponsibilityArchived(item.id, false)} title={`Restore ${item.name}`} aria-label={`Restore ${item.name}`}>
                        <ArchiveRestore className="size-3.5" />
                        Restore
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} aria-label={`${deleteConfirm === item.id ? "Confirm deleting" : "Delete"} ${item.name}`}>
                        {deleteConfirm === item.id ? "Confirm" : <Trash2 className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}
