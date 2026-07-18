"use client";

import { useMemo, useState } from "react";
import { Check, Flag, Pencil, Plus, Trash2, X } from "lucide-react";
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
  return { label: month, urgent: false };
}

export function GoalsWorkspace() {
  const goals = useAppStore((s) => s.goals);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const [tab, setTab] = useState<"active" | "paused" | "done">("active");
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
    if (!editing?.title.trim() || !editing.target || !editing.unit.trim()) return;
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
    <div className="space-y-4">
      <header className="flex items-start justify-between rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Goals</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Active outcomes</h1>
          <p className="mt-2 text-sm text-muted">Track what you're working toward and watch progress move.</p>
        </div>
        <button
          onClick={startNew}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-panel"
        >
          <Plus className="size-4" />
          Add goal
        </button>
      </header>

      {/* Add / edit form */}
      {editing && (
        <div className="rounded-xl border border-blue/40 bg-panel p-4 shadow-glow">
          <p className="mb-3 text-xs font-medium text-blue">{editing.id === "new" ? "New goal" : "Edit goal"}</p>
          <div className="space-y-3">
            <input
              autoFocus
              value={editing.title}
              onChange={(e) => setEditing((s) => s && { ...s, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              placeholder="Goal title (e.g. Hit 160g protein daily)"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Current</label>
                <input
                  type="number"
                  min={0}
                  value={editing.current}
                  onChange={(e) => setEditing((s) => s && { ...s, current: e.target.value })}
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Target</label>
                <input
                  type="number"
                  min={1}
                  value={editing.target}
                  onChange={(e) => setEditing((s) => s && { ...s, target: e.target.value })}
                  placeholder="100"
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Unit</label>
                <input
                  value={editing.unit}
                  onChange={(e) => setEditing((s) => s && { ...s, unit: e.target.value })}
                  placeholder="problems, %, g, offers…"
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Responsibility</label>
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
                <label className="text-[11px] text-muted">Deadline (optional)</label>
                <input
                  type="date"
                  value={editing.deadline}
                  onChange={(e) => setEditing((s) => s && { ...s, deadline: e.target.value })}
                  className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-blue"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={!editing.title.trim() || !editing.target || !editing.unit.trim()}
                className="flex-1 rounded-lg bg-blue py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                {editing.id === "new" ? "Create goal" : "Save changes"}
              </button>
              <button
                onClick={cancelEdit}
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

      {/* Status tabs */}
      <div className="flex gap-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition",
              tab === s ? "border-blue bg-blue/10 text-blue" : "border-line bg-paper text-muted hover:text-ink"
            )}
          >
            {s} {counts[s] > 0 && <span className="ml-1 tabular-nums opacity-70">{counts[s]}</span>}
          </button>
        ))}
      </div>

      {/* Goal cards */}
      {visibleGoals.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel p-10 text-center">
          <Flag className="mx-auto mb-3 size-8 text-muted opacity-40" />
          <p className="text-sm text-muted">No {tab} goals.</p>
          {tab === "active" && (
            <button onClick={startNew} className="mt-3 text-sm text-blue hover:underline">
              Add your first goal →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleGoals.map((goal) => {
            const responsibility = responsibilities.find((r) => r.id === goal.responsibilityId);
            const tone = responsibility ? getTone(responsibility.color) : getTone("graphite");
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const done = goal.status === "done" || percent >= 100;
            const dl = deadlineLabel(goal.deadline);

            return (
              <div
                key={goal.id}
                className={cn(
                  "group relative rounded-xl border bg-panel p-4 transition",
                  done ? "border-mint/30 bg-mint/5" : "border-line hover:border-line/80"
                )}
              >
                {/* Top row */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink leading-snug">{goal.title}</p>
                    {responsibility && (
                      <p className="mt-0.5 text-[11px]" style={{ color: tone.hex }}>{responsibility.name}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(goal)}
                      className="grid size-7 place-items-center rounded-md text-muted hover:bg-line hover:text-ink"
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: done ? "#34d399" : tone.hex }}
                  />
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Quick adjust buttons */}
                    {goal.status === "active" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => nudgeProgress(goal, -1)}
                          className="grid size-6 place-items-center rounded border border-line text-[10px] text-muted hover:bg-line disabled:opacity-30"
                          disabled={goal.current <= 0}
                        >
                          <X className="size-3" />
                        </button>
                        <button
                          onClick={() => nudgeProgress(goal, 1)}
                          className="grid size-6 place-items-center rounded border border-line text-[10px] text-muted hover:bg-line disabled:opacity-30"
                          disabled={goal.current >= goal.target}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-xs text-muted">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dl && (
                      <span className={cn("text-xs", dl.urgent ? "text-amber-400" : "text-muted")}>{dl.label}</span>
                    )}
                    <span className={cn("text-sm font-semibold", done ? "text-mint" : "text-ink")}>{percent}%</span>
                    {goal.status === "active" && percent >= 100 && (
                      <button
                        onClick={() => updateGoal(goal.id, { status: "done" })}
                        className="grid size-6 place-items-center rounded-full bg-mint text-white transition hover:bg-mint/80"
                        title="Mark done"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status controls */}
                {goal.status === "active" && (
                  <div className="mt-3 flex gap-1.5 border-t border-line pt-3">
                    <button
                      onClick={() => updateGoal(goal.id, { status: "done" })}
                      className="flex-1 rounded-md border border-mint/30 bg-mint/10 py-1 text-[11px] font-medium text-mint transition hover:bg-mint/20"
                    >
                      Mark done
                    </button>
                    <button
                      onClick={() => updateGoal(goal.id, { status: "paused" })}
                      className="flex-1 rounded-md border border-line bg-paper py-1 text-[11px] text-muted transition hover:text-ink"
                    >
                      Pause
                    </button>
                  </div>
                )}
                {goal.status === "paused" && (
                  <div className="mt-3 border-t border-line pt-3">
                    <button
                      onClick={() => updateGoal(goal.id, { status: "active" })}
                      className="w-full rounded-md border border-line bg-paper py-1 text-[11px] text-muted transition hover:text-ink"
                    >
                      Resume
                    </button>
                  </div>
                )}
                {goal.status === "done" && (
                  <div className="mt-3 border-t border-line pt-3">
                    <button
                      onClick={() => updateGoal(goal.id, { status: "active" })}
                      className="w-full rounded-md border border-line bg-paper py-1 text-[11px] text-muted transition hover:text-ink"
                    >
                      Reopen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
