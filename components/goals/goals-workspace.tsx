"use client";

import { useMemo, useState } from "react";
import { Check, Flag, Minus, Pause, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Field, Page, PageHeader, ProgressBar, Segmented, iconButtonClass, inputClass } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import type { Goal } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type EditState = {
  id: string | "new";
  title: string;
  responsibilityId: string;
  current: string;
  target: string;
  unit: string;
  deadline: string;
};

const STATUS_TABS = ["active", "paused", "done"] as const;
type GoalStatusTab = (typeof STATUS_TABS)[number];

function emptyGoalMessage(status: GoalStatusTab) {
  if (status === "active") return "No active goals yet.";
  if (status === "paused") return "No paused goals.";
  return "No completed goals yet.";
}

function deadlineLabel(deadline?: string): { label: string; urgent: boolean } | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T12:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Overdue", urgent: true };
  if (diff === 0) return { label: "Due today", urgent: true };
  if (diff <= 7) return { label: `${diff}d left`, urgent: true };
  const month = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label: `By ${month}`, urgent: false };
}

export function GoalsWorkspace() {
  const goals = useAppStore((s) => s.goals);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const [tab, setTab] = useState<GoalStatusTab>("active");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const visibleGoals = useMemo(
    () => goals.filter((g) => g.status === tab).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [goals, tab]
  );

  function startNew() {
    setEditing({ id: "new", title: "", responsibilityId: "", current: "0", target: "", unit: "", deadline: "" });
  }

  function startEdit(g: Goal) {
    setDeleteConfirm(null);
    setEditing({ id: g.id, title: g.title, responsibilityId: g.responsibilityId ?? "", current: String(g.current), target: String(g.target), unit: g.unit, deadline: g.deadline ?? "" });
  }

  function cancelEdit() {
    setEditing(null);
    setDeleteConfirm(null);
  }

  function saveEdit() {
    if (!editing?.title.trim() || !editing.target) return;
    const input = {
      title: editing.title.trim(),
      responsibilityId: editing.responsibilityId || undefined,
      current: parseFloat(editing.current) || 0,
      target: parseFloat(editing.target),
      unit: editing.unit.trim(),
      deadline: editing.deadline || undefined,
    };
    if (editing.id === "new") {
      addGoal(input);
    } else {
      updateGoal(editing.id, input);
    }
    setEditing(null);
  }

  function handleDelete(goalId: string) {
    if (deleteConfirm === goalId) {
      deleteGoal(goalId);
      setDeleteConfirm(null);
      if (editing?.id === goalId) setEditing(null);
    } else {
      setDeleteConfirm(goalId);
    }
  }

  function nudgeProgress(goal: Goal, delta: number) {
    const next = Math.max(0, Math.min(goal.target, goal.current + delta));
    updateGoal(goal.id, { current: next });
  }

  const counts = useMemo(
    () => STATUS_TABS.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: goals.filter((g) => g.status === s).length }), {}),
    [goals]
  );

  return (
    <Page>
      <PageHeader
        title="Goals"
        description="What you're working toward, and how far along you are."
        actions={
          <Button variant="primary" onClick={startNew}>
            <Plus className="size-4" />
            New goal
          </Button>
        }
      />

      {editing && (
        <Card className="mb-6 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">{editing.id === "new" ? "New goal" : "Edit goal"}</p>
          <div className="space-y-3">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              placeholder="Goal (e.g. Hit 160g protein daily)"
              aria-label="Goal title"
              className={inputClass}
            />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Current">
                <input type="number" min={0} value={editing.current} onChange={(e) => setEditing((s) => s && { ...s, current: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Target">
                <input type="number" min={1} value={editing.target} onChange={(e) => setEditing((s) => s && { ...s, target: e.target.value })} placeholder="100" className={inputClass} />
              </Field>
              <Field label="Unit">
                <input value={editing.unit} onChange={(e) => setEditing((s) => s && { ...s, unit: e.target.value })} placeholder="problems, lbs…" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Label">
                <select value={editing.responsibilityId} onChange={(e) => setEditing((s) => s && { ...s, responsibilityId: e.target.value })} className={inputClass}>
                  <option value="">None</option>
                  {responsibilities.filter((resp) => !resp.archivedAt).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Deadline (optional)">
                <input type="date" value={editing.deadline} onChange={(e) => setEditing((s) => s && { ...s, deadline: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <div className="flex items-center gap-2 border-t border-line pt-4">
              {editing.id !== "new" && (
                <Button variant="danger" size="sm" onClick={() => handleDelete(editing.id as string)}>
                  {deleteConfirm === editing.id ? "Confirm delete" : <><Trash2 className="size-3.5" />Delete</>}
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={cancelEdit}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={saveEdit} disabled={!editing.title.trim() || !editing.target}>
                  {editing.id === "new" ? "Create goal" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Segmented
        label="Goal status"
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={STATUS_TABS.map((s) => ({ value: s, label: s === "done" ? "Completed" : s[0].toUpperCase() + s.slice(1), count: counts[s] }))}
      />

      {visibleGoals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Flag}
            title={emptyGoalMessage(tab)}
            description={tab === "active" ? "Set a measurable target and nudge it forward as you go." : undefined}
            action={tab === "active" ? <Button variant="primary" size="sm" onClick={startNew}><Plus className="size-3.5" />Add a goal</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleGoals.map((goal) => {
            const responsibility = responsibilities.find((r) => r.id === goal.responsibilityId);
            const tone = responsibility ? getTone(responsibility.color) : null;
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const done = goal.status === "done" || percent >= 100;
            const dl = deadlineLabel(goal.deadline);

            return (
              <Card key={goal.id} className="group flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-ink">{goal.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      {responsibility && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: tone!.hex }} />
                          {responsibility.name}
                        </span>
                      )}
                      {dl && <span className={cn(dl.urgent && "text-warning")}>{dl.label}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(goal)}
                    aria-label={`Edit ${goal.title}`}
                    className={iconButtonClass("-mr-1 -mt-1 size-7 lg:opacity-0 lg:group-hover:opacity-100")}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>

                <div className="mt-5 flex items-baseline justify-between gap-2">
                  <p className={cn("text-2xl font-semibold tabular-nums tracking-[-0.01em]", done ? "text-success" : "text-ink")}>{percent}%</p>
                  <p className="text-xs tabular-nums text-muted">
                    {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                  </p>
                </div>
                <ProgressBar value={percent} color={done ? "rgb(var(--color-success))" : tone?.hex} className="mt-2" />

                <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                  {goal.status === "active" && (
                    <>
                      <button onClick={() => nudgeProgress(goal, -1)} disabled={goal.current <= 0} className={iconButtonClass("size-7 border border-line")} aria-label={`Decrease ${goal.title}`}>
                        <Minus className="size-3.5" />
                      </button>
                      <button onClick={() => nudgeProgress(goal, 1)} disabled={goal.current >= goal.target} className={iconButtonClass("size-7 border border-line")} aria-label={`Increase ${goal.title}`}>
                        <Plus className="size-3.5" />
                      </button>
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => updateGoal(goal.id, { status: "paused" })}>
                          <Pause className="size-3.5" />
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          variant={percent >= 100 ? "primary" : "ghost"}
                          onClick={() => updateGoal(goal.id, { status: "done" })}
                          aria-label={`Mark ${goal.title} done`}
                        >
                          <Check className="size-3.5" />
                          Done
                        </Button>
                      </div>
                    </>
                  )}
                  {goal.status === "paused" && (
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => updateGoal(goal.id, { status: "active" })}>
                      <Play className="size-3.5" />
                      Resume
                    </Button>
                  )}
                  {goal.status === "done" && (
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => updateGoal(goal.id, { status: "active" })}>
                      <RotateCcw className="size-3.5" />
                      Reopen
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
