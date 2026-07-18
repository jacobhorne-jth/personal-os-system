"use client";

import { useAppStore } from "@/lib/stores/app-store";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ResponsibilityHeading({ responsibilityId }: { responsibilityId: string }) {
  const responsibility = useAppStore((state) => state.responsibilities.find((item) => item.id === responsibilityId));

  if (!responsibility) {
    return null;
  }

  return (
    <>
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: getTone(responsibility.color).hex }} />
      <div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ backgroundColor: getTone(responsibility.color).hex }} />
          <span className="text-sm text-muted">Responsibility</span>
        </div>
        <h1 className="mt-2 text-3xl font-normal text-ink">{responsibility.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{responsibility.description}</p>
      </div>
    </>
  );
}
