"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { calendarPalette, responsibilityTone } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export function ResponsibilityColorPicker({
  value,
  onChange,
  compact = false,
  showLabels = false
}: {
  value: ResponsibilityColor;
  onChange: (color: ResponsibilityColor) => void;
  compact?: boolean;
  showLabels?: boolean;
}) {
  return (
    <PopoverPicker value={value} onChange={onChange} compact={compact} showLabels={showLabels} />
  );
}

function PopoverPicker({
  value,
  onChange,
  compact,
  showLabels
}: {
  value: ResponsibilityColor;
  onChange: (color: ResponsibilityColor) => void;
  compact: boolean;
  showLabels: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedTone = responsibilityTone[value];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-line bg-paper px-3 text-sm text-ink transition hover:bg-line",
          compact && "h-8 px-2.5 text-xs",
          showLabels && "min-w-[150px] justify-between"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("size-4 shrink-0 rounded-full", selectedTone.dot)} />
          <span className={cn("truncate", !showLabels && "sr-only")}>{selectedTone.label}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-11 z-50 w-[280px] rounded-xl border border-line bg-[#242528] p-3 shadow-lift"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Label color</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted transition hover:text-ink">
              Done
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarPalette.map((color) => {
              const active = color === value;
              const tone = responsibilityTone[color];
              return (
                <button
                  key={color}
                  type="button"
                  title={tone.label}
                  aria-label={`Set color to ${tone.label}`}
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border border-black/30 shadow-sm transition hover:scale-110",
                    tone.dot,
                    active && "ring-2 ring-ink ring-offset-2 ring-offset-[#242528]"
                  )}
                >
                  {active && <Check className={cn("size-4", tone.eventText === "#202124" ? "text-paper" : "text-white")} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
