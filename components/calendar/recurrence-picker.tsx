"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { describeRecurrence, nthWeekdayOfDate, parseRecurrence, type RecurrenceRule } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

function serialize(rule: RecurrenceRule | null): string {
  return rule ? JSON.stringify(rule) : "";
}

export function RecurrencePicker({
  value,
  startsAt,
  onChange,
}: {
  value: string;
  startsAt: string;
  onChange: (value: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const start = new Date(startsAt);
  const dow = start.getDay();
  const nth = nthWeekdayOfDate(start);
  const ordinal = nth.week === -1 ? "last" : ORDINALS[nth.week - 1];

  const presets: Array<{ label: string; rule: RecurrenceRule | null }> = [
    { label: "Does not repeat", rule: null },
    { label: "Daily", rule: { freq: "day", interval: 1 } },
    { label: `Weekly on ${WEEKDAY_NAMES[dow]}`, rule: { freq: "week", interval: 1, days: [dow] } },
    { label: `Monthly on the ${ordinal} ${WEEKDAY_NAMES[nth.day]}`, rule: { freq: "month", interval: 1, nth } },
    { label: `Annually on ${start.toLocaleDateString([], { month: "long", day: "numeric" })}`, rule: { freq: "year", interval: 1 } },
    { label: "Every weekday (Monday to Friday)", rule: { freq: "week", interval: 1, days: [1, 2, 3, 4, 5] } },
  ];

  const currentLabel = describeRecurrence(value, start);

  // Close the menu on outside pointerdown
  useEffect(() => {
    if (!menuPos) return;
    function onDoc(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setMenuPos(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [menuPos]);

  function toggleMenu() {
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      top: Math.min(rect.bottom + 4, window.innerHeight - 320),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
    });
  }

  function pick(rule: RecurrenceRule | null) {
    onChange(serialize(rule));
    setMenuPos(null);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        className="flex h-9 max-w-full items-center gap-2 rounded-md px-2 text-sm text-[#e8eaed] transition hover:bg-[#3c4043]"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-[#9aa0a6]" />
      </button>

      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            data-popup-card
            className="fixed z-[300] w-[320px] rounded-xl border border-[#3c4043] bg-[#202124] py-2 shadow-[0_12px_36px_rgba(0,0,0,0.55)]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {presets.map((preset) => {
              const active = currentLabel === preset.label || (preset.rule === null && currentLabel === "Does not repeat");
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => pick(preset.rule)}
                  className={cn(
                    "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#303134]",
                    active ? "text-[#8ab4f8]" : "text-[#e8eaed]"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMenuPos(null);
                setCustomOpen(true);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
            >
              Custom…
            </button>
          </div>,
          document.body
        )}

      {customOpen && (
        <CustomRecurrenceDialog
          initial={parseRecurrence(value)}
          startDow={dow}
          onCancel={() => setCustomOpen(false)}
          onDone={(rule) => {
            onChange(serialize(rule));
            setCustomOpen(false);
          }}
        />
      )}
    </>
  );
}

function CustomRecurrenceDialog({
  initial,
  startDow,
  onCancel,
  onDone,
}: {
  initial: RecurrenceRule | null;
  startDow: number;
  onCancel: () => void;
  onDone: (rule: RecurrenceRule) => void;
}) {
  const [interval, setInterval] = useState(initial?.interval ?? 1);
  const [freq, setFreq] = useState<RecurrenceRule["freq"]>(initial?.freq ?? "week");
  const [days, setDays] = useState<number[]>(initial?.days?.length ? initial.days : [startDow]);
  const [endsMode, setEndsMode] = useState<"never" | "on" | "after">(initial?.until ? "on" : initial?.count ? "after" : "never");
  const [untilDate, setUntilDate] = useState(initial?.until ?? "");
  const [count, setCount] = useState(initial?.count ?? 13);

  function toggleDay(d: number) {
    setDays((current) => {
      const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
      return next.length === 0 ? current : next; // at least one day stays selected
    });
  }

  function done() {
    const rule: RecurrenceRule = {
      freq,
      interval: Math.max(1, Math.min(99, interval)),
    };
    if (freq === "week") rule.days = [...days].sort((a, b) => a - b);
    if (endsMode === "on" && untilDate) rule.until = untilDate;
    if (endsMode === "after") rule.count = Math.max(1, Math.min(999, count));
    onDone(rule);
  }

  const inputClass = "rounded-md bg-[#303134] px-3 py-2 text-sm text-[#e8eaed] outline-none focus:ring-1 focus:ring-[#8ab4f8]";

  return createPortal(
    <div data-popup-card className="fixed inset-0 z-[320] grid place-items-center bg-black/50" onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-[min(400px,calc(100vw-2rem))] rounded-2xl border border-[#3c4043] bg-[#202124] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.6)]">
        <h3 className="text-xl text-[#e8eaed]">Custom recurrence</h3>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm text-[#bdc1c6]">Repeat every</span>
          <input
            type="number"
            min={1}
            max={99}
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            className={cn(inputClass, "w-16 text-center")}
          />
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value as RecurrenceRule["freq"])}
            className={cn(inputClass, "cursor-pointer [&>option]:bg-[#202124]")}
          >
            <option value="day">day{interval > 1 ? "s" : ""}</option>
            <option value="week">week{interval > 1 ? "s" : ""}</option>
            <option value="month">month{interval > 1 ? "s" : ""}</option>
            <option value="year">year{interval > 1 ? "s" : ""}</option>
          </select>
        </div>

        {freq === "week" && (
          <div className="mt-5">
            <p className="text-sm text-[#bdc1c6]">Repeat on</p>
            <div className="mt-2.5 flex gap-2">
              {DAY_LETTERS.map((letter, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-xs font-medium transition",
                    days.includes(d) ? "bg-[#8ab4f8] text-[#202124]" : "bg-[#303134] text-[#9aa0a6] hover:text-[#e8eaed]"
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm text-[#bdc1c6]">Ends</p>
          <div className="mt-2.5 space-y-2.5">
            {([
              ["never", "Never"],
              ["on", "On"],
              ["after", "After"],
            ] as const).map(([mode, label]) => (
              <label key={mode} className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  checked={endsMode === mode}
                  onChange={() => setEndsMode(mode)}
                  className="size-4 accent-[#8ab4f8]"
                />
                <span className="w-12 text-sm text-[#e8eaed]">{label}</span>
                {mode === "on" && (
                  <input
                    type="date"
                    value={untilDate}
                    onChange={(e) => { setUntilDate(e.target.value); setEndsMode("on"); }}
                    disabled={endsMode !== "on"}
                    className={cn(inputClass, "disabled:opacity-40")}
                  />
                )}
                {mode === "after" && (
                  <span className={cn("flex items-center gap-2", endsMode !== "after" && "opacity-40")}>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={count}
                      onChange={(e) => { setCount(parseInt(e.target.value) || 1); setEndsMode("after"); }}
                      disabled={endsMode !== "after"}
                      className={cn(inputClass, "w-20 text-center")}
                    />
                    <span className="text-sm text-[#9aa0a6]">occurrences</span>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-5 py-2 text-sm text-[#8ab4f8] transition hover:bg-[#303134]">
            Cancel
          </button>
          <button
            type="button"
            onClick={done}
            disabled={endsMode === "on" && !untilDate}
            className="rounded-full bg-[#8ab4f8] px-6 py-2 text-sm font-medium text-[#202124] transition hover:brightness-110 disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
