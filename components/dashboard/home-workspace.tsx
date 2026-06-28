"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, Clock, FileUp, Mic, Plus } from "lucide-react";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { TaskList } from "@/components/dashboard/task-list";
import { useAppStore } from "@/lib/stores/app-store";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TODAY = "2026-05-07";

function dateOnly(value?: string) {
  return value?.slice(0, 10);
}

export function HomeWorkspace() {
  const calendarItems = useAppStore((state) => state.calendarItems);
  const tasks = useAppStore((state) => state.tasks);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const notes = useAppStore((state) => state.notes);
  const lists = useAppStore((state) => state.lists);
  const addTask = useAppStore((state) => state.addTask);
  const addCalendarItem = useAppStore((state) => state.addCalendarItem);
  const addCaptureExtraction = useAppStore((state) => state.addCaptureExtraction);
  const toggleListItem = useAppStore((state) => state.toggleListItem);
  const [taskTitle, setTaskTitle] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("14:00");
  const [eventLocation, setEventLocation] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [responsibilityId, setResponsibilityId] = useState(responsibilities[0]?.id ?? "personal");
  const todaysEvents = useMemo(
    () => calendarItems.filter((item) => dateOnly(item.startsAt) === TODAY).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [calendarItems]
  );
  const dueToday = useMemo(
    () => tasks.filter((task) => dateOnly(task.dueAt) === TODAY && task.status !== "done"),
    [tasks]
  );
  const upcoming = useMemo(
    () =>
      [
        ...calendarItems
          .filter((item) => dateOnly(item.startsAt) && dateOnly(item.startsAt)! > TODAY)
          .map((item) => ({ id: item.id, kind: "event" as const, title: item.title, when: item.startsAt, responsibilityId: item.responsibilityId, href: `/event/${item.id}` })),
        ...tasks
          .filter((task) => dateOnly(task.dueAt) && dateOnly(task.dueAt)! > TODAY && task.status !== "done")
          .map((task) => ({ id: task.id, kind: "task" as const, title: task.title, when: task.dueAt!, responsibilityId: task.responsibilityId, href: `/task/${task.id}` }))
      ]
        .sort((a, b) => a.when.localeCompare(b.when))
        .slice(0, 5),
    [calendarItems, tasks]
  );

  function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) {
      return;
    }
    addTask({
      title: taskTitle.trim(),
      responsibilityId,
      dueAt: `${TODAY}T17:00:00-07:00`
    });
    setTaskTitle("");
  }

  function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventTitle.trim()) {
      return;
    }
    const [hour, minute] = eventTime.split(":").map(Number);
    const endHour = String(hour + 1).padStart(2, "0");
    const endMinute = String(minute).padStart(2, "0");
    addCalendarItem({
      title: eventTitle.trim(),
      type: "app_event",
      responsibilityId,
      startsAt: `${TODAY}T${eventTime}:00-07:00`,
      endsAt: `${TODAY}T${endHour}:${endMinute}:00-07:00`,
      location: eventLocation.trim() || undefined,
      source: "app"
    });
    setEventTitle("");
    setEventLocation("");
  }

  function submitCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captureText.trim()) {
      return;
    }
    addCaptureExtraction({ text: captureText.trim(), source: "typed", responsibilityId });
    setCaptureText("");
  }

  return (
    <div className="-mx-4 -mt-4 min-h-[calc(100dvh-96px)] border-y border-line bg-paper px-3 py-3 sm:-mx-6 sm:px-5 lg:-ml-[24px] lg:-mr-8 lg:-mt-5">
      <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <CalendarDays className="size-4" />
            Thursday, May 7
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-normal leading-tight text-ink">Today</h1>
            <div className="flex flex-wrap gap-2 text-sm text-muted">
            <span>{todaysEvents.length} events</span>
            <span>·</span>
            <span>{dueToday.length} task due</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calendar" className="rounded-full border border-line px-3 py-2 text-sm text-ink transition hover:bg-line">
            Open calendar
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-ink">Schedule</h2>
            <Link href="/calendar" className="text-xs text-blue hover:underline">Open day view</Link>
          </div>
          <DayTimeline />
        </main>

        <aside className="space-y-3">
          <section className="overflow-hidden rounded-lg border border-line bg-[#242528]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-medium text-ink">Today Tasks</h2>
              <Link href="/todos" className="text-xs text-blue hover:underline">All tasks</Link>
            </div>
            <TaskList quickAdd todayOnly />
          </section>

          <section className="rounded-lg border border-line bg-[#242528] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink">Add Something</h2>
              <Link href="/capture" className="text-xs text-blue hover:underline">Open capture</Link>
            </div>
            <select
              value={responsibilityId}
              onChange={(event) => setResponsibilityId(event.target.value)}
              className="mb-3 h-9 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-blue"
            >
              {responsibilities.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <form onSubmit={submitTask} className="mb-2 flex gap-2">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task for today"
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
              />
              <button className="grid size-10 place-items-center rounded-lg bg-blue text-white disabled:opacity-40" disabled={!taskTitle.trim()} aria-label="Add task">
                <Plus className="size-4" />
              </button>
            </form>
            <form onSubmit={submitEvent} className="mb-2 grid gap-2">
              <div className="grid grid-cols-[1fr_92px] gap-2">
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Event or interview"
                  className="min-w-0 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
                />
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  className="rounded-lg border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-blue"
                />
              </div>
              <div className="grid grid-cols-[1fr_40px] gap-2">
                <input
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  placeholder="Location"
                  className="min-w-0 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
                />
                <button className="grid size-10 place-items-center rounded-lg bg-paper text-muted transition hover:bg-line hover:text-ink disabled:opacity-40" disabled={!eventTitle.trim()} aria-label="Add event">
                  <Clock className="size-4" />
                </button>
              </div>
            </form>
            <form onSubmit={submitCapture} className="grid gap-2">
              <div className="flex gap-2">
                <input
                  value={captureText}
                  onChange={(event) => setCaptureText(event.target.value)}
                  placeholder='Try "add deodorant to grocery list"'
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
                />
                <button className="grid size-10 place-items-center rounded-lg bg-mint text-white disabled:opacity-40" disabled={!captureText.trim()} aria-label="Parse capture">
                  <Mic className="size-4" />
                </button>
              </div>
              <Link href="/capture" className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-ink">
                <FileUp className="size-3" />
                Upload, paste, or voice capture opens the review flow
              </Link>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-[#242528]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-medium text-ink">Upcoming</h2>
              <Link href="/calendar" className="text-xs text-blue hover:underline">Calendar</Link>
            </div>
            <div className="divide-y divide-line">
              {upcoming.map((item) => {
                const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
                return (
                  <Link key={`${item.kind}-${item.id}`} href={item.href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-line">
                    <span className={cn("size-2.5 shrink-0 rounded-full", tone.dot)} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted">{new Date(item.when).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                  </Link>
                );
              })}
              {!upcoming.length && <p className="px-4 py-3 text-sm text-muted">Nothing coming up.</p>}
            </div>
          </section>

          <details className="group rounded-lg border border-line bg-[#242528]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-medium text-ink">Recent Notes</h2>
                <p className="mt-0.5 text-xs text-muted">{notes.length} saved</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/notes" className="text-xs text-blue hover:underline" onClick={(event) => event.stopPropagation()}>All notes</Link>
                <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
              </div>
            </summary>
            <div className="space-y-2 border-t border-line p-3">
              {notes.slice(0, 3).map((note) => {
                const responsibility = responsibilities.find((item) => item.id === note.responsibilityId);
                const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
                return (
                  <Link key={note.id} href={`/r/${note.responsibilityId}`} className="block rounded-md border border-line bg-paper p-3 transition hover:bg-line">
                    <p className="truncate text-sm text-ink">{note.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{note.body}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <span className={cn("size-1.5 rounded-full", tone.dot)} />
                      {responsibility?.name ?? "Unsorted"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </details>

          <details className="group rounded-lg border border-line bg-[#242528]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-sm font-medium text-ink">Recent Lists</h2>
                <p className="mt-0.5 text-xs text-muted">{lists.length} lists</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/lists" className="text-xs text-blue hover:underline" onClick={(event) => event.stopPropagation()}>All lists</Link>
                <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
              </div>
            </summary>
            <div className="space-y-3 border-t border-line p-3">
              {lists.slice(0, 3).map((list) => {
                const responsibility = responsibilities.find((item) => item.id === list.responsibilityId);
                const doneCount = list.items.filter((item) => item.done).length;
                return (
                  <div key={list.id} className="rounded-md border border-line bg-paper p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink">{list.title}</p>
                      <span className="shrink-0 text-xs text-muted">{doneCount}/{list.items.length}</span>
                    </div>
                    <div className="space-y-1">
                      {list.items.slice(0, 4).map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleListItem(list.id, item.id)}
                            className="size-3 rounded border-line bg-paper accent-[#4285f4]"
                          />
                          <span className={cn(item.done && "line-through opacity-60")}>{item.title}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted">{responsibility?.name}</p>
                  </div>
                );
              })}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
