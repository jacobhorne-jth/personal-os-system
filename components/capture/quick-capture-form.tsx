"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, CalendarDays, Plus, RefreshCw, Send, X, Clock } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { parseInput, buildDueAt } from "@/lib/task-parser";
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

const chipColors = {
  date: "bg-blue/10 text-blue border-blue/20",
  time: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  recurrence: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  label: "bg-amber-500/10 text-amber-400 border-amber-500/20",
} as const;

const chipIcons = {
  date: CalendarDays,
  time: Clock,
  recurrence: RefreshCw,
  label: AtSign,
} as const;

export function QuickCaptureForm({
  intent = "task",
  defaultResponsibilityId,
  defaultLabel,
  inboxOnly = false,
  hideResponsibilitySelect = false,
  dueAt,
  source = "typed",
  placeholder = intent === "review" ? "Capture anything messy" : "Add a task — try 'dentist tmrw at 2pm' or 'gym every mon'",
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
  const [label, setLabel] = useState(defaultLabel ?? "");
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
      const dueAtValue = parsed?.dueDate
        ? buildDueAt(parsed.dueDate, parsed.dueTime)
        : (dueAt ?? undefined);

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

    updateText("");
    setDescription("");
    onComplete?.();
  }

  const hasChips = intent === "task" && (parsed?.chips.length ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-2", className)}>
      <div className="relative">
        <div className={cn("flex gap-2 rounded-lg border border-line bg-paper px-3", multiline ? "items-start py-3" : "items-center", inputClassName)}>
          {intent === "review" ? <Send className="mt-0.5 size-4 shrink-0 text-muted" /> : <Plus className="size-4 shrink-0 text-muted" />}
          {multiline ? (
            <textarea
              value={text}
              onChange={(e) => updateText(e.target.value)}
              placeholder={placeholder}
              className="min-h-56 min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-muted"
            />
          ) : (
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => updateText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          )}
          {text && (
            <button type="button" onClick={() => updateText("")} className="shrink-0 text-muted hover:text-ink">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* @mention autocomplete dropdown */}
        {showMention && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-paper shadow-lg">
            {mentionOptions.map((r, i) => {
              const active = i === Math.min(mentionIdx, mentionOptions.length - 1);
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectMention(r.name); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-blue/10 text-blue" : "text-ink hover:bg-panel"
                  )}
                >
                  <AtSign className="size-3.5 shrink-0 text-muted" />
                  <span>{r.name}</span>
                  {active && (
                    <kbd className="ml-auto rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px] text-muted">
                      ↵
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Parsed chips */}
      {hasChips && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {parsed!.chips.map((chip, i) => {
            const Icon = chipIcons[chip.type];
            return (
              <span
                key={i}
                className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", chipColors[chip.type])}
              >
                <Icon className="size-3" />
                {chip.label}
              </span>
            );
          })}
          {parsed!.cleanTitle && parsed!.cleanTitle !== text.trim() && (
            <span className="flex items-center rounded-full border border-line bg-panel px-2 py-0.5 text-xs text-muted">
              Title: &ldquo;{parsed!.cleanTitle}&rdquo;
            </span>
          )}
        </div>
      )}

      {intent === "task" ? (
        <>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optional"
            rows={2}
            className={cn("min-h-16 resize-none rounded-lg border border-line bg-paper p-3 text-sm leading-5 text-ink outline-none placeholder:text-muted focus:border-blue", descriptionClassName)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <input
              type="date"
              value={parsed?.dueDate
                ? parsed.dueDate.toISOString().slice(0, 10)
                : ""}
              onChange={() => {}}
              readOnly
              placeholder="Date from text"
              className={cn(
                "h-9 rounded-md border px-2 text-xs outline-none",
                parsed?.dueDate
                  ? "border-blue/30 bg-blue/5 text-blue"
                  : "border-line bg-paper text-muted",
                dateClassName
              )}
            />
            <select
              value={parsed?.labelHint ?? label}
              onChange={(e) => setLabel(e.target.value)}
              className={cn(
                "h-9 rounded-md border px-2 text-xs text-muted outline-none focus:border-blue",
                parsed?.labelHint ? "border-amber-500/30 bg-amber-500/5 text-amber-400" : "border-line bg-paper",
                selectClassName
              )}
            >
              {labelNames.map((item) => (
                <option key={item} value={item}>{item}</option>
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
              onChange={(e) => setResponsibilityId(e.target.value)}
              className={cn("h-9 rounded-md border border-line bg-paper px-2 text-xs text-muted outline-none focus:border-blue", selectClassName)}
            >
              <option value="">Inbox</option>
              {responsibilities.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          ) : null}
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
