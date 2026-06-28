"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { calendarOverlays } from "@/lib/queries/calendar";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DATES = [
  31,  1,  2,  3,  4,  5,  6,
   7,  8,  9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30,  1,  2,  3,  4,
   5,  6,  7,  8,  9, 10, 11
];

export function CalendarSidebar() {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const { hiddenResponsibilities, toggleResponsibility, visibleOverlays, toggleOverlay } = useUiStore();

  return (
    <aside className="hidden w-[292px] shrink-0 flex-col border-r border-[#303134] bg-[#1f1f1f] py-4 lg:flex">
      <div className="mb-5 px-5">
        <button className="flex h-14 items-center gap-3 rounded-2xl bg-[#c2e7ff] px-5 text-sm font-semibold text-[#001d35] shadow-lift transition hover:brightness-105">
          <Plus className="size-5" />
          Create
        </button>
      </div>
      {/* Mini calendar */}
      <div className="mb-5 px-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-[#e8eaed]">June 2026</span>
          <div className="flex gap-0">
            <button
              className="grid size-8 place-items-center rounded-full text-[#9aa0a6] transition hover:bg-[#3c4043]"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="grid size-8 place-items-center rounded-full text-[#9aa0a6] transition hover:bg-[#3c4043]"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {DAYS.map((d, i) => (
            <div key={i} className="flex h-8 items-center justify-center text-[11px] font-medium text-[#9aa0a6]">
              {d}
            </div>
          ))}
          {DATES.map((date, i) => {
            const inMonth = i > 0 && i < 31;
            const isToday = date === 27 && i === 27;
            return (
              <Link
                key={i}
                href="/calendar"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs transition mx-auto",
                  isToday ? "bg-[#4285f4] font-medium text-white" : "",
                  !isToday && inMonth ? "text-[#e8eaed] hover:bg-[#3c4043]" : "",
                  !isToday && !inMonth ? "text-[#5f6368] hover:bg-[#3c4043]" : ""
                )}
              >
                {date}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-4 h-px bg-[#3c4043]" />

      {/* My calendars */}
      <div className="flex-1 overflow-y-auto px-2">
        <p className="mb-1 px-2 text-xs font-medium text-[#9aa0a6]">My calendars</p>
        {responsibilities.map((item) => {
          const tone = responsibilityTone[item.color];
          const hidden = hiddenResponsibilities.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleResponsibility(item.id)}
              className="flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm transition hover:bg-[#3c4043]"
            >
              <span
                className="grid size-4 shrink-0 place-items-center rounded-sm transition"
                style={{ backgroundColor: hidden ? "transparent" : tone.hex, border: hidden ? "1.5px solid #5f6368" : "none" }}
              >
                {!hidden && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={cn("flex-1 truncate text-sm", hidden ? "text-[#5f6368]" : "text-[#e8eaed]")}>
                {item.name}
              </span>
            </button>
          );
        })}

        {/* Other calendars = event type filters */}
        <div className="mx-2 mb-2 mt-4 h-px bg-[#3c4043]" />
        <p className="mb-1 px-2 text-xs font-medium text-[#9aa0a6]">Show on calendar</p>
        {calendarOverlays.map((overlay) => {
          const active = visibleOverlays.includes(overlay.type);
          return (
            <button
              key={overlay.type}
              onClick={() => toggleOverlay(overlay.type)}
              className="flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm transition hover:bg-[#3c4043]"
            >
              <span
                className="grid size-4 shrink-0 place-items-center rounded-sm transition"
                style={{ backgroundColor: active ? "#9aa0a6" : "transparent", border: active ? "none" : "1.5px solid #5f6368" }}
              >
                {active && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={cn("flex-1 truncate text-sm", active ? "text-[#e8eaed]" : "text-[#5f6368]")}>
                {overlay.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
