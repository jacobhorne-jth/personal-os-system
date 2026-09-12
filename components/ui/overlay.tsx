"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Backdrop + Escape-to-close + body scroll lock. `placement` decides whether
// the content floats near the top (dialogs, palette) or docks to the bottom
// (phone sheets).
export function Overlay({
  open,
  onClose,
  children,
  placement = "top",
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  placement?: "top" | "bottom" | "responsive";
  className?: string;
  label?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cn(
        "fixed inset-0 z-[60] flex justify-center bg-black/30 animate-fade-in dark:bg-black/50",
        placement === "top" && "items-start px-4 pt-[12vh]",
        placement === "bottom" && "items-end",
        placement === "responsive" && "items-end sm:items-start sm:px-4 sm:pt-[12vh]"
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full overflow-hidden bg-panel shadow-pop",
          placement === "top" && "max-w-xl rounded-xl animate-pop-in",
          placement === "bottom" && "max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-sheet-in",
          placement === "responsive" &&
            "max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-sheet-in sm:max-w-xl sm:rounded-xl sm:pb-0 sm:animate-pop-in",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
