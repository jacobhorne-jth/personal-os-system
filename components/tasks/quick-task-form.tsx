"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

export function QuickTaskForm({ responsibilityId, compact = false }: { responsibilityId?: string; compact?: boolean }) {
  const responsibilities = useAppStore((state) => state.responsibilities);
  const addTask = useAppStore((state) => state.addTask);
  const [title, setTitle] = useState("");
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(responsibilityId ?? responsibilities[0]?.id ?? "school");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    addTask({
      title: title.trim(),
      responsibilityId: responsibilityId ?? selectedResponsibilityId
    });
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-2 border-b border-line p-3", !compact && "sm:grid-cols-[1fr_150px_auto]")}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task"
        className="h-9 rounded-full border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
      />
      {!responsibilityId && (
        <select
          value={selectedResponsibilityId}
          onChange={(event) => setSelectedResponsibilityId(event.target.value)}
          className="h-9 rounded-full border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
        >
          {responsibilities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}
      <button
        disabled={!title.trim()}
        className="flex h-9 items-center justify-center gap-2 rounded-full bg-blue px-4 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" />
        Add
      </button>
    </form>
  );
}
