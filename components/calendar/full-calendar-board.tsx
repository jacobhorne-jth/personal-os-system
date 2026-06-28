"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg, DateSelectArg, EventClickArg, EventDropArg, EventContentArg } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { capitalOneSeriesId, capitalOneWorkBlocks, filterGeneratedCalendarItems } from "@/lib/calendar-generated";
import { toFullCalendarEvent } from "@/lib/queries/calendar";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { responsibilityTone } from "@/lib/theme";
import type { CalendarItem, CalendarItemType } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type DraftEvent = {
  startsAt: string;
  endsAt: string;
  title: string;
  location: string;
  notes: string;
  responsibilityId: string;
  type: CalendarItemType;
};

const creatableTypes: Array<{ type: CalendarItemType; label: string }> = [
  { type: "app_event", label: "Event" },
  { type: "time_block", label: "Time block" },
  { type: "deadline", label: "Deadline" },
  { type: "reminder", label: "Reminder" },
  { type: "time_log", label: "Time log" }
];

const demoCalendarIdPattern = /^(evt-(capital-one|gym|leetcode)-|evt-(?:[1-9]|1[0-2])$)/;

export function FullCalendarBoard({ fullChrome = false }: { fullChrome?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendarRef = useRef<FullCalendar | null>(null);
  const handledQueryDraft = useRef(false);
  const [calendarTitle, setCalendarTitle] = useState(() => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  const [draftEvent, setDraftEvent] = useState<DraftEvent | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const { calendarView, setCalendarView, visibleOverlays, hiddenResponsibilities } = useUiStore();
  const calendarItems = useAppStore((state) => state.calendarItems);
  const hiddenCalendarEventIds = useAppStore((state) => state.hiddenCalendarEventIds);
  const hiddenCalendarSeries = useAppStore((state) => state.hiddenCalendarSeries);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const addCalendarItem = useAppStore((state) => state.addCalendarItem);
  const deleteCalendarItem = useAppStore((state) => state.deleteCalendarItem);
  const hideCalendarEvent = useAppStore((state) => state.hideCalendarEvent);
  const hideCalendarSeries = useAppStore((state) => state.hideCalendarSeries);
  const moveCalendarItem = useAppStore((state) => state.moveCalendarItem);
  const effectiveView = !fullChrome && calendarView === "month" ? "week" : calendarView;
  const initialView = effectiveView === "month" ? "dayGridMonth" : effectiveView === "week" ? "timeGridWeek" : "timeGridDay";
  const availableViews = fullChrome ? (["day", "week", "month"] as const) : (["day", "week"] as const);

  const generatedItems = useMemo(() => {
    return filterGeneratedCalendarItems(capitalOneWorkBlocks(), hiddenCalendarEventIds, hiddenCalendarSeries);
  }, [hiddenCalendarEventIds, hiddenCalendarSeries]);

  const visibleItems = [
    ...generatedItems,
    ...calendarItems.filter((item) => !demoCalendarIdPattern.test(item.id))
  ];

  const events = visibleItems
    .filter((item) =>
      visibleOverlays.includes(item.type) &&
      !hiddenResponsibilities.includes(item.responsibilityId)
    )
    .map((item) => {
      const responsibility = responsibilities.find((r) => r.id === item.responsibilityId);
      const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
      return {
        ...toFullCalendarEvent(item),
        editable: !item.id.startsWith(`${capitalOneSeriesId}-`),
        backgroundColor: tone.hex,
        borderColor: tone.hex,
        textColor: tone.eventText,
        extendedProps: {
          ...toFullCalendarEvent(item).extendedProps,
          generatedSeriesId: item.id.startsWith(`${capitalOneSeriesId}-`) ? capitalOneSeriesId : undefined
        }
      };
    });

  useEffect(() => {
    if (!fullChrome || handledQueryDraft.current) return;
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!start || !end) return;
    handledQueryDraft.current = true;
    setDraftEvent({
      startsAt: start,
      endsAt: end,
      title: "",
      location: "",
      notes: "",
      responsibilityId: responsibilities[0]?.id ?? "school",
      type: "app_event"
    });
  }, [fullChrome, responsibilities, searchParams]);

  function handleSelect(selection: DateSelectArg) {
    if (!fullChrome) {
      router.push(`/calendar?start=${encodeURIComponent(selection.startStr)}&end=${encodeURIComponent(selection.endStr)}`);
      return;
    }
    setCreateMode(false);
    setSelectedItem(null);
    setDraftEvent({
      startsAt: selection.startStr,
      endsAt: selection.endStr,
      title: "",
      location: "",
      notes: "",
      responsibilityId: responsibilities[0]?.id ?? "school",
      type: "app_event"
    });
  }

  function handleEventClick(event: EventClickArg) {
    const item = visibleItems.find((calendarItem) => calendarItem.id === event.event.id);
    if (!item) return;
    if (!fullChrome) {
      router.push(`/calendar?event=${encodeURIComponent(item.id)}`);
      return;
    }
    setDraftEvent(null);
    setCreateMode(false);
    setSelectedItem(item);
  }

  function handleEventDrop(event: EventDropArg) {
    if (event.event.id.startsWith(`${capitalOneSeriesId}-`)) {
      event.revert();
      return;
    }
    if (event.event.start) {
      moveCalendarItem(event.event.id, event.event.start.toISOString(), event.event.end?.toISOString());
    }
  }

  function handleEventResize(event: EventResizeDoneArg) {
    if (event.event.id.startsWith(`${capitalOneSeriesId}-`)) {
      event.revert();
      return;
    }
    if (event.event.start) {
      moveCalendarItem(event.event.id, event.event.start.toISOString(), event.event.end?.toISOString());
    }
  }

  function changeView(view: "day" | "week" | "month") {
    const nextView = view === "month" ? "dayGridMonth" : view === "week" ? "timeGridWeek" : "timeGridDay";
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(nextView);
  }

  function deleteSelectedEvent(mode: "this" | "all" | "following") {
    if (!selectedItem) return;
    if (selectedItem.id.startsWith(`${capitalOneSeriesId}-`)) {
      if (mode === "this") {
        hideCalendarEvent(selectedItem.id);
      } else if (mode === "all") {
        hideCalendarSeries(capitalOneSeriesId, "all");
      } else {
        hideCalendarSeries(capitalOneSeriesId, "following", selectedItem.startsAt);
      }
    } else {
      deleteCalendarItem(selectedItem.id);
    }
    setSelectedItem(null);
  }

  function goToday() {
    calendarRef.current?.getApi().today();
  }

  function moveDate(direction: "prev" | "next") {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    direction === "prev" ? api.prev() : api.next();
  }

  function handleDatesSet(dateInfo: DatesSetArg) {
    if (dateInfo.view.type === "timeGridWeek") {
      const start = dateInfo.start;
      const end = new Date(dateInfo.end);
      end.setDate(end.getDate() - 1);
      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();
      const startMonth = start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = end.toLocaleDateString("en-US", { month: "short" });
      setCalendarTitle(sameMonth ? `${startMonth} ${start.getFullYear()}` : `${startMonth} - ${endMonth} ${sameYear ? end.getFullYear() : `${start.getFullYear()} - ${end.getFullYear()}`}`);
      return;
    }
    setCalendarTitle(dateInfo.view.currentStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  }

  function renderEventContent(arg: EventContentArg) {
    const { event, view } = arg;
    const location = event.extendedProps.location as string | undefined;

    if (event.allDay || view.type === "dayGridMonth") {
      return (
        <div style={{ padding: "1px 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, fontSize: 11 }}>
          {event.title}
        </div>
      );
    }

    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const timeRange = event.start && event.end ? `${fmt(event.start)} – ${fmt(event.end)}` : event.start ? fmt(event.start) : "";

    const compact = !fullChrome;

    return (
      <div style={{ padding: compact ? "6px 8px" : "8px 10px", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: compact ? 1 : 2 }}>
        <span style={{ color: "#1f1f1f", fontWeight: 700, fontSize: compact ? 12 : 14, lineHeight: 1.14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: compact ? 2 : 2, WebkitBoxOrient: "vertical" }}>
          {event.title}
        </span>
        <span style={{ color: "#1f1f1f", fontSize: compact ? 11 : 13, opacity: 0.92, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {timeRange}{location ? `, ${location}` : ""}
        </span>
        {location && (
          <span className="sr-only" style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {location}
          </span>
        )}
      </div>
    );
  }

  function renderDayHeader(arg: { date: Date; isToday: boolean }) {
    const weekday = arg.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const day = arg.date.getDate();

    return (
      <div className="gcal-day-head">
        <div className="gcal-day-name">{weekday}</div>
        <div className={cn("gcal-day-number", arg.isToday && "gcal-day-number-today")}>{day}</div>
      </div>
    );
  }

  function renderSlotLabel(arg: { date: Date }) {
    return arg.date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true
    }).replace(" ", " ");
  }

  function formatDraftTime(draft: DraftEvent) {
    const start = new Date(draft.startsAt);
    const end = new Date(draft.endsAt);
    return `${start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  function saveDraftEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftEvent || !draftEvent.title.trim()) return;
    addCalendarItem({
      title: draftEvent.title.trim(),
      type: draftEvent.type,
      responsibilityId: draftEvent.responsibilityId,
      startsAt: draftEvent.startsAt,
      endsAt: draftEvent.endsAt,
      location: draftEvent.location.trim() || undefined,
      notes: draftEvent.notes.trim() || undefined,
      source: "app"
    });
    setDraftEvent(null);
    calendarRef.current?.getApi().unselect();
  }

  return (
    <div className={cn("calendar-board gcal-board gcal-board-compact relative flex h-full min-h-0 flex-col", fullChrome && "gcal-board-full")}>
      <div className="gcal-topbar">
        <div className="gcal-nav-controls">
          <button
            onClick={goToday}
            className="gcal-today-button"
          >
            Today
          </button>
          <button
            onClick={() => moveDate("prev")}
            className="gcal-icon-button"
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => moveDate("next")}
            className="gcal-icon-button"
            aria-label="Next"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <h2 className="gcal-title">{calendarTitle}</h2>

        <div className="gcal-actions">
          <div className="gcal-view-tabs" style={{ gridTemplateColumns: `repeat(${availableViews.length}, minmax(74px, 1fr))` }} aria-label="Calendar view">
            {availableViews.map((view) => (
              <button key={view} onClick={() => changeView(view)} className={cn(effectiveView === view && "active")}>
                {view}
              </button>
            ))}
          </div>
          {fullChrome && (
            <button
              onClick={() => {
                setSelectedItem(null);
                setDraftEvent(null);
                setCreateMode(true);
              }}
              className="gcal-create-button"
            >
              Create event
            </button>
          )}
        </div>
      </div>

      <div className="gcal-main">
        <div className="gcal-calendar-shell">
          {createMode && (
            <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-[#3c4043] bg-[#282a2d] px-4 py-2 text-sm text-[#e8eaed] shadow-lift">
              Drag across the calendar to create an event
            </div>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={false}
            timeZone="local"
            height={effectiveView === "month" ? "100%" : "100%"}
            nowIndicator
            selectable
            selectMirror
            editable
            eventResizableFromStart
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="24:00:00"
            scrollTime="07:00:00"
            scrollTimeReset={false}
            slotDuration="01:00:00"
            snapDuration="00:15:00"
            slotLabelInterval="01:00"
            slotLabelContent={renderSlotLabel}
            dayHeaderContent={renderDayHeader}
            events={events}
            eventContent={renderEventContent}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={handleDatesSet}
          />
        </div>
      </div>

      {draftEvent && (
        <div className="absolute left-3 top-14 z-30 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#3c4043] bg-[#282a2d] shadow-lift">
          <form onSubmit={saveDraftEvent}>
            <div className="px-5 pt-5 pb-4">
              <input
                autoFocus
                value={draftEvent.title}
                onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })}
                placeholder="Add title"
                className="h-10 w-full border-b border-[#5f6368] bg-transparent text-lg text-[#e8eaed] outline-none placeholder:text-[#5f6368] focus:border-[#4285f4]"
              />
              <p className="mt-3 text-sm text-[#9aa0a6]">{formatDraftTime(draftEvent)}</p>
            </div>
            <div className="space-y-2.5 px-5 pb-4">
              <input
                value={draftEvent.location}
                onChange={(e) => setDraftEvent({ ...draftEvent, location: e.target.value })}
                placeholder="Add location"
                className="h-9 w-full rounded-lg border border-[#3c4043] bg-[#202124] px-3 text-sm text-[#e8eaed] outline-none placeholder:text-[#5f6368] focus:border-[#4285f4]"
              />
              <select
                value={draftEvent.responsibilityId}
                onChange={(e) => setDraftEvent({ ...draftEvent, responsibilityId: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#3c4043] bg-[#202124] px-3 text-sm text-[#e8eaed] outline-none focus:border-[#4285f4]"
              >
                {responsibilities.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {creatableTypes.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setDraftEvent({ ...draftEvent, type: item.type })}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition",
                      draftEvent.type === item.type
                        ? "bg-[#4285f4]/20 text-[#4285f4]"
                        : "border border-[#3c4043] text-[#9aa0a6] hover:text-[#e8eaed]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#3c4043] px-5 py-3">
              <button
                type="button"
                onClick={() => { setDraftEvent(null); calendarRef.current?.getApi().unselect(); }}
                className="rounded-full px-4 py-2 text-sm text-[#9aa0a6] transition hover:bg-[#3c4043] hover:text-[#e8eaed]"
              >
                Cancel
              </button>
              <button
                disabled={!draftEvent.title.trim()}
                className="rounded-full bg-[#4285f4] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5094f5] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedItem && (
        <div className="absolute right-4 top-16 z-30 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#3c4043] bg-[#282a2d] shadow-lift">
          <div className="px-5 py-4">
            <p className="text-base font-semibold text-[#e8eaed]">{selectedItem.title}</p>
            <p className="mt-1 text-sm text-[#9aa0a6]">{formatDraftTime({ ...selectedItem, title: selectedItem.title, location: selectedItem.location ?? "", notes: selectedItem.notes ?? "" })}</p>
          </div>
          <div className="border-t border-[#3c4043] p-2">
            {selectedItem.id.startsWith(`${capitalOneSeriesId}-`) ? (
              <>
                <button onClick={() => deleteSelectedEvent("this")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#3c4043]">
                  <Trash2 className="size-4 text-[#9aa0a6]" />
                  Delete this event
                </button>
                <button onClick={() => deleteSelectedEvent("following")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#3c4043]">
                  <Trash2 className="size-4 text-[#9aa0a6]" />
                  Delete this and following events
                </button>
                <button onClick={() => deleteSelectedEvent("all")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#3c4043]">
                  <Trash2 className="size-4 text-[#9aa0a6]" />
                  Delete all events
                </button>
              </>
            ) : (
              <button onClick={() => deleteSelectedEvent("this")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#e8eaed] transition hover:bg-[#3c4043]">
                <Trash2 className="size-4 text-[#9aa0a6]" />
                Delete event
              </button>
            )}
            <button onClick={() => setSelectedItem(null)} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-[#9aa0a6] transition hover:bg-[#3c4043] hover:text-[#e8eaed]">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
