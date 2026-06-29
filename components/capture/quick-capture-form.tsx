"use client";

import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { taskLabels } from "@/lib/task-labels";
import type { CaptureExtraction } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type QuickCaptureFormProps = {
  intent?: "task" | "review";
  defaultResponsibilityId?: string;
  defaultLabel?: string;
  inboxOnly?: boolean;
  hideResponsibilitySelect?: boolean;
  dueAt?: string;
  source?: CaptureExtraction["source"];
  placeholder?: string;
  submitLabel?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  selectClassName?: string;
  dateClassName?: string;
  descriptionClassName?: string;
  multiline?: boolean;
  onComplete?: () => void;
};

export function QuickCaptureForm({
  intent = "task",
  defaultResponsibilityId,
  defaultLabel,
  inboxOnly = false,
  hideResponsibilitySelect = false,
  dueAt,
  source = "typed",
  placeholder = intent === "review" ? "Capture anything messy" : "Quick add task",
  submitLabel = intent === "review" ? "Send to review" : "Add",
  value,
  onValueChange,
  className,
  inputClassName,
  buttonClassName,
  selectClassName,
  dateClassName,
  descriptionClassName,
  multiline = false,
  onComplete
}: QuickCaptureFormProps) {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const addTask = useAppStore((state) => state.addTask);
  const addCaptureExtraction = useAppStore((state) => state.addCaptureExtraction);
  const [internalText, setInternalText] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dueAt?.slice(0, 10) ?? "");
  const [label, setLabel] = useState(defaultLabel ?? taskLabels[0]);
  const [responsibilityId, setResponsibilityId] = useState(defaultResponsibilityId ?? responsibilities[0]?.id ?? "");
  const text = value ?? internalText;

  function updateText(nextValue: string) {
    if (onValueChange) {
      onValueChange(nextValue);
    } else {
      setInternalText(nextValue);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (intent === "review") {
      addCaptureExtraction({
        text: trimmed,
        source,
        responsibilityId: responsibilityId || responsibilities[0]?.id || "inbox"
      });
    } else {
      addTask({
        title: trimmed,
        responsibilityId: undefined,
        description: description.trim() || undefined,
        dueAt: date ? `${date}T17:00:00` : dueAt,
        labels: [label],
        priority: "medium"
      });
    }

    updateText("");
    setDescription("");
    onComplete?.();
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-2", className)}>
      <div className={cn("flex gap-2 rounded-lg border border-line bg-paper px-3", multiline ? "items-start py-3" : "items-center", inputClassName)}>
        {intent === "review" ? <Send className="mt-0.5 size-4 shrink-0 text-muted" /> : <Plus className="size-4 shrink-0 text-muted" />}
        {multiline ? (
          <textarea
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder={placeholder}
            className="min-h-56 min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-muted"
          />
        ) : (
          <input
            value={text}
            onChange={(event) => updateText(event.target.value)}
            placeholder={placeholder}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        )}
      </div>
      {intent === "task" ? (
        <>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description optional"
            rows={2}
            className={cn("min-h-16 resize-none rounded-lg border border-line bg-paper p-3 text-sm leading-5 text-ink outline-none placeholder:text-muted focus:border-blue", descriptionClassName)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={cn("h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none focus:border-blue", dateClassName)}
            />
            <select
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className={cn("h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none focus:border-blue", selectClassName)}
            >
              {taskLabels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              disabled={!text.trim()}
              className={cn("h-9 rounded-md bg-blue px-3 text-xs font-medium text-white disabled:opacity-40", buttonClassName)}
            >
              {submitLabel}
            </button>
          </div>
        </>
      ) : (
        <div className={cn("grid gap-2", inboxOnly || hideResponsibilitySelect ? "grid-cols-1" : "grid-cols-[1fr_auto]")}>
          {!inboxOnly && !hideResponsibilitySelect ? (
            <select
              value={responsibilityId}
              onChange={(event) => setResponsibilityId(event.target.value)}
              className={cn("h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none focus:border-blue", selectClassName)}
            >
              <option value="">Inbox</option>
              {responsibilities.map((responsibility) => (
                <option key={responsibility.id} value={responsibility.id}>
                  {responsibility.name}
                </option>
              ))}
            </select>
          ) : (
            null
          )}
          <button
            disabled={!text.trim()}
            className={cn("h-9 rounded-md bg-blue px-3 text-xs font-medium text-white disabled:opacity-40", (inboxOnly || hideResponsibilitySelect) && "w-full", buttonClassName)}
          >
            {submitLabel}
          </button>
        </div>
        )}
    </form>
  );
}
