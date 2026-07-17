"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { calendarPalette, responsibilityTone } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

const NEUTRAL_SAT = 0.25;

const paletteData = calendarPalette.map((key) => {
  const toneEntry = responsibilityTone[key];
  const hsl = hexToHsl(toneEntry.hex);
  return { key, hex: toneEntry.hex, label: toneEntry.label, ...hsl };
});

const wheelColors = paletteData.filter((c) => c.s >= NEUTRAL_SAT);
const neutralColors = paletteData.filter((c) => c.s < NEUTRAL_SAT);

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedTone = responsibilityTone[value];
  const open = pos !== null;

  // Close on any outside click (the popover is portaled to <body>, so it
  // can't rely on DOM containment with the trigger)
  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
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
    const WIDTH = 280;
    const left = Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
    setPos({ top, left });
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
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

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[200] w-[280px] rounded-xl border border-line bg-[#242528] p-3 shadow-lift"
            style={{ top: pos.top, left: pos.left }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted">{responsibilityTone[value].label}</p>
              <button type="button" onClick={() => setPos(null)} className="text-xs text-muted transition hover:text-ink">
                Done
              </button>
            </div>
            <ColorWheel value={value} onChange={onChange} />
          </div>,
          document.body
        )}
    </div>
  );
}

function ColorWheel({
  value,
  onChange
}: {
  value: ResponsibilityColor;
  onChange: (color: ResponsibilityColor) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [hoverKey, setHoverKey] = useState<ResponsibilityColor | null>(null);

  const SIZE = 232;
  const R = SIZE / 2;
  // Markers sit between 35% and 96% of the radius depending on saturation,
  // so even low-saturation palette colors stay clear of the center
  const markerRadius = (s: number) => R * (0.35 + 0.61 * Math.min(s, 1));

  const markers = useMemo(
    () =>
      wheelColors.map((c) => {
        const angle = (c.h * Math.PI) / 180;
        const r = markerRadius(c.s);
        return {
          ...c,
          x: R + r * Math.cos(angle),
          y: R + r * Math.sin(angle),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function nearestFromPoint(clientX: number, clientY: number): ResponsibilityColor | null {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: ResponsibilityColor | null = null;
    let bestDist = Infinity;
    for (const m of markers) {
      const d = (m.x - px) ** 2 + (m.y - py) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = m.key;
      }
    }
    return best;
  }

  function handlePointer(e: React.PointerEvent, commit: boolean) {
    const key = nearestFromPoint(e.clientX, e.clientY);
    if (!key) return;
    setHoverKey(key);
    if (commit) onChange(key);
  }

  return (
    <div>
      <div
        ref={wheelRef}
        className="relative mx-auto cursor-pointer rounded-full"
        style={{
          width: SIZE,
          height: SIZE,
          background:
            "radial-gradient(circle, #242528 0%, rgba(36,37,40,0.85) 26%, rgba(36,37,40,0) 62%), conic-gradient(from 90deg, hsl(0 80% 55%), hsl(60 80% 55%), hsl(120 70% 45%), hsl(180 70% 45%), hsl(240 75% 60%), hsl(300 75% 55%), hsl(360 80% 55%))",
        }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          handlePointer(e, true);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) handlePointer(e, true);
          else handlePointer(e, false);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) setHoverKey(null);
        }}
      >
        {markers.map((m) => {
          const active = m.key === value;
          const hovered = m.key === hoverKey;
          return (
            <span
              key={m.key}
              title={m.label}
              className={cn(
                "pointer-events-none absolute rounded-full border transition-transform",
                active ? "z-10 border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]" : "border-black/40",
                (active || hovered) && "scale-150"
              )}
              style={{
                left: m.x - 7,
                top: m.y - 7,
                width: 14,
                height: 14,
                backgroundColor: m.hex,
              }}
            />
          );
        })}
      </div>

      {/* Neutrals live outside the hue wheel */}
      <div className="mt-3 flex items-center justify-center gap-3">
        {neutralColors.map((c) => {
          const active = c.key === value;
          return (
            <button
              key={c.key}
              type="button"
              title={c.label}
              aria-label={`Set color to ${c.label}`}
              onClick={() => onChange(c.key)}
              className={cn(
                "size-7 rounded-full border border-black/40 transition hover:scale-110",
                active && "ring-2 ring-white/70 ring-offset-2 ring-offset-[#242528]"
              )}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>
    </div>
  );
}
