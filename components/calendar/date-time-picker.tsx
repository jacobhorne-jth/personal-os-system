"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtDate(d: Date) {
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
}

function timeAt(base: Date, mins: number) {
  const n = new Date(base);
  n.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return n;
}

function durationLabel(mins: number) {
  if (mins < 60) return `${mins} mins`;
  const hrs = mins / 60;
  return Number.isInteger(hrs) ? `${hrs} hr${hrs > 1 ? "s" : ""}` : `${hrs} hrs`;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function DateTimeRow({
  startsAt,
  endsAt,
  onChange,
}: {
  startsAt: string;
  endsAt: string;
  onChange: (startsAt: string, endsAt: string) => void;
}) {
  const [open, setOpen] = useState<null | "date" | "start" | "end">(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startMins = start.getHours() * 60 + start.getMinutes();
  const endMins = end.getHours() * 60 + end.getMinutes();

  const [monthCursor, setMonthCursor] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));

  useEffect(() => {
    function onDoc(e: PointerEvent) {
      if (!rowRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  // Scroll the selected time into view when a time list opens
  useEffect(() => {
    if (open === "start" || open === "end") {
      listRef.current?.querySelector("[data-selected]")?.scrollIntoView({ block: "center" });
    }
    if (open === "date") {
      setMonthCursor(new Date(start.getFullYear(), start.getMonth(), 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monthCells = useMemo(() => {
    const gridStart = new Date(monthCursor);
    gridStart.setDate(1 - monthCursor.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [monthCursor]);

  function pickDate(d: Date) {
    const s = new Date(start);
    s.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(end);
    e.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(s.toISOString(), e.toISOString());
    setOpen(null);
  }

  function pickStart(mins: number) {
    const duration = end.getTime() - start.getTime();
    const s = timeAt(start, mins);
    const e = new Date(s.getTime() + duration);
    onChange(s.toISOString(), e.toISOString());
    setOpen(null);
  }

  function pickEnd(mins: number) {
    onChange(start.toISOString(), timeAt(start, mins).toISOString());
    setOpen(null);
  }

  const today = new Date();
  const fieldClass =
    "rounded-md bg-paper px-3 py-1.5 text-sm text-ink transition hover:bg-line/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue";

  return (
    <div ref={rowRef} className="relative flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setOpen(open === "date" ? null : "date")} className={cn(fieldClass, open === "date" && "bg-line/60")}>
        {fmtDate(start)}
      </button>
      <button type="button" onClick={() => setOpen(open === "start" ? null : "start")} className={cn(fieldClass, open === "start" && "bg-line/60")}>
        {fmtTime(start)}
      </button>
      <span className="text-sm text-muted">–</span>
      <button type="button" onClick={() => setOpen(open === "end" ? null : "end")} className={cn(fieldClass, open === "end" && "bg-line/60")}>
        {fmtTime(end)}
      </button>

      {open === "date" && (
        <div className="absolute left-0 top-full z-40 mt-1 w-[280px] rounded-xl border border-line bg-panel p-3 shadow-glow">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-ink">
              {monthCursor.toLocaleDateString([], { month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-paper">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-paper">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center">
            {DAY_LETTERS.map((l, i) => (
              <span key={i} className="py-1 text-[11px] text-muted">{l}</span>
            ))}
            {monthCells.map((d) => {
              const selected = d.toDateString() === start.toDateString();
              const isToday = d.toDateString() === today.toDateString();
              const inMonth = d.getMonth() === monthCursor.getMonth();
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => pickDate(d)}
                  className={cn(
                    "mx-auto grid size-8 place-items-center rounded-full text-xs transition",
                    selected ? "bg-blue font-medium text-white" : isToday ? "bg-blue/15 text-blue hover:bg-blue/20" : inMonth ? "text-ink hover:bg-paper" : "text-muted/50 hover:bg-paper"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(open === "start" || open === "end") && (
        <div
          ref={listRef}
          className={cn(
            "absolute top-full z-40 mt-1 max-h-56 w-40 overflow-y-auto rounded-xl border border-line bg-panel py-1 shadow-glow",
            open === "start" ? "left-[150px]" : "left-[220px]"
          )}
        >
          {(open === "start"
            ? Array.from({ length: 96 }, (_, i) => i * 15)
            : Array.from({ length: 96 }, (_, i) => i * 15 + 15).filter((m) => m > startMins)
          ).map((mins) => {
            const selected = open === "start" ? mins === startMins : mins === endMins;
            return (
              <button
                type="button"
                key={mins}
                data-selected={selected || undefined}
                onClick={() => (open === "start" ? pickStart(mins) : pickEnd(mins))}
                className={cn(
                  "flex w-full items-baseline justify-between px-3 py-1.5 text-left text-sm transition hover:bg-paper",
                  selected ? "text-blue" : "text-ink"
                )}
              >
                {fmtTime(timeAt(start, mins))}
                {open === "end" && <span className="text-[11px] text-muted">{durationLabel(mins - startMins)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
