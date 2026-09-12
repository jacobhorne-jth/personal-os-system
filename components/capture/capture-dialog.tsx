"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { Overlay } from "@/components/ui/overlay";
import { useUiStore } from "@/lib/stores/ui-store";

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

// Global quick-add: "C" anywhere (or the sidebar / tab-bar button) opens a
// task input with the natural-language parser.
export function CaptureDialog() {
  const open = useUiStore((state) => state.captureOpen);
  const setOpen = useUiStore((state) => state.setCaptureOpen);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || useUiStore.getState().paletteOpen) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const close = () => setOpen(false);

  return (
    <Overlay open={open} onClose={close} placement="responsive" label="New task">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">New task</p>
          <p className="hidden text-xs text-subtle sm:block">Try &ldquo;review notes tomorrow 3pm @School&rdquo;</p>
        </div>
        <QuickCaptureForm autoFocus stackControls placeholder="What needs doing?" onComplete={close} onCancel={close} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper/60 px-4 py-2.5">
        <Link
          href="/capture"
          onClick={close}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <Sparkles className="size-3.5" />
          Something messier? Capture for review
        </Link>
      </div>
    </Overlay>
  );
}
