"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const notes = useAppStore((state) => state.notes);
  const lists = useAppStore((state) => state.lists);
  const goals = useAppStore((state) => state.goals);
  const ideas = useAppStore((state) => state.ideas);
  const habits = useAppStore((state) => state.habits);
  const responsibilities = useAppStore((state) => state.responsibilities);

  // ⌘K / Ctrl+K focuses search from anywhere
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return [
      ...tasks
        .filter((item) => `${item.title} ${item.description ?? ""}`.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: `/task/${item.id}`, kind: "Task", responsibilityId: item.responsibilityId })),
      ...calendarItems
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: `/event/${item.id}`, kind: "Calendar", responsibilityId: item.responsibilityId })),
      ...notes
        .filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title || "Untitled", href: `/notes/${item.id}`, kind: "Note", responsibilityId: item.responsibilityId })),
      ...lists
        .filter((item) => `${item.title} ${item.items.map((entry) => entry.title).join(" ")}`.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: "/lists", kind: "List", responsibilityId: item.responsibilityId })),
      ...goals
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: "/goals", kind: "Goal", responsibilityId: item.responsibilityId })),
      ...ideas
        .filter((item) => `${item.title} ${item.notes ?? ""}`.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: "/ideas", kind: "Idea", responsibilityId: item.responsibilityId })),
      ...habits
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: "/habits", kind: "Habit", responsibilityId: item.responsibilityId })),
      ...responsibilities
        .filter((item) => item.name.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.name, href: `/r/${item.id}`, kind: "Responsibility", responsibilityId: item.id }))
    ].slice(0, 10);
  }, [calendarItems, goals, habits, ideas, lists, notes, query, responsibilities, tasks]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function openResult(idx: number) {
    const result = results[idx];
    if (!result) return;
    setQuery("");
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) {
      if (e.key === "Escape") setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      openResult(activeIdx);
    } else if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex h-10 items-center gap-2 rounded-lg bg-line px-3 text-sm text-muted transition focus-within:ring-1 focus-within:ring-blue">
        <Search className="size-4" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, events, notes, lists, goals…"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] text-muted sm:block">⌘K</kbd>
      </div>
      {query.trim() && (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-line bg-panel shadow-lift">
          {results.length ? (
            <div className="divide-y divide-line">
              {results.map((result, idx) => {
                const responsibility = responsibilities.find((item) => item.id === result.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
                return (
                  <button
                    key={`${result.kind}-${result.id}`}
                    onClick={() => openResult(idx)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                      idx === activeIdx ? "bg-line" : "hover:bg-line"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", tone.dot)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{result.title}</span>
                    <span className="rounded-md bg-line px-2 py-1 text-[11px] text-muted">{result.kind}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="p-3 text-sm text-muted">No results.</p>
          )}
        </div>
      )}
    </div>
  );
}
