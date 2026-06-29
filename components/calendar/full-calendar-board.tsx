"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg, DateSelectArg, EventClickArg, EventDropArg, EventContentArg } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight, FileText, MapPin, Pencil, Tags, Trash2, X } from "lucide-react";
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
  const [eventPanelMode, setEventPanelMode] = useState<"preview" | "edit">("preview");
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const { calendarView, setCalendarView, visibleOverlays, hiddenResponsibilities } = useUiStore();
  const calendarItems = useAppStore((state) => state.calendarItems);
  const hiddenCalendarEventIds = useAppStore((state) => state.hiddenCalendarEventIds);
  const hiddenCalendarSeries = useAppStore((state) => state.hiddenCalendarSeries);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const addCalendarItem = useAppStore((state) => state.addCalendarItem);
  const updateCalendarItem = useAppStore((state) => state.updateCalendarItem);
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

  const visibleItems = useMemo(() => {
    return [
      ...generatedItems,
      ...calendarItems.filter((item) => !demoCalendarIdPattern.test(item.id))
    ];
  }, [calendarItems, generatedItems]);

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
        editable: true,
        backgroundColor: tone.hex,
        borderColor: tone.hex,
        textColor: tone.eventText,
        extendedProps: {
          ...toFullCalendarEvent(item).extendedProps,
          generatedSeriesId: item.id.startsWith(`${capitalOneSeriesId}-`) ? capitalOneSeriesId : undefined
        }
      };
    });

  const initialDate = searchParams.get("start") ?? searchParams.get("date") ?? undefined;

  useEffect(() => {
    if (!fullChrome || handledQueryDraft.current) return;
    const eventId = searchParams.get("event");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (eventId) {
      const item = visibleItems.find((calendarItem) => calendarItem.id === eventId);
      if (!item) return;
      handledQueryDraft.current = true;
      calendarRef.current?.getApi().gotoDate(item.startsAt);
      setDraftEvent(null);
      setCreateMode(false);
      setSelectedItem(item);
      setEventPanelMode("preview");
      setDeleteMenuOpen(false);
      return;
    }
    if (!start || !end) return;
    handledQueryDraft.current = true;
    calendarRef.current?.getApi().gotoDate(start);
    setDraftEvent({
      startsAt: start,
      endsAt: end,
      title: "",
      location: "",
      notes: "",
      responsibilityId: responsibilities[0]?.id ?? "school",
      type: "app_event"
    });
  }, [fullChrome, responsibilities, searchParams, visibleItems]);

  function handleSelect(selection: DateSelectArg) {
    if (!fullChrome) {
      router.push(`/calendar?start=${encodeURIComponent(selection.startStr)}&end=${encodeURIComponent(selection.endStr)}&date=${encodeURIComponent(selection.startStr)}`);
      return;
    }
    setCreateMode(false);
    setSelectedItem(null);
    setEventPanelMode("preview");
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
      router.push(`/calendar?event=${encodeURIComponent(item.id)}&date=${encodeURIComponent(item.startsAt)}`);
      return;
    }
    setDraftEvent(null);
    setCreateMode(false);
    setSelectedItem(item);
    setEventPanelMode("preview");
    setDeleteMenuOpen(false);
  }

  function handleEventDrop(event: EventDropArg) {
    if (event.event.id.startsWith(`${capitalOneSeriesId}-`)) {
      const item = visibleItems.find((calendarItem) => calendarItem.id === event.event.id);
      if (item && event.event.start) {
        addCalendarItem({
          title: item.title,
          type: item.type,
          responsibilityId: item.responsibilityId,
          startsAt: event.event.start.toISOString(),
          endsAt: event.event.end?.toISOString() ?? item.endsAt,
          location: item.location,
          notes: item.notes,
          source: "app"
        });
        hideCalendarEvent(item.id);
      } else {
        event.revert();
      }
      return;
    }
    if (event.event.start) {
      moveCalendarItem(event.event.id, event.event.start.toISOString(), event.event.end?.toISOString());
    }
  }

  function handleEventResize(event: EventResizeDoneArg) {
    if (event.event.id.startsWith(`${capitalOneSeriesId}-`)) {
      const item = visibleItems.find((calendarItem) => calendarItem.id === event.event.id);
      if (item && event.event.start) {
        addCalendarItem({
          title: item.title,
          type: item.type,
          responsibilityId: item.responsibilityId,
          startsAt: event.event.start.toISOString(),
          endsAt: event.event.end?.toISOString() ?? item.endsAt,
          location: item.location,
          notes: item.notes,
          source: "app"
        });
        hideCalendarEvent(item.id);
      } else {
        event.revert();
      }
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
    setDeleteMenuOpen(false);
    setEventPanelMode("preview");
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
    const title = event.title || "Untitled";

    if (event.allDay || view.type === "dayGridMonth") {
      return (
        <div style={{ padding: "1px 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, fontSize: 11 }}>
          {title}
        </div>
      );
    }

    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const timeRange = event.start && event.end ? `${fmt(event.start)} – ${fmt(event.end)}` : event.start ? fmt(event.start) : "";

    const durationMinutes = event.start && event.end ? Math.max(0, (event.end.getTime() - event.start.getTime()) / 60000) : 0;
    const shortEvent = durationMinutes > 0 && durationMinutes <= 30;

    if (shortEvent) {
      return (
        <div style={{ height: "100%", minHeight: 0, display: "flex", alignItems: "center", overflow: "hidden", padding: "0 8px" }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1f1f1f", fontWeight: 700, fontSize: 12, lineHeight: 1 }}>
            {title}
          </span>
        </div>
      );
    }

    return (
      <div style={{ padding: "6px 8px", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ color: "#1f1f1f", fontWeight: 700, fontSize: 12, lineHeight: 1.12, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          {title}
        </span>
        <span style={{ color: "#1f1f1f", fontSize: 11, fontWeight: 700, opacity: 0.92, lineHeight: 1.18, whiteSpace: "normal", overflowWrap: "anywhere" }}>
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

  function formatDraftTime(draft: Pick<DraftEvent, "startsAt" | "endsAt">) {
    const start = new Date(draft.startsAt);
    const end = new Date(draft.endsAt);
    return `${start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  function toInputDateTime(value: string) {
    return value.slice(0, 16);
  }

  function fromInputDateTime(value: string) {
    return value ? new Date(value).toISOString() : "";
  }

  function selectedTone(item: CalendarItem) {
    const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
    return responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.blue;
  }

  function saveSelectedEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) return;
    if (!selectedItem.title.trim() || !selectedItem.startsAt || !selectedItem.endsAt) return;

    if (selectedItem.id.startsWith(`${capitalOneSeriesId}-`)) {
      addCalendarItem({
        title: selectedItem.title.trim(),
        type: selectedItem.type,
        startsAt: selectedItem.startsAt,
        endsAt: selectedItem.endsAt,
        responsibilityId: selectedItem.responsibilityId,
        location: selectedItem.location?.trim() || undefined,
        notes: selectedItem.notes?.trim() || undefined,
        source: "app"
      });
      hideCalendarEvent(selectedItem.id);
      setSelectedItem(null);
      setDeleteMenuOpen(false);
      setEventPanelMode("preview");
      return;
    }

    updateCalendarItem(selectedItem.id, {
      title: selectedItem.title.trim(),
      startsAt: selectedItem.startsAt,
      endsAt: selectedItem.endsAt,
      responsibilityId: selectedItem.responsibilityId,
      location: selectedItem.location?.trim() || undefined,
      notes: selectedItem.notes?.trim() || undefined
    });
    setSelectedItem(null);
    setDeleteMenuOpen(false);
    setEventPanelMode("preview");
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
                setEventPanelMode("preview");
                setDeleteMenuOpen(false);
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
            initialDate={initialDate}
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
        <div className="absolute left-6 top-16 z-30 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[#3c4043] bg-[#202124] shadow-[0_24px_72px_rgba(0,0,0,0.55)]">
          <div className="flex h-12 items-center justify-end gap-1 px-4 text-[#bdc1c6]">
            {eventPanelMode === "preview" && (
              <button type="button" onClick={() => { setEventPanelMode("edit"); setDeleteMenuOpen(false); }} className="grid size-9 place-items-center rounded-full transition hover:bg-[#303134]" title="Edit">
                <Pencil className="size-4" />
              </button>
            )}
            <button type="button" onClick={() => setDeleteMenuOpen((value) => !value)} className="grid size-9 place-items-center rounded-full transition hover:bg-[#303134]" title="Delete">
              <Trash2 className="size-4" />
            </button>
            <button type="button" onClick={() => { setSelectedItem(null); setDeleteMenuOpen(false); }} className="grid size-9 place-items-center rounded-full transition hover:bg-[#303134]" title="Close">
              <X className="size-5" />
            </button>
          </div>

          {deleteMenuOpen && (
            <div className="mx-4 mb-3 rounded-2xl border border-[#3c4043] bg-[#282a2d] p-2">
              {selectedItem.id.startsWith(`${capitalOneSeriesId}-`) ? (
                <>
                  <button type="button" onClick={() => deleteSelectedEvent("this")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]">
                    <Trash2 className="size-5 text-[#9aa0a6]" />
                    Delete this event
                  </button>
                  <button type="button" onClick={() => deleteSelectedEvent("following")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]">
                    <Trash2 className="size-5 text-[#9aa0a6]" />
                    Delete this and following events
                  </button>
                  <button type="button" onClick={() => deleteSelectedEvent("all")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]">
                    <Trash2 className="size-5 text-[#9aa0a6]" />
                    Delete all events
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => deleteSelectedEvent("this")} className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]">
                  <Trash2 className="size-5 text-[#9aa0a6]" />
                  Delete event
                </button>
              )}
            </div>
          )}

          {eventPanelMode === "preview" ? (
            <div className="px-6 pb-6">
              <div className="grid grid-cols-[40px_1fr] gap-4">
                <span className="mt-2 size-4 rounded" style={{ backgroundColor: selectedTone(selectedItem).hex }} />
                <div>
                  <h3 className="text-2xl font-semibold leading-tight text-[#e8eaed]">{selectedItem.title || "Untitled"}</h3>
                  <p className="mt-2 text-base text-[#bdc1c6]">{formatDraftTime(selectedItem)}</p>
                </div>

                {selectedItem.location && (
                  <>
                    <MapPin className="mt-0.5 size-5 text-[#bdc1c6]" />
                    <p className="text-sm leading-6 text-[#e8eaed]">{selectedItem.location}</p>
                  </>
                )}

                <Tags className="mt-0.5 size-5 text-[#bdc1c6]" />
                <p className="text-sm leading-6 text-[#e8eaed]">
                  {responsibilities.find((item) => item.id === selectedItem.responsibilityId)?.name ?? "No label"}
                </p>

                {selectedItem.notes && (
                  <>
                    <FileText className="mt-0.5 size-5 text-[#bdc1c6]" />
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#e8eaed]">{selectedItem.notes}</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={saveSelectedEvent} className="px-6 pb-6">
              <div className="grid grid-cols-[40px_1fr] gap-4">
                <span className="mt-8 size-4 rounded" style={{ backgroundColor: selectedTone(selectedItem).hex }} />
                <div>
                  <input
                    value={selectedItem.title}
                    onChange={(event) => setSelectedItem({ ...selectedItem, title: event.target.value })}
                    className="h-14 w-full border-b border-[#5f6368] bg-transparent text-2xl text-[#e8eaed] outline-none placeholder:text-[#5f6368] focus:border-[#a8c7fa]"
                    placeholder="Add title"
                  />
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <label className="grid gap-1">
                      <span className="text-xs text-[#9aa0a6]">Start</span>
                      <input
                        type="datetime-local"
                        value={toInputDateTime(selectedItem.startsAt)}
                        onChange={(event) => setSelectedItem({ ...selectedItem, startsAt: fromInputDateTime(event.target.value) })}
                        className="h-10 rounded-lg border border-[#3c4043] bg-[#282a2d] px-3 text-sm text-[#e8eaed] outline-none focus:border-[#a8c7fa]"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-[#9aa0a6]">End</span>
                      <input
                        type="datetime-local"
                        value={toInputDateTime(selectedItem.endsAt)}
                        onChange={(event) => setSelectedItem({ ...selectedItem, endsAt: fromInputDateTime(event.target.value) })}
                        className="h-10 rounded-lg border border-[#3c4043] bg-[#282a2d] px-3 text-sm text-[#e8eaed] outline-none focus:border-[#a8c7fa]"
                      />
                    </label>
                  </div>
                </div>

                <MapPin className="mt-3 size-5 text-[#bdc1c6]" />
                <input
                  value={selectedItem.location ?? ""}
                  onChange={(event) => setSelectedItem({ ...selectedItem, location: event.target.value })}
                  placeholder="Add location"
                  className="h-11 rounded-lg border border-[#3c4043] bg-[#282a2d] px-3 text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa0a6] focus:border-[#a8c7fa]"
                />

                <Tags className="mt-3 size-5 text-[#bdc1c6]" />
                <select
                  value={selectedItem.responsibilityId}
                  onChange={(event) => setSelectedItem({ ...selectedItem, responsibilityId: event.target.value })}
                  className="h-11 rounded-lg border border-[#3c4043] bg-[#282a2d] px-3 text-sm text-[#e8eaed] outline-none focus:border-[#a8c7fa]"
                >
                  {responsibilities.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>

                <FileText className="mt-3 size-5 text-[#bdc1c6]" />
                <textarea
                  value={selectedItem.notes ?? ""}
                  onChange={(event) => setSelectedItem({ ...selectedItem, notes: event.target.value })}
                  placeholder="Add description"
                  className="min-h-28 resize-none rounded-lg border border-[#3c4043] bg-[#282a2d] p-3 text-sm leading-6 text-[#e8eaed] outline-none placeholder:text-[#9aa0a6] focus:border-[#a8c7fa]"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => { setEventPanelMode("preview"); setDeleteMenuOpen(false); }} className="rounded-full px-4 py-2 text-sm text-[#bdc1c6] transition hover:bg-[#303134] hover:text-[#e8eaed]">
                  Cancel
                </button>
                <button disabled={!selectedItem.title.trim()} className="rounded-full bg-[#a8c7fa] px-5 py-2 text-sm font-medium text-[#062e6f] transition hover:bg-[#b7d0fb] disabled:opacity-40">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
