"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarRange, Plus } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TODAY = "2026-05-07";
const BASE = new Date(2026, 4, 7); // May 7 2026

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseNaturalDate(raw: string): { iso: string; display: string } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (s === "tod" || s === "today") return { iso: TODAY, display: "Today" };

  if (s === "tom" || s === "tomorrow") {
    const d = new Date(BASE);
    d.setDate(d.getDate() + 1);
    return { iso: isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()), display: "Tomorrow" };
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const short = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  let target = days.indexOf(s);
  if (target === -1) target = short.indexOf(s);
  if (target !== -1) {
    const diff = ((target - BASE.getDay() + 7) % 7) || 7;
    const d = new Date(BASE);
    d.setDate(d.getDate() + diff);
    return {
      iso: isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      display: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    };
  }

  if (s === "next week") {
    const diff = 8 - BASE.getDay();
    const d = new Date(BASE);
    d.setDate(d.getDate() + diff);
    return {
      iso: isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      display: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    };
  }

  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // "may 15" or "may 15th"
  const md = s.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (md) {
    const mi = months.indexOf(md[1].slice(0, 3));
    const day = parseInt(md[2]);
    if (mi !== -1 && day >= 1 && day <= 31) {
      const d = new Date(2026, mi, day);
      return { iso: isoDate(2026, mi + 1, day), display: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    }
  }

  // "15 may" or "15th may"
  const dm = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)$/);
  if (dm) {
    const day = parseInt(dm[1]);
    const mi = months.indexOf(dm[2].slice(0, 3));
    if (mi !== -1 && day >= 1 && day <= 31) {
      const d = new Date(2026, mi, day);
      return { iso: isoDate(2026, mi + 1, day), display: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    }
  }

  // just a number → day of current month
  const num = s.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
  if (num) {
    const day = parseInt(num[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(2026, 4, day); // May
      return { iso: isoDate(2026, 5, day), display: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    }
  }

  return null;
}

function formatDue(dueAt: string) {
  const dateStr = dueAt.slice(0, 10);
  if (dateStr === TODAY) return "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TodosPage() {
  const tasks = useAppStore((s) => s.tasks);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const addTask = useAppStore((s) => s.addTask);

  const [view, setView] = useState<string>("today");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [quickRespId, setQuickRespId] = useState(responsibilities[0]?.id ?? "");
  const [addingTask, setAddingTask] = useState(false);

  const open = tasks.filter((t) => t.status !== "done");
  const todayTasks = open.filter((t) => t.dueAt?.startsWith(TODAY));
  const upcomingTasks = open.filter((t) => t.dueAt && t.dueAt.slice(0, 10) > TODAY);

  const viewTasks =
    view === "today" ? todayTasks :
    view === "upcoming" ? upcomingTasks :
    open.filter((t) => t.responsibilityId === view);

  const viewResp = view !== "today" && view !== "upcoming"
    ? responsibilities.find((r) => r.id === view)
    : null;

  const viewLabel =
    view === "today" ? "Today" :
    view === "upcoming" ? "Upcoming" :
    viewResp?.name ?? "";

  const parsedDate = parseNaturalDate(quickDate);

  function resetForm() {
    setQuickTitle("");
    setQuickDesc("");
    setQuickDate("");
    setAddingTask(false);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) { resetForm(); return; }
    const respId = viewResp ? viewResp.id : quickRespId;
    const dueIso = parsedDate?.iso ?? (view === "today" ? TODAY : undefined);
    addTask({
      title: quickTitle.trim(),
      description: quickDesc.trim() || undefined,
      responsibilityId: respId,
      dueAt: dueIso ? `${dueIso}T17:00:00-07:00` : undefined,
    });
    resetForm();
  }

  return (
    <div className="-mx-4 -mt-4 flex min-h-dvh sm:-mx-6 lg:-ml-[24px] lg:-mr-8 lg:-mt-4">
      {/* Todoist-style left sidebar */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#282828] bg-[#1a1a1a] py-3 lg:flex">
        <div className="mb-2 px-3">
          <button
            onClick={() => { setAddingTask(true); setQuickTitle(""); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#dd4b39] transition hover:bg-[#242424]"
          >
            <Plus className="size-4" />
            Add task
          </button>
        </div>

        <nav className="space-y-0.5 px-2">
          <button
            onClick={() => setView("today")}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              view === "today" ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-[#dd4b39]" />
            <span className="flex-1 text-left">Today</span>
            {todayTasks.length > 0 && <span className="text-xs tabular-nums text-[#666]">{todayTasks.length}</span>}
          </button>
          <button
            onClick={() => setView("upcoming")}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              view === "upcoming" ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
            )}
          >
            <CalendarRange className="size-4 shrink-0 text-[#7b68ee]" />
            <span className="flex-1 text-left">Upcoming</span>
            {upcomingTasks.length > 0 && <span className="text-xs tabular-nums text-[#666]">{upcomingTasks.length}</span>}
          </button>
        </nav>

        <div className="my-3 mx-4 h-px bg-[#2c2c2c]" />

        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-[#444]">My labels</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {responsibilities.map((r) => {
            const tone = responsibilityTone[r.color];
            const count = open.filter((t) => t.responsibilityId === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => setView(r.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  view === r.id ? "bg-[#2c2c2c] font-medium text-white" : "text-[#999] hover:bg-[#232323] hover:text-white"
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                <span className="flex-1 truncate text-left">{r.name}</span>
                {count > 0 && <span className="text-xs tabular-nums text-[#555]">{count}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#1f1f1f]">
        <div className="mx-auto w-full max-w-2xl px-6 py-7">
          <div className="mb-6 flex items-center gap-3">
            {viewResp && (
              <span className="size-3 rounded-full" style={{ backgroundColor: responsibilityTone[viewResp.color].hex }} />
            )}
            <h1 className="text-xl font-semibold text-white">{viewLabel}</h1>
            <span className="text-sm text-[#555]">{viewTasks.length}</span>
          </div>

          {/* Add task form */}
          {addingTask ? (
            <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-[#3a3a3a] bg-[#252525] p-4">
              <input
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Task name"
                className="w-full bg-transparent text-sm text-white placeholder:text-[#555] outline-none"
              />
              <textarea
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="mt-2 w-full resize-none bg-transparent text-xs text-[#999] placeholder:text-[#444] outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <input
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    placeholder="Due date (today, mon, may 15…)"
                    className={cn(
                      "h-8 w-full rounded-md border px-3 text-xs outline-none transition",
                      parsedDate
                        ? "border-[#4285f4] bg-[#4285f4]/10 text-[#4285f4]"
                        : "border-[#3a3a3a] bg-[#333] text-[#999] placeholder:text-[#444] focus:border-[#555]"
                    )}
                  />
                  {parsedDate && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#4285f4]">
                      {parsedDate.display}
                    </span>
                  )}
                </div>
                <select
                  value={viewResp ? viewResp.id : quickRespId}
                  onChange={(e) => setQuickRespId(e.target.value)}
                  disabled={!!viewResp}
                  className="h-8 rounded-md border border-[#3a3a3a] bg-[#333] px-2 text-xs text-[#999] outline-none focus:border-[#555] disabled:opacity-60"
                >
                  {responsibilities.map((r) => (
                    <option key={r.id} value={r.id} style={{ background: "#252525" }}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="rounded-md bg-[#dd4b39] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#c43f2f] disabled:opacity-40"
                >
                  Add task
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-3 py-1.5 text-sm text-[#777] transition hover:bg-[#333] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="mb-4 flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-sm text-[#555] transition hover:text-[#999] group"
            >
              <span className="grid size-5 place-items-center rounded-full border-[1.5px] border-[#3a3a3a] text-[#555] transition group-hover:border-[#555] group-hover:text-[#999]">
                <Plus className="size-3" />
              </span>
              Add task
            </button>
          )}

          {/* Task list */}
          {viewTasks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#444]">
                {view === "today" ? "Nothing due today — enjoy the day." : view === "upcoming" ? "Nothing upcoming." : "No tasks in this label."}
              </p>
            </div>
          ) : (
            <div>
              {viewTasks.map((task) => {
                const responsibility = responsibilities.find((r) => r.id === task.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
                const isToday = task.dueAt?.startsWith(TODAY);
                const isOverdue = task.dueAt && task.dueAt.slice(0, 10) < TODAY;

                return (
                  <div key={task.id} className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition hover:bg-[#282828]">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label="Complete task"
                      className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60"
                      style={{ borderColor: tone.hex }}
                    />
                    <Link href={`/task/${task.id}`} className="min-w-0 flex-1">
                      <p className="text-sm text-[#ddd]">{task.title}</p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#666]">{task.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2.5">
                        {task.dueAt && (
                          <span className={cn("flex items-center gap-1 text-xs",
                            isOverdue ? "text-[#cf4444]" : isToday ? "text-[#cc9a2a]" : "text-[#666]"
                          )}>
                            <CalendarDays className="size-3" />
                            {formatDue(task.dueAt)}
                          </span>
                        )}
                        {view !== task.responsibilityId && responsibility && (
                          <span className="flex items-center gap-1 text-xs text-[#666]">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: tone.hex }} />
                            {responsibility.name}
                          </span>
                        )}
                      </div>
                    </Link>
                    {(task.priority === "high" || task.priority === "urgent") && (
                      <span
                        className="mt-1 shrink-0 text-[10px] font-bold"
                        style={{ color: task.priority === "urgent" ? "#cf4444" : "#d98327" }}
                      >
                        {task.priority === "urgent" ? "P1" : "P2"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
