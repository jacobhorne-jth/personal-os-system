"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CalendarX, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, localDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

// A due date is a "YYYY-MM-DD" string, or null for "no date".

function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function nextWeekday(from: string, targetDow: number): string {
  let d = from;
  for (let i = 0; i < 7; i++) {
    d = addDays(d, 1);
    if (keyToDate(d).getDay() === targetDow) return d;
  }
  return from;
}

// Short human label for the trigger button: Today / Tomorrow / Sat / Jul 25
export function dueDateLabel(value: string | null): string {
  if (!value) return "No date";
  const today = localDateKey();
  if (value === today) return "Today";
  if (value === addDays(today, 1)) return "Tomorrow";
  const d = keyToDate(value);
  const withinWeek = value > today && value <= addDays(today, 6);
  if (withinWeek) return WEEKDAY[d.getDay()];
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString([], { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function DueDatePicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; drop: "up" | "down" } | null>(null);
  const today = localDateKey();
  const [month, setMonth] = useState(() => keyToDate(value ?? today));

  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  function toggle() {
    if (open) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMonth(keyToDate(value ?? today));
    const POP_H = 380;
    const dropUp = rect.bottom + POP_H > window.innerHeight;
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
      top: dropUp ? rect.top - 6 : rect.bottom + 6,
      drop: dropUp ? "up" : "down",
    });
  }

  function pick(next: string | null) {
    onChange(next);
    setPos(null);
  }

  const presets: Array<{ label: string; date: string; hint: string }> = [
    { label: "Today", date: today, hint: WEEKDAY[keyToDate(today).getDay()] },
    { label: "Tomorrow", date: addDays(today, 1), hint: WEEKDAY[keyToDate(addDays(today, 1)).getDay()] },
    { label: "This weekend", date: nextWeekday(today, 6), hint: "Sat" },
    { label: "Next week", date: nextWeekday(today, 1), hint: "Mon" },
  ];

  // Month grid (Mon-first) for the visible month
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(localDateKey(new Date(month.getFullYear(), month.getMonth(), d)));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label="Due date"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md border px-2 text-xs outline-none transition",
          value ? "border-blue/30 bg-blue/5 text-blue" : "border-line bg-paper text-muted hover:text-ink",
          className
        )}
      >
        <CalendarDays className="size-3.5 shrink-0" />
        <span className="truncate">{dueDateLabel(value)}</span>
      </button>

      {pos &&
        createPortal(
          <div
            ref={popRef}
            data-popup-card
            className="fixed z-[320] w-[280px] rounded-xl border border-[#3c4043] bg-[#202124] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={pos.drop === "down" ? { left: pos.left, top: pos.top } : { left: pos.left, bottom: window.innerHeight - pos.top }}
          >
            {/* Quick presets */}
            <div className="space-y-0.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => pick(p.date)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
                >
                  <CalendarDays className="size-4 shrink-0 text-[#9aa0a6]" />
                  <span className="flex-1">{p.label}</span>
                  <span className="text-xs text-[#9aa0a6]">{p.hint}</span>
                  {value === p.date && <Check className="size-4 text-[#8ab4f8]" />}
                </button>
              ))}
              {value && (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
                >
                  <CalendarX className="size-4 shrink-0 text-[#9aa0a6]" />
                  <span className="flex-1">No date</span>
                </button>
              )}
            </div>

            <div className="my-2 border-t border-[#3c4043]" />

            {/* Month calendar */}
            <div className="px-1 pb-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[#e8eaed]">
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid size-6 place-items-center rounded text-[#9aa0a6] transition hover:bg-[#303134] hover:text-[#e8eaed]">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid size-6 place-items-center rounded text-[#9aa0a6] transition hover:bg-[#303134] hover:text-[#e8eaed]">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} className="py-1 text-[10px] font-medium text-[#9aa0a6]">{d}</span>
                ))}
                {cells.map((key, i) =>
                  key === null ? (
                    <span key={i} />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pick(key)}
                      className={cn(
                        "grid size-8 place-items-center rounded-full text-xs transition",
                        key === value
                          ? "bg-[#8ab4f8] font-semibold text-[#202124]"
                          : key === today
                          ? "text-[#8ab4f8] hover:bg-[#303134]"
                          : "text-[#e8eaed] hover:bg-[#303134]"
                      )}
                    >
                      {keyToDate(key).getDate()}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
