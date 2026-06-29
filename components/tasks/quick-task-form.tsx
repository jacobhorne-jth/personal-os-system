"use client";

import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { cn } from "@/lib/utils";

export function QuickTaskForm({ responsibilityId, compact = false }: { responsibilityId?: string; compact?: boolean }) {
  return (
    <div className={cn("border-b border-line p-3", !compact && "sm:max-w-3xl")}>
      <QuickCaptureForm
        defaultResponsibilityId={responsibilityId}
        hideResponsibilitySelect={Boolean(responsibilityId)}
        placeholder="Add a task"
        inputClassName="rounded-full"
        selectClassName="rounded-full text-sm"
        buttonClassName="rounded-full px-4 text-sm"
      />
    </div>
  );
}
