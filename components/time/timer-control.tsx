"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Pause, Play, Plus, Square } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { UNLABELED_RESPONSIBILITY_ID } from "@/lib/responsibilities";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

function elapsedLabelFrom(startedAt?: string) {
  if (!startedAt) return "00:00:00";
  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatDuration(startedAt: string, endedAt: string) {
  const minutes = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function TimerControl({ plain = false, compact = false }: { plain?: boolean; compact?: boolean }) {
  const timer = useAppStore((state) => state.timer);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const timeQuickLabels = useAppStore((state) => state.timeQuickLabels);
  const setTimerResponsibility = useAppStore((state) => state.setTimerResponsibility);
  const setTimerTitle = useAppStore((state) => state.setTimerTitle);
  const selectTimeQuickLabel = useAppStore((state) => state.selectTimeQuickLabel);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);
  const addManualTimeLog = useAppStore((state) => state.addManualTimeLog);
  const [tick, setTick] = useState(0);
  const [logPastOpen, setLogPastOpen] = useState(false);
  const [pastTitle, setPastTitle] = useState("");
  const [pastStart, setPastStart] = useState("");
  const [pastEnd, setPastEnd] = useState("");

  const activeResponsibilities = responsibilities.filter((item) => !item.archivedAt);
  const responsibilityId = timer.responsibilityId || activeResponsibilities[0]?.id || UNLABELED_RESPONSIBILITY_ID;
  const activeResponsibility = responsibilities.find((item) => item.id === responsibilityId);
  const tone = activeResponsibility ? getTone(activeResponsibility.color) : getTone("mint");
  const title = timer.title || "Focus session";

  const elapsedLabel = useMemo(() => elapsedLabelFrom(timer.startedAt), [timer.startedAt, tick]);
  const recentLogs = useMemo(() => {
    return timeQuickLabels
      .filter((item) => item.title.trim().length > 0)
      .slice()
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(0, compact ? 4 : 8);
  }, [compact, timeQuickLabels]);

  function handleStart() {
    const nextTitle = title.trim() || "Focus session";
    startTimer({ title: nextTitle, responsibilityId });
  }

  function submitPastLog() {
    if (!pastTitle.trim() || !pastStart || !pastEnd) return;
    const startedAt = new Date(pastStart);
    const endedAt = new Date(pastEnd);
    if (endedAt <= startedAt) return;
    addManualTimeLog({
      title: pastTitle.trim(),
      responsibilityId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      notes: `Manual entry · ${formatDuration(startedAt.toISOString(), endedAt.toISOString())}`,
    });
    setPastTitle("");
    setPastStart("");
    setPastEnd("");
    setLogPastOpen(false);
  }

  useEffect(() => {
    if (!timer.running) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer.running]);

  return (
    <div className={cn("relative overflow-hidden", plain ? "p-0" : "rounded-lg border border-line bg-panel p-4 shadow-glow")}>
      {!plain && <span className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: tone.hex }} />}

      <div className={cn("grid gap-3", compact ? "sm:grid-cols-[1fr_auto] sm:items-center" : "")}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted">
            <span
              className={cn("size-2 rounded-full", !timer.running && "bg-white/20")}
              style={timer.running ? { backgroundColor: tone.hex } : undefined}
            />
            Timer
          </p>
          <div className={cn("mt-1 flex flex-wrap items-end gap-x-3 gap-y-1", compact && "items-center")}>
            <p className={cn("font-semibold tabular-nums text-ink", compact ? "text-2xl" : "text-4xl")}>
              {timer.running || timer.startedAt ? elapsedLabel : "00:00:00"}
            </p>
            <p className="pb-1 text-xs text-muted">{activeResponsibility?.name ?? "Unlabeled"}</p>
          </div>
        </div>

        <div className={cn("grid gap-2", compact ? "grid-cols-[1fr_auto]" : "")}>
          <button
            onClick={timer.running ? pauseTimer : handleStart}
            disabled={!responsibilityId}
            title={timer.running ? "Pause timer" : "Start timer"}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40",
              compact && "min-w-24"
            )}
          >
            {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {timer.running ? "Pause" : "Start"}
          </button>
          <button
            onClick={stopTimer}
            disabled={!timer.startedAt}
            title="Stop timer"
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm text-muted transition hover:border-muted hover:text-ink disabled:opacity-40"
          >
            <Square className="size-4" />
            {!compact && "Stop"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="min-w-0">
          <span className="sr-only">Activity label</span>
          <input
            value={title}
            onChange={(event) => setTimerTitle(event.target.value)}
            placeholder="What are you doing?"
            className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-blue"
          />
        </label>
        <label>
          <span className="sr-only">Project</span>
          <select
            value={responsibilityId}
            onChange={(event) => setTimerResponsibility(event.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition focus:border-blue"
          >
            {activeResponsibilities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {recentLogs.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {recentLogs.map((item) => (
            <button
              key={item.id}
              onClick={() => selectTimeQuickLabel(item.id)}
              title={`Use ${item.title}`}
              className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-muted transition hover:border-muted hover:text-ink"
            >
              {item.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 truncate text-xs text-muted">
          <Clock3 className="size-3.5 shrink-0" />
          {timer.startedAt
            ? `Started ${new Date(timer.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : "Ready"}
        </p>
        <button
          onClick={() => setLogPastOpen((open) => !open)}
          title="Log past time"
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition",
            logPastOpen ? "border-blue/50 text-blue" : "border-line text-muted hover:border-muted hover:text-ink"
          )}
        >
          <Plus className="size-3.5" />
          Log past
        </button>
      </div>

      {logPastOpen && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-paper p-3">
          <input
            value={pastTitle}
            onChange={(event) => setPastTitle(event.target.value)}
            placeholder="What did you work on?"
            className="h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted">
              From
              <input
                type="datetime-local"
                value={pastStart}
                onChange={(event) => setPastStart(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line bg-panel px-2 text-xs text-ink outline-none focus:border-blue"
              />
            </label>
            <label className="text-[11px] text-muted">
              To
              <input
                type="datetime-local"
                value={pastEnd}
                onChange={(event) => setPastEnd(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line bg-panel px-2 text-xs text-ink outline-none focus:border-blue"
              />
            </label>
          </div>
          <button
            onClick={submitPastLog}
            disabled={!pastTitle.trim() || !pastStart || !pastEnd || new Date(pastEnd) <= new Date(pastStart)}
            className="h-9 w-full rounded-lg bg-blue text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Save time log
          </button>
        </div>
      )}
    </div>
  );
}
