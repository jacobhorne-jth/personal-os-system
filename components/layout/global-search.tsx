"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const tasks = useAppStore((state) => state.tasks);
  const calendarItems = useAppStore((state) => state.calendarItems);
  const notes = useAppStore((state) => state.notes);
  const responsibilities = useAppStore((state) => state.responsibilities);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    return [
      ...tasks
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: `/task/${item.id}`, kind: "Task", responsibilityId: item.responsibilityId })),
      ...calendarItems
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title, href: `/event/${item.id}`, kind: "Calendar", responsibilityId: item.responsibilityId })),
      ...notes
        .filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.title || "Untitled", href: `/notes/${item.id}`, kind: "Note", responsibilityId: item.responsibilityId })),
      ...responsibilities
        .filter((item) => item.name.toLowerCase().includes(q))
        .map((item) => ({ id: item.id, title: item.name, href: `/r/${item.id}`, kind: "Responsibility", responsibilityId: item.id }))
    ].slice(0, 8);
  }, [calendarItems, notes, query, responsibilities, tasks]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex h-10 items-center gap-2 rounded-lg bg-line px-3 text-sm text-muted transition focus-within:ring-1 focus-within:ring-blue">
        <Search className="size-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks, events, notes, files"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
        />
      </div>
      {query.trim() && (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-line bg-panel shadow-lift">
          {results.length ? (
            <div className="divide-y divide-line">
              {results.map((result) => {
                const responsibility = responsibilities.find((item) => item.id === result.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
                return (
                  <Link key={`${result.kind}-${result.id}`} href={result.href} onClick={() => setQuery("")} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-line">
                    <span className={cn("size-2 rounded-full", tone.dot)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{result.title}</span>
                    <span className="rounded-md bg-line px-2 py-1 text-[11px] text-muted">{result.kind}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="p-3 text-sm text-muted">No local results.</p>
          )}
        </div>
      )}
    </div>
  );
}
