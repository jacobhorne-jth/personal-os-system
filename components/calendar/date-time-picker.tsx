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
    "rounded-md bg-[#303134] px-3 py-1.5 text-sm text-[#e8eaed] transition hover:bg-[#37383b] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8ab4f8]";

  return (
    <div ref={rowRef} className="relative flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setOpen(open === "date" ? null : "date")} className={cn(fieldClass, open === "date" && "bg-[#37383b]")}>
        {fmtDate(start)}
      </button>
      <button type="button" onClick={() => setOpen(open === "start" ? null : "start")} className={cn(fieldClass, open === "start" && "bg-[#37383b]")}>
        {fmtTime(start)}
      </button>
      <span className="text-sm text-[#9aa0a6]">–</span>
      <button type="button" onClick={() => setOpen(open === "end" ? null : "end")} className={cn(fieldClass, open === "end" && "bg-[#37383b]")}>
        {fmtTime(end)}
      </button>

      {open === "date" && (
        <div className="absolute left-0 top-full z-40 mt-1 w-[280px] rounded-xl border border-[#3c4043] bg-[#202124] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.55)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-[#e8eaed]">
              {monthCursor.toLocaleDateString([], { month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="grid size-7 place-items-center rounded-full text-[#bdc1c6] transition hover:bg-[#303134]">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="grid size-7 place-items-center rounded-full text-[#bdc1c6] transition hover:bg-[#303134]">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center">
            {DAY_LETTERS.map((l, i) => (
              <span key={i} className="py-1 text-[11px] text-[#9aa0a6]">{l}</span>
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
                    selected ? "bg-[#8ab4f8] font-medium text-[#202124]" : isToday ? "bg-[#0842a0] text-[#c2e7ff] hover:bg-[#0b57d0]" : inMonth ? "text-[#e8eaed] hover:bg-[#303134]" : "text-[#5f6368] hover:bg-[#303134]"
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
            "absolute top-full z-40 mt-1 max-h-56 w-40 overflow-y-auto rounded-xl border border-[#3c4043] bg-[#202124] py-1 shadow-[0_12px_36px_rgba(0,0,0,0.55)]",
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
                  "flex w-full items-baseline justify-between px-3 py-1.5 text-left text-sm transition hover:bg-[#303134]",
                  selected ? "text-[#8ab4f8]" : "text-[#e8eaed]"
                )}
              >
                {fmtTime(timeAt(start, mins))}
                {open === "end" && <span className="text-[11px] text-[#9aa0a6]">{durationLabel(mins - startMins)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
