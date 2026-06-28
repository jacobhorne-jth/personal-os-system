"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Search } from "lucide-react";
import { FullCalendarBoard } from "@/components/calendar/full-calendar-board";
import { localDateKey, formatDateHeading } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

const dateFilters = ["Today", "All"] as const;

function taskDate(taskDate?: string) {
  return taskDate?.slice(0, 10);
}

function matchesDate(filter: (typeof dateFilters)[number], today: string, dueAt?: string) {
  const due = taskDate(dueAt);
  if (filter === "All") return true;
  return due === today;
}

export function HomeWorkspaceV2() {
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const addTask = useAppStore((state) => state.addTask);

  const [dateFilter, setDateFilter] = useState<(typeof dateFilters)[number]>("Today");
  const [responsibilityFilter, setResponsibilityFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [quickResponsibility, setQuickResponsibility] = useState(responsibilities[0]?.id ?? "");
  const today = localDateKey();
  const todayHeading = formatDateHeading();

  const filteredTasks = tasks.filter((task) => {
    const statusMatch = task.status !== "done";
    const responsibilityMatch = responsibilityFilter === "all" ? true : responsibilityFilter === "inbox" ? !task.responsibilityId : task.responsibilityId === responsibilityFilter;
    return statusMatch && responsibilityMatch && matchesDate(dateFilter, today, task.dueAt);
  });

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      responsibilityId: quickResponsibility || undefined,
      dueAt: `${today}T17:00:00`,
      labels: []
    });
    setTitle("");
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-[#1f1f1f] xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-h-0 min-w-0">
        <FullCalendarBoard />
      </main>

      <aside className="hidden min-h-0 border-l border-[#303134] bg-[#1f1f1f] xl:flex xl:flex-col">
        <div className="shrink-0 border-b border-[#303134] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#e8eaed]">{todayHeading}</p>
            <span className="text-xs text-[#9aa0a6]">{filteredTasks.length} visible</span>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-b border-[#303134] p-4">
          <div className="grid grid-cols-2 gap-2">
            {dateFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-medium transition",
                  dateFilter === filter
                    ? "border-blue bg-blue/15 text-blue"
                    : "border-[#3c4043] text-[#bdc1c6] hover:text-[#e8eaed]"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-md border border-[#3c4043] bg-[#282a2d] px-2">
            <Search className="size-3.5 text-[#bdc1c6]" />
            <select value={responsibilityFilter} onChange={(event) => setResponsibilityFilter(event.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#bdc1c6] outline-none">
              <option value="all">All responsibilities</option>
              <option value="inbox">Inbox only</option>
              {responsibilities.map((responsibility) => (
                <option key={responsibility.id} value={responsibility.id}>{responsibility.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {filteredTasks.length === 0 ? (
            <p className="p-5 text-sm text-[#9aa0a6]">No tasks match these filters.</p>
          ) : (
            <div className="divide-y divide-[#303134]">
              {filteredTasks.map((task) => {
                const responsibility = responsibilities.find((item) => item.id === task.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
                return (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#282a2d]">
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.status === "done" ? "Reopen task" : "Complete task"}
                      className={cn("mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full border-[1.5px] transition hover:opacity-60", task.status === "done" && "bg-mint")}
                      style={{ borderColor: task.status === "done" ? "#34a853" : tone.hex }}
                    >
                      {task.status === "done" && <CheckCircle2 className="size-3 text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#e8eaed]">{task.title}</p>
                      {task.description && <p className="mt-0.5 line-clamp-1 text-xs text-[#9aa0a6]">{task.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#9aa0a6]">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: tone.hex }} />
                          {responsibility?.name ?? "Inbox"}
                        </span>
                        <span>{task.priority}</span>
                        {task.labels?.slice(0, 2).map((label) => <span key={label}>@{label}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleAdd} className="shrink-0 border-t border-[#303134] bg-[#1f1f1f] p-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#3c4043] bg-[#282a2d] px-3">
            <Plus className="size-4 text-[#bdc1c6]" />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Quick add task"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa0a6]"
            />
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <select value={quickResponsibility} onChange={(event) => setQuickResponsibility(event.target.value)} className="h-9 rounded-md border border-[#3c4043] bg-[#282a2d] px-2 text-xs text-[#bdc1c6] outline-none focus:border-blue">
              <option value="">Inbox</option>
              {responsibilities.map((responsibility) => (
                <option key={responsibility.id} value={responsibility.id}>{responsibility.name}</option>
              ))}
            </select>
            <button disabled={!title.trim()} className="h-9 rounded-md bg-blue px-3 text-xs font-medium text-white disabled:opacity-40">
              Add
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
