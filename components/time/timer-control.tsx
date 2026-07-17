"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function TimerControl({ plain = false }: { plain?: boolean }) {
  const timer = useAppStore((state) => state.timer);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const setTimerResponsibility = useAppStore((state) => state.setTimerResponsibility);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);
  const addManualTimeLog = useAppStore((state) => state.addManualTimeLog);
  const [tick, setTick] = useState(0);
  const [logPastOpen, setLogPastOpen] = useState(false);
  const [pastTitle, setPastTitle] = useState("");
  const [pastStart, setPastStart] = useState("");
  const [pastEnd, setPastEnd] = useState("");

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
    });
    setPastTitle("");
    setPastStart("");
    setPastEnd("");
    setLogPastOpen(false);
  }
  const responsibilityId = timer.responsibilityId;
  const startedAt = timer.startedAt ? new Date(timer.startedAt) : new Date();
  const activeResponsibility = responsibilities.find((item) => item.id === responsibilityId);
  const elapsedLabel = useMemo(() => {
    if (!timer.startedAt) {
      return "00:00";
    }

    const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timer.startedAt, tick]);
  const tone = activeResponsibility ? responsibilityTone[activeResponsibility.color] : responsibilityTone.mint;

  useEffect(() => {
    if (!timer.running) {
      return;
    }

    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer.running]);

  return (
    <div className={cn("relative overflow-hidden", plain ? "p-0" : "rounded-lg border border-line bg-panel p-4 shadow-glow")}>
      {!plain && <span className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.gradient}`} />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className={`size-2 rounded-full ${timer.running ? tone.dot : "bg-white/20"}`} />
            Timer
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-ink">{timer.running || timer.startedAt ? elapsedLabel : "00:00"}</p>
          <p className="mt-1 text-xs text-muted">
            {activeResponsibility?.name} - started {startedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <select
          value={responsibilityId}
          onChange={(event) => setTimerResponsibility(event.target.value)}
          className="h-9 max-w-[138px] rounded-lg border border-line bg-paper px-2 text-xs text-ink outline-none"
        >
          {responsibilities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => (timer.running ? pauseTimer() : startTimer())}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {timer.running ? "Pause" : "Start"}
        </button>
        <button onClick={stopTimer} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line text-sm text-muted transition hover:border-muted hover:text-ink">
          <Square className="size-4" />
          Stop
        </button>
        <button
          onClick={() => setLogPastOpen((open) => !open)}
          className={cn("h-10 rounded-lg border text-sm transition", logPastOpen ? "border-blue/50 text-blue" : "border-line text-muted hover:border-muted hover:text-ink")}
        >
          Log past
        </button>
      </div>

      {logPastOpen && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-paper p-3">
          <input
            value={pastTitle}
            onChange={(e) => setPastTitle(e.target.value)}
            placeholder="What did you work on?"
            className="h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm text-ink outline-none focus:border-blue placeholder:text-muted"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted">
              From
              <input
                type="datetime-local"
                value={pastStart}
                onChange={(e) => setPastStart(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line bg-panel px-2 text-xs text-ink outline-none focus:border-blue"
              />
            </label>
            <label className="text-[11px] text-muted">
              To
              <input
                type="datetime-local"
                value={pastEnd}
                onChange={(e) => setPastEnd(e.target.value)}
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
