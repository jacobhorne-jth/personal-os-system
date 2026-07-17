"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/stores/app-store";
import { ColorBadge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { responsibilityTone } from "@/lib/theme";
import type { CalendarItemType } from "@/lib/types/domain";
import { cn, formatTime } from "@/lib/utils";

const eventTypes: CalendarItemType[] = ["app_event", "deadline", "time_block", "reminder", "time_log", "task_due"];

function toDateTimeLocal(value: string) {
  return value.slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return `${value}:00-07:00`;
}

export function EventDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const event = useAppStore((state) => state.calendarItems.find((item) => item.id === id));
  const responsibilities = useAppStore((state) => state.responsibilities);
  const updateCalendarItem = useAppStore((state) => state.updateCalendarItem);
  const deleteCalendarItem = useAppStore((state) => state.deleteCalendarItem);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [responsibilityId, setResponsibilityId] = useState("");
  const [type, setType] = useState<CalendarItemType>("app_event");

  useEffect(() => {
    if (!event) {
      return;
    }
    setTitle(event.title);
    setStartsAt(toDateTimeLocal(event.startsAt));
    setEndsAt(toDateTimeLocal(event.endsAt));
    setLocation(event.location ?? "");
    setNotes(event.notes ?? "");
    setResponsibilityId(event.responsibilityId);
    setType(event.type);
  }, [event]);

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-panel p-6 text-sm text-muted">
        Calendar item not found. It may have been removed from local state.
      </div>
    );
  }

  const responsibility = responsibilities.find((item) => item.id === event.responsibilityId);
  const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;

  function save(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!title.trim()) {
      return;
    }
    updateCalendarItem(id, {
      title: title.trim(),
      startsAt: fromDateTimeLocal(startsAt),
      endsAt: fromDateTimeLocal(endsAt),
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      responsibilityId,
      type
    });
  }

  function remove() {
    deleteCalendarItem(id);
    router.push("/calendar");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="relative overflow-hidden rounded-lg border border-line bg-panel p-5">
        <span className={cn("absolute inset-x-0 top-0 h-1", tone.dot)} />
        {responsibility && <ColorBadge color={responsibility.color}>{responsibility.name}</ColorBadge>}
        <h1 className="mt-3 text-3xl font-normal text-ink">{event.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-line px-2 py-1">
            <Clock className="size-3" />
            {formatTime(event.startsAt)} - {formatTime(event.endsAt)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-line px-2 py-1">
              <MapPin className="size-3" />
              {event.location}
            </span>
          )}
        </div>
      </header>

      <Panel title="Edit Event" eyebrow="calendar item">
        <form onSubmit={save} className="grid gap-3 p-4 text-sm md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Starts</span>
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Ends</span>
            <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Category</span>
            <select value={responsibilityId} onChange={(event) => setResponsibilityId(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue">
              {responsibilities.filter((resp) => !resp.archivedAt).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Type</span>
            <select value={type} onChange={(event) => setType(event.target.value as CalendarItemType)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue">
              {eventTypes.map((item) => (
                <option key={item} value={item}>{item.replace("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-ink outline-none focus:border-blue" />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-muted">Description</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-32 w-full resize-y rounded-lg border border-line bg-paper p-3 leading-6 text-ink outline-none focus:border-blue" />
          </label>
          <div className="flex flex-col gap-2 border-t border-line pt-3 md:col-span-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={remove} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-coral px-4 text-sm text-coral transition hover:bg-coral hover:text-white">
              <Trash2 className="size-4" />
              Delete
            </button>
            <button disabled={!title.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue px-4 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50">
              <Calendar className="size-4" />
              Save changes
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
