"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { getTone } from "@/lib/theme";
import type { Responsibility } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export function LabelSelect({
  value,
  options,
  onChange,
  className
}: {
  value: string;
  options: Responsibility[];
  onChange: (responsibilityId: string) => void;
  className?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const selected = options.find((r) => r.id === value);

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

  function toggle() {
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      top: Math.min(rect.bottom + 4, window.innerHeight - Math.min(options.length, 8) * 40 - 16),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-md px-2 text-sm text-[#e8eaed] transition hover:bg-[#3c4043]",
          className
        )}
      >
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: selected ? getTone(selected.color).hex : "#5f6368" }}
        />
        <span className="min-w-0 truncate">{selected?.name ?? "No label"}</span>
        <ChevronDown className="size-4 shrink-0 text-[#9aa0a6]" />
      </button>

      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            data-popup-card
            className="fixed z-[300] max-h-[320px] w-[224px] overflow-y-auto rounded-xl border border-[#3c4043] bg-[#202124] py-2 shadow-[0_12px_36px_rgba(0,0,0,0.55)]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {options.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setMenuPos(null);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
              >
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: getTone(item.color).hex }} />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {item.id === value && <Check className="size-4 shrink-0 text-[#8ab4f8]" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
