"use client";

import { useRouter } from "next/navigation";
import { CornerDownLeft, Moon, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_NAV_ITEMS } from "@/components/layout/nav";
import { useTheme } from "@/components/layout/theme-toggle";
import { Overlay } from "@/components/ui/overlay";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { getTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

type PaletteEntry = {
  id: string;
  title: string;
  group: string;
  hint?: string;
  color?: string;
  icon?: React.ElementType;
  run: () => void;
};

// ⌘K palette: jump to any section, run a quick action, or search every
// task, event, note, goal, idea, habit, and label.
export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((state) => state.paletteOpen);
  const setOpen = useUiStore((state) => state.setPaletteOpen);
  const setCaptureOpen = useUiStore((state) => state.setCaptureOpen);
  const { toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const notes = useAppStore((state) => state.notes);
  const goals = useAppStore((state) => state.goals);
  const ideas = useAppStore((state) => state.ideas);
  const habits = useAppStore((state) => state.habits);
  const responsibilities = useAppStore((state) => state.responsibilities);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const go = (href: string) => () => router.push(href);
    const colorFor = (responsibilityId?: string) => {
      const responsibility = responsibilities.find((item) => item.id === responsibilityId);
      return responsibility ? getTone(responsibility.color).hex : undefined;
    };

    const navigation: PaletteEntry[] = ALL_NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      title: item.label,
      group: "Go to",
      icon: item.icon,
      run: go(item.href),
    }));
    const actions: PaletteEntry[] = [
      { id: "action-task", title: "New task", group: "Actions", icon: Plus, hint: "C", run: () => setCaptureOpen(true) },
      { id: "action-capture", title: "Capture for review", group: "Actions", icon: Plus, run: go("/capture") },
      { id: "action-theme", title: "Toggle dark mode", group: "Actions", icon: Moon, run: toggleTheme },
    ];

    if (!q) return [...navigation, ...actions];

    const matches = (text: string) => text.toLowerCase().includes(q);
    return [
      ...navigation.filter((entry) => matches(entry.title)),
      ...actions.filter((entry) => matches(entry.title)),
      ...tasks
        .filter((item) => matches(`${item.title} ${item.description ?? ""}`))
        .slice(0, 6)
        .map((item) => ({
          id: `task-${item.id}`,
          title: item.title,
          group: "Tasks",
          hint: item.status === "done" ? "Done" : item.dueAt ? new Date(item.dueAt).toLocaleDateString([], { month: "short", day: "numeric" }) : undefined,
          color: colorFor(item.responsibilityId),
          run: go(`/task/${item.id}`),
        })),
      ...calendarItems
        .filter((item) => matches(`${item.title} ${item.location ?? ""} ${item.notes ?? ""}`))
        .slice(0, 6)
        .map((item) => ({
          id: `event-${item.id}`,
          title: item.title,
          group: "Calendar",
          hint: new Date(item.startsAt).toLocaleDateString([], { month: "short", day: "numeric" }),
          color: colorFor(item.responsibilityId),
          run: go(`/event/${item.id}`),
        })),
      ...notes
        .filter((item) => matches(`${item.title} ${item.body}`))
        .slice(0, 5)
        .map((item) => ({ id: `note-${item.id}`, title: item.title || "Untitled", group: "Notes", color: colorFor(item.responsibilityId), run: go(`/notes/${item.id}`) })),
      ...goals
        .filter((item) => matches(item.title))
        .slice(0, 4)
        .map((item) => ({ id: `goal-${item.id}`, title: item.title, group: "Goals", color: colorFor(item.responsibilityId), run: go("/goals") })),
      ...ideas
        .filter((item) => matches(`${item.title} ${item.notes ?? ""}`))
        .slice(0, 4)
        .map((item) => ({ id: `idea-${item.id}`, title: item.title, group: "Ideas", color: colorFor(item.responsibilityId), run: go("/ideas") })),
      ...habits
        .filter((item) => matches(item.title))
        .slice(0, 4)
        .map((item) => ({ id: `habit-${item.id}`, title: item.title, group: "Habits", color: colorFor(item.responsibilityId), run: go("/habits") })),
      ...responsibilities
        .filter((item) => !item.archivedAt && matches(item.name))
        .slice(0, 4)
        .map((item) => ({ id: `label-${item.id}`, title: item.name, group: "Labels", color: getTone(item.color).hex, run: go(`/r/${item.id}`) })),
    ];
  }, [calendarItems, goals, habits, ideas, notes, query, responsibilities, router, setCaptureOpen, tasks, toggleTheme]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function runEntry(idx: number) {
    const entry = entries[idx];
    if (!entry) return;
    setOpen(false);
    entry.run();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((i) => (entries.length ? (i + 1) % entries.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((i) => (entries.length ? (i - 1 + entries.length) % entries.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runEntry(activeIdx);
    }
  }

  let lastGroup = "";

  return (
    <Overlay open={open} onClose={() => setOpen(false)} label="Command palette">
      <div className="flex h-12 items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or jump to…"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
          aria-label="Search"
        />
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-subtle sm:block">Esc</kbd>
      </div>
      <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
        {entries.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>}
        {entries.map((entry, idx) => {
          const showGroup = entry.group !== lastGroup;
          lastGroup = entry.group;
          const Icon = entry.icon;
          return (
            <div key={entry.id}>
              {showGroup && <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium text-subtle">{entry.group}</p>}
              <button
                type="button"
                data-idx={idx}
                onClick={() => runEntry(idx)}
                onMouseMove={() => setActiveIdx(idx)}
                className={cn(
                  "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm transition-colors",
                  idx === activeIdx ? "bg-hover text-ink" : "text-ink/90"
                )}
              >
                {Icon ? (
                  <Icon className="size-4 shrink-0 text-muted" />
                ) : (
                  <span className="grid size-4 shrink-0 place-items-center">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color ?? "rgb(var(--color-subtle))" }} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                {entry.hint && <span className="shrink-0 text-xs text-subtle">{entry.hint}</span>}
                {idx === activeIdx && <CornerDownLeft className="size-3.5 shrink-0 text-subtle" />}
              </button>
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}
