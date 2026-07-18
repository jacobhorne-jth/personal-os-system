"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { colorHex } from "@/lib/theme";
import type { ResponsibilityColor } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const WHEEL_LIGHTNESS = 0.55;
const NEUTRALS = ["#616161", "#78909c", "#9e9e9e"];

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

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

export function ResponsibilityColorPicker({
  value,
  onChange,
  compact = false
}: {
  value: ResponsibilityColor;
  onChange: (color: ResponsibilityColor) => void;
  compact?: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hex = colorHex(value);
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
        aria-label="Label color"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-line bg-paper px-3 text-sm text-ink transition hover:bg-line",
          compact && "h-8 px-2.5 text-xs"
        )}
      >
        <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
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
            <ColorWheel value={hex} onChange={onChange} />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {NEUTRALS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Set color to ${n}`}
                    onClick={() => onChange(n)}
                    className={cn(
                      "size-7 rounded-full border border-black/40 transition hover:scale-110",
                      n === hex && "ring-2 ring-white/70 ring-offset-2 ring-offset-[#242528]"
                    )}
                    style={{ backgroundColor: n }}
                  />
                ))}
              </div>
              <button type="button" onClick={() => setPos(null)} className="text-xs text-muted transition hover:text-ink">
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const SIZE = 232;
  const R = SIZE / 2;

  // Paint the hue/saturation disc once: hue by angle, saturation by radius,
  // constant lightness — picking reads back the same formula, so WYSIWYG
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const px = SIZE * scale;
    canvas.width = px;
    canvas.height = px;
    const img = ctx.createImageData(px, px);
    const r0 = px / 2;
    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - r0;
        const dy = y - r0;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > r0) continue;
        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const s = Math.min(1, r / r0);
        const a = s * Math.min(WHEEL_LIGHTNESS, 1 - WHEEL_LIGHTNESS);
        const f = (n: number) => {
          const k = (n + h / 30) % 12;
          return Math.round((WHEEL_LIGHTNESS - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255);
        };
        const i = (y * px + x) * 4;
        img.data[i] = f(0);
        img.data[i + 1] = f(8);
        img.data[i + 2] = f(4);
        img.data[i + 3] = r > r0 - scale ? Math.round(255 * (r0 - r)) / scale : 255; // soft edge
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  function pick(e: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - rect.left - R;
    const dy = e.clientY - rect.top - R;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.sqrt(dx * dx + dy * dy) / R);
    onChange(hslToHex(h, s, WHEEL_LIGHTNESS));
  }

  // Thumb position from the current color's hue/saturation
  const hsl = hexToHsl(value);
  const angle = (hsl.h * Math.PI) / 180;
  const tr = Math.min(1, hsl.s) * (R - 4);
  const tx = R + tr * Math.cos(angle);
  const ty = R + tr * Math.sin(angle);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <canvas
        ref={canvasRef}
        className="cursor-crosshair touch-none rounded-full"
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) pick(e);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
      />
      <span
        className="pointer-events-none absolute z-10 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.45),0_1px_4px_rgba(0,0,0,0.4)]"
        style={{ left: tx - 9, top: ty - 9, width: 18, height: 18, backgroundColor: value }}
      />
    </div>
  );
}
