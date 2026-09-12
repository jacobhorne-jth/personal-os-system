"use client";

import { QuickCaptureForm } from "@/components/capture/quick-capture-form";
import { useAppStore } from "@/lib/stores/app-store";

// Inline add row for a label's task list: new tasks default to that label
export function QuickTaskForm({ responsibilityId }: { responsibilityId?: string; compact?: boolean }) {
  const labelName = useAppStore((state) => state.responsibilities.find((item) => item.id === responsibilityId)?.name);
  return (
    <div className="border-b border-line p-3">
      <QuickCaptureForm
        defaultResponsibilityId={responsibilityId}
        defaultLabel={labelName}
        hideResponsibilitySelect={Boolean(responsibilityId)}
        placeholder={labelName ? `Add a task to ${labelName}` : "Add a task"}
      />
    </div>
  );
}
