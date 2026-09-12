"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, AtSign, CalendarDays, Clock, Plus, RefreshCw, Send, Tag, X } from "lucide-react";
import { useActiveResponsibilities, useAppStore } from "@/lib/stores/app-store";
import { nextOccurrence } from "@/lib/recurrence";
import { parseInput, buildDueAt } from "@/lib/task-parser";
import { getTone } from "@/lib/theme";
import type { CaptureExtraction } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/dates";
import { DueDatePicker } from "@/components/capture/due-date-picker";

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
  autoFocus?: boolean;
  stackControls?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
};

const chipColors = {
  date: "bg-accent/10 text-accent",
  time: "bg-accent/10 text-accent",
  recurrence: "bg-success/10 text-success",
  label: "bg-warning/10 text-warning",
} as const;

const chipIcons = {
  date: CalendarDays,
  time: Clock,
  recurrence: RefreshCw,
  label: AtSign,
} as const;

const controlChip =
  "flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-line px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-ink";

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function QuickCaptureForm({
  intent = "task",
  defaultResponsibilityId,
  defaultLabel,
  inboxOnly = false,
  hideResponsibilitySelect = false,
  dueAt,
  source = "typed",
  placeholder = intent === "review" ? "Capture anything messy" : "Add a task",
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
  autoFocus = false,
  stackControls = false,
  onComplete,
  onCancel
}: QuickCaptureFormProps) {
  const responsibilities = useActiveResponsibilities();
  const addTask = useAppStore((state) => state.addTask);
  const addCaptureExtraction = useAppStore((state) => state.addCaptureExtraction);
  const [internalText, setInternalText] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [label, setLabel] = useState(defaultLabel ?? "");
  // undefined = follow detection/default; string = manually chosen date; null = manually cleared
  const [manualDate, setManualDate] = useState<string | null | undefined>(undefined);
  const [responsibilityId, setResponsibilityId] = useState(defaultResponsibilityId ?? responsibilities[0]?.id ?? "");

  const text = value ?? internalText;

  const labelNames = useMemo(() => responsibilities.map((r) => r.name), [responsibilities]);

  // Default the label to the first responsibility once they load
  useEffect(() => {
    if (!label && labelNames.length > 0) {
      setLabel(defaultLabel ?? labelNames[0]);
    }
  }, [label, labelNames, defaultLabel]);

  // Only run parser for task intent
  const parsed = useMemo(
    () => intent === "task" ? parseInput(text, labelNames) : null,
    [text, intent, labelNames]
  );

  // ── @mention autocomplete ──────────────────────────────────────────────────

  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);

  const mentionRe = /@(\w*)/.exec(text);
  const mentionQuery = mentionRe ? mentionRe[1].toLowerCase() : null;

  const mentionOptions = useMemo(
    () => mentionQuery !== null
      ? responsibilities.filter((r) => r.name.toLowerCase().startsWith(mentionQuery))
      : [],
    [mentionQuery, responsibilities]
  );

  const exactMentionMatch = mentionQuery !== null &&
    responsibilities.some((r) => r.name.toLowerCase() === mentionQuery);

  const showMention = intent === "task" &&
    mentionOptions.length > 0 &&
    !mentionDismissed &&
    !exactMentionMatch;

  // Reset index + dismissed whenever the query changes
  useEffect(() => {
    setMentionIdx(0);
    setMentionDismissed(false);
  }, [mentionQuery]);

  function selectMention(name: string) {
    const matched = mentionRe![0];
    const newText = text.replace(matched, `@${name}`).replace(/\s{2,}/g, " ");
    if (onValueChange) {
      onValueChange(newText);
    } else {
      setInternalText(newText);
    }
    setMentionDismissed(false);
    setMentionIdx(0);
    // Return focus to input after click selection
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showMention) return;
    if (e.key === "Tab" || e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIdx((i) => (i + 1) % mentionOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIdx((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const safeIdx = Math.min(mentionIdx, mentionOptions.length - 1);
      selectMention(mentionOptions[safeIdx].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionDismissed(true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  function updateText(nextValue: string) {
    if (onValueChange) {
      onValueChange(nextValue);
    } else {
      setInternalText(nextValue);
    }
  }

  function resetForm() {
    updateText("");
    setDescription("");
    setShowDescription(false);
    setManualDate(undefined);
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
      const title = parsed?.chips.length ? (parsed.cleanTitle || trimmed) : trimmed;
      let dueAtValue: string | undefined;
      if (manualDate !== undefined) {
        // Manual pick (or explicit clear) wins over detection
        dueAtValue = manualDate ? buildDueAt(dateFromKey(manualDate), parsed?.dueTime) : undefined;
      } else if (parsed?.dueDate) {
        dueAtValue = buildDueAt(parsed.dueDate, parsed.dueTime);
      } else {
        dueAtValue = dueAt ?? (parsed?.recurrence ? nextOccurrence(parsed.recurrence) : undefined);
      }

      addTask({
        title,
        responsibilityId: undefined,
        description: description.trim() || undefined,
        dueAt: dueAtValue,
        labels: [parsed?.labelHint ?? label],
        priority: "medium",
        recurrence: parsed?.recurrence,
      });
    }

    resetForm();
    onComplete?.();
  }

  const hasChips = intent === "task" && (parsed?.chips.length ?? 0) > 0;
  const expanded = stackControls || text.trim().length > 0 || showDescription;

  // The date shown in the picker: a manual pick wins, else the detected date,
  // else the form's default due date (e.g. today on the home rail)
  const detectedOrDefault = parsed?.dueDate
    ? localDateKey(parsed.dueDate)
    : (dueAt ? localDateKey(new Date(dueAt)) : null);
  const effectiveDueDate = manualDate !== undefined ? manualDate : detectedOrDefault;
  const activeLabel = parsed?.labelHint ?? label;
  const activeLabelColor = getTone(responsibilities.find((r) => r.name === activeLabel)?.color).hex;

  const mentionMenu = showMention && (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-panel p-1 shadow-pop">
      {mentionOptions.map((r, i) => {
        const active = i === Math.min(mentionIdx, mentionOptions.length - 1);
        return (
          <button
            key={r.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); selectMention(r.name); }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
              active ? "bg-hover text-ink" : "text-ink hover:bg-hover"
            )}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: getTone(r.color).hex }} />
            <span>{r.name}</span>
            {active && <kbd className="ml-auto text-[10px] text-subtle">↵</kbd>}
          </button>
        );
      })}
    </div>
  );

  const parsedChips = hasChips && (
    <div className="flex flex-wrap gap-1.5 px-0.5">
      {parsed!.chips.map((chip, i) => {
        const Icon = chipIcons[chip.type];
        return (
          <span key={i} className={cn("flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium", chipColors[chip.type])}>
            <Icon className="size-3" />
            {chip.label}
          </span>
        );
      })}
      {parsed!.cleanTitle && parsed!.cleanTitle !== text.trim() && (
        <span className="flex h-6 items-center rounded-md bg-hover px-2 text-xs text-muted">
          &ldquo;{parsed!.cleanTitle}&rdquo;
        </span>
      )}
    </div>
  );

  if (intent === "task") {
    return (
      <form onSubmit={handleSubmit} className={cn("grid gap-2", className)}>
        <div className="relative">
          <div
            className={cn(
              "rounded-lg border border-line bg-panel transition focus-within:border-ink/25 focus-within:ring-2 focus-within:ring-ink/[0.06]",
              inputClassName
            )}
          >
            <div className="flex items-center gap-2 pl-3 pr-1.5">
              <Plus className="size-4 shrink-0 text-subtle" />
              <input
                ref={inputRef}
                autoFocus={autoFocus}
                value={text}
                onChange={(e) => updateText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={placeholder}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
              />
              {(text || description) && !onCancel && (
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label="Clear task"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel task"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {text.trim() && (
                <button
                  type="submit"
                  aria-label={submitLabel}
                  className={cn("h-7 shrink-0 rounded-md bg-ink px-2.5 text-xs font-medium text-paper transition-opacity hover:opacity-85", buttonClassName)}
                >
                  {submitLabel}
                </button>
              )}
            </div>

            {expanded && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2 py-2">
                <label className={cn(controlChip, "focus-within:border-ink/25", selectClassName)}>
                  <Tag className="size-3.5 shrink-0" />
                  <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: activeLabelColor }} />
                  <select
                    value={activeLabel}
                    onChange={(e) => setLabel(e.target.value)}
                    className="min-w-0 max-w-[120px] cursor-pointer bg-transparent text-xs text-ink outline-none"
                    aria-label="Label"
                  >
                    {labelNames.length === 0 && <option value="">Label</option>}
                    {labelNames.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <DueDatePicker value={effectiveDueDate} onChange={(next) => setManualDate(next)} className={dateClassName} />
                <button
                  type="button"
                  onClick={() => setShowDescription((open) => !open)}
                  aria-pressed={showDescription}
                  className={cn(controlChip, showDescription && "border-ink/20 bg-hover text-ink")}
                >
                  <AlignLeft className="size-3.5 shrink-0" />
                  Notes
                </button>
              </div>
            )}

            {showDescription && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes"
                rows={3}
                className={cn(
                  "block w-full resize-none border-t border-line bg-transparent px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-subtle",
                  descriptionClassName
                )}
              />
            )}
          </div>
          {mentionMenu}
        </div>
        {parsedChips}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex gap-2 rounded-lg border border-line bg-panel px-3 transition focus-within:border-ink/25 focus-within:ring-2 focus-within:ring-ink/[0.06]",
            multiline ? "items-start py-3" : "items-center",
            inputClassName
          )}
        >
          {intent === "review" ? <Send className="mt-0.5 size-4 shrink-0 text-subtle" /> : <Plus className="size-4 shrink-0 text-subtle" />}
          {multiline ? (
            <textarea
              autoFocus={autoFocus}
              value={text}
              onChange={(e) => updateText(e.target.value)}
              placeholder={placeholder}
              className="min-h-56 min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-subtle"
            />
          ) : (
            <input
              ref={inputRef}
              autoFocus={autoFocus}
              value={text}
              onChange={(e) => updateText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
            />
          )}
          {text && (
            <button type="button" onClick={() => updateText("")} aria-label="Clear" className="shrink-0 text-subtle hover:text-ink">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {mentionMenu}
      </div>

      {parsedChips}

      <div className={cn("grid gap-2", inboxOnly || hideResponsibilitySelect ? "grid-cols-1" : "grid-cols-[1fr_auto]")}>
        {!inboxOnly && !hideResponsibilitySelect ? (
          <select
            value={responsibilityId}
            onChange={(e) => setResponsibilityId(e.target.value)}
            className={cn("h-8 rounded-md border border-line bg-panel px-2 text-xs text-muted outline-none focus:border-ink/25", selectClassName)}
          >
            <option value="">Inbox</option>
            {responsibilities.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : null}
        <button
          disabled={!text.trim()}
          className={cn("h-8 rounded-md bg-ink px-3 text-xs font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-40", (inboxOnly || hideResponsibilitySelect) && "w-full", buttonClassName)}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
