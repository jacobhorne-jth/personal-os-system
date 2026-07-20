"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg, EventClickArg, EventDropArg, EventContentArg } from "@fullcalendar/core";
import { AlignLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, LayoutGrid, MapPin, Pencil, Plus, RefreshCw, Tags, Trash2, X } from "lucide-react";
import { DateTimeRow } from "@/components/calendar/date-time-picker";
import { LabelSelect } from "@/components/calendar/label-select";
import { RecurrencePicker } from "@/components/calendar/recurrence-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { toFullCalendarEvent } from "@/lib/queries/calendar";
import { describeRecurrence, expandCalendarItems, parseRecurrence } from "@/lib/recurrence";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { useIsMobile } from "@/lib/use-is-mobile";
import { getTone } from "@/lib/theme";
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
  recurrence: string;
};

// Viewport rect of the drag selection, used to place the draft card beside it
type SelectAnchor = { colLeft: number; colRight: number; top: number };

// Time logs are created by the timer / "Log past", not from the event card,
// so the card offers a single "Time block" chip for planned time.
const creatableTypes: Array<{ type: CalendarItemType; label: string }> = [
  { type: "app_event", label: "Event" },
  { type: "time_block", label: "Time block" },
  { type: "deadline", label: "Deadline" },
  { type: "reminder", label: "Reminder" }
];

export function FullCalendarBoard({ fullChrome = false }: { fullChrome?: boolean }) {
  return (
    <Suspense fallback={<div className="h-full w-full bg-paper" />}>
      <FullCalendarBoardInner fullChrome={fullChrome} />
    </Suspense>
  );
}

function FullCalendarBoardInner({ fullChrome = false }: { fullChrome?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendarRef = useRef<FullCalendar | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef<(s: { start: Date; end: Date; allDay: boolean; anchor?: SelectAnchor }) => void>(() => {});
  const closeDraftRef = useRef<() => void>(() => {});
  const clearPlacedOverlayRef = useRef<() => void>(() => {});
  const placeBlockRef = useRef<(dateKey: string, startMin: number, endMin: number) => void>(() => {});
  // Color for the drag-create placeholder: the draft's label color (defaults
  // to the first label, which the draft auto-selects)
  const draftColorRef = useRef("#4285f4");
  const recolorPlacedRef = useRef<(hex: string) => void>(() => {});
  const cardOpenRef = useRef(false);
  const handledQueryDraft = useRef(false);
  const [calendarTitle, setCalendarTitle] = useState(() => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  const [draftEvent, setDraftEvent] = useState<DraftEvent | null>(null);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const [draftCardPos, setDraftCardPos] = useState<{ left: number; top: number } | null>(null);
  const [selectedPanelPos, setSelectedPanelPos] = useState<{ left: number; top: number } | null>(null);
  // When set, the expanded editor updates this existing event instead of creating
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingIsSeries, setEditingIsSeries] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  // Selected radio in the Google-style "Delete recurring event" dialog
  const [deleteScope, setDeleteScope] = useState<"this" | "following" | "all">("this");
  // Google-style "This event / All events" choice for changes to a recurring
  // instance: a drag/resize (kind "move") or a save from the editor ("save")
  const [seriesScopePrompt, setSeriesScopePrompt] = useState<
    | { kind: "move"; seriesId: string; occurrenceStart: string; newStart: string; newEnd: string }
    | { kind: "save" }
    | null
  >(null);
  // Start of the instance the expanded editor was opened from (null when
  // editing a master directly)
  const [editingOccurrenceStart, setEditingOccurrenceStart] = useState<string | null>(null);
  const { calendarView, setCalendarView, visibleOverlays, hiddenResponsibilities, calendarGotoDate, setCalendarGotoDate } = useUiStore();
  const calendarItems = useAppStore((state) => state.calendarItems);
  const responsibilities = useAppStore((state) => state.responsibilities);
  const activeResponsibilities = responsibilities.filter((resp) => !resp.archivedAt);
  const addCalendarItem = useAppStore((state) => state.addCalendarItem);
  const updateCalendarItem = useAppStore((state) => state.updateCalendarItem);
  const deleteCalendarItem = useAppStore((state) => state.deleteCalendarItem);
  const deleteCalendarOccurrence = useAppStore((state) => state.deleteCalendarOccurrence);
  const moveCalendarItem = useAppStore((state) => state.moveCalendarItem);
  const isMobile = useIsMobile();
  // Week view is unusably cramped on a phone: fall back to day. Home keeps a
  // single day; the full calendar offers Day / Month.
  const effectiveView = isMobile && calendarView === "week"
    ? "day"
    : !fullChrome && calendarView === "month"
      ? "week"
      : calendarView;
  const initialView = effectiveView === "month" ? "dayGridMonth" : effectiveView === "week" ? "timeGridWeek" : "timeGridDay";
  const availableViews = isMobile
    ? (fullChrome ? (["day", "month"] as const) : (["day"] as const))
    : (fullChrome ? (["day", "week", "month"] as const) : (["day", "week"] as const));

  // Recurring masters expand into concrete instances for the visible range
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date }>(() => {
    const start = new Date();
    start.setDate(start.getDate() - 45);
    const end = new Date();
    end.setDate(end.getDate() + 45);
    return { start, end };
  });

  const visibleItems = useMemo(
    () => expandCalendarItems(calendarItems, viewRange.start, viewRange.end),
    [calendarItems, viewRange]
  );

  const events = visibleItems
    .filter((item) =>
      visibleOverlays.includes(item.type) &&
      !hiddenResponsibilities.includes(item.responsibilityId)
    )
    .map((item) => {
      const responsibility = responsibilities.find((r) => r.id === item.responsibilityId);
      const tone = responsibility ? getTone(responsibility.color) : getTone("blue");
      return {
        ...toFullCalendarEvent(item),
        backgroundColor: tone.hex,
        borderColor: tone.hex,
        textColor: tone.eventText,
        extendedProps: toFullCalendarEvent(item).extendedProps
      };
    });

  const initialDate = searchParams.get("start") ?? searchParams.get("date") ?? undefined;

  // Keep the placeholder-block color in sync with the draft's label (or the
  // default label before a draft exists), and recolor a placed block live
  // when the label changes in the open card.
  useEffect(() => {
    const respId = draftEvent?.responsibilityId ?? responsibilities[0]?.id;
    const resp = responsibilities.find((r) => r.id === respId);
    const hex = getTone(resp?.color).hex;
    draftColorRef.current = hex;
    recolorPlacedRef.current(hex);
  }, [draftEvent?.responsibilityId, responsibilities]);

  useEffect(() => {
    if (!fullChrome || handledQueryDraft.current) return;
    const eventId = searchParams.get("event");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (eventId) {
      const item = visibleItems.find((calendarItem) => calendarItem.id === eventId);
      if (!item) return;
      handledQueryDraft.current = true;
      const api = calendarRef.current?.getApi();
      api?.gotoDate(item.startsAt);
      const itemStart = new Date(item.startsAt);
      api?.scrollToTime(`${`${Math.max(0, itemStart.getHours() - 1)}`.padStart(2, "0")}:00:00`);
      setDraftEvent(null);
      setDeleteMenuOpen(false);
      // Wait for FullCalendar to paint the target week, then anchor the panel
      // beside the event's slot BEFORE showing it — opening earlier would
      // flash the panel at the fallback corner.
      setTimeout(() => {
        const y = itemStart.getFullYear();
        const m = `${itemStart.getMonth() + 1}`.padStart(2, "0");
        const d = `${itemStart.getDate()}`.padStart(2, "0");
        const col = shellRef.current?.querySelector<HTMLElement>(`.fc-timegrid-col[data-date='${y}-${m}-${d}']`);
        const root = rootRef.current;
        if (col && root) {
          const rect = col.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          const startMin = itemStart.getHours() * 60 + itemStart.getMinutes();
          const eventTop = rect.top + (startMin / (25 * 60)) * rect.height;
          const WIDTH = 400;
          const GAP = 12;
          let left = rect.left - rootRect.left - WIDTH - GAP;
          if (left < 8) left = rect.right - rootRect.left + GAP;
          left = Math.max(8, Math.min(left, rootRect.width - WIDTH - 8));
          const top = Math.max(56, Math.min(eventTop - rootRect.top - 8, rootRect.height - 380));
          setSelectedPanelPos({ left, top });
        } else {
          setSelectedPanelPos(null);
        }
        setSelectedItem(item);
        // Consume the params so a refresh doesn't replay this panel
        router.replace("/calendar", { scroll: false });
      }, 80);
      return;
    }
    if (!start || !end) return;
    handledQueryDraft.current = true;
    calendarRef.current?.getApi().gotoDate(start);
    // Wait for FullCalendar to paint the target week, then anchor the card
    // and placeholder block BEFORE showing the draft — opening it earlier
    // would flash the card at the fallback corner for a beat.
    const startDate = new Date(start);
    const endDate = new Date(end);
    setTimeout(() => {
      const y = startDate.getFullYear();
      const m = `${startDate.getMonth() + 1}`.padStart(2, "0");
      const d = `${startDate.getDate()}`.padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;
      const col = shellRef.current?.querySelector<HTMLElement>(`.fc-timegrid-col[data-date='${dateKey}']`);
      if (col) {
        const rect = col.getBoundingClientRect();
        const startMin = startDate.getHours() * 60 + startDate.getMinutes();
        const endMin = Math.max(startMin + 15, endDate.getHours() * 60 + endDate.getMinutes() || startMin + 60);
        positionCard({
          colLeft: rect.left,
          colRight: rect.right,
          top: rect.top + (startMin / (25 * 60)) * rect.height,
        });
        placeBlockRef.current(dateKey, startMin, endMin);
      } else {
        positionCard(null);
      }
      setDraftEvent({
        startsAt: start,
        endsAt: end,
        title: "",
        location: "",
        notes: "",
        responsibilityId: responsibilities[0]?.id ?? "school",
        type: "app_event",
        recurrence: ""
      });
      // Consume the params so a refresh doesn't replay this draft
      router.replace("/calendar", { scroll: false });
    }, 80);
  }, [fullChrome, responsibilities, router, searchParams, visibleItems]);

  useEffect(() => {
    if (!calendarGotoDate) return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView("timeGridWeek");
    api.gotoDate(calendarGotoDate);
    setCalendarView("week");
    setCalendarGotoDate(null);
  }, [calendarGotoDate, setCalendarGotoDate, setCalendarView]);

  // Keep FullCalendar's view in sync with the effective view — needed because
  // useIsMobile resolves after first paint (week → day on phones)
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const target = effectiveView === "month" ? "dayGridMonth" : effectiveView === "week" ? "timeGridWeek" : "timeGridDay";
    if (api.view.type !== target) api.changeView(target);
  }, [effectiveView]);

  // Place the card beside the selection like Google Calendar: prefer the
  // left of the day column, flip to the right when there's no room.
  function positionCard(anchor: SelectAnchor | null) {
    const root = rootRef.current;
    if (!anchor || !root) {
      setDraftCardPos(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const CARD_WIDTH = 380;
    const GAP = 12;
    let left = anchor.colLeft - rootRect.left - CARD_WIDTH - GAP;
    if (left < 8) left = anchor.colRight - rootRect.left + GAP;
    left = Math.max(8, Math.min(left, rootRect.width - CARD_WIDTH - 8));
    const top = Math.max(56, Math.min(anchor.top - rootRect.top - 8, rootRect.height - 420));
    setDraftCardPos({ left, top });
  }

  function handleSelect(selection: { start: Date; end: Date; allDay: boolean; anchor?: SelectAnchor }) {
    const start = selection.start;
    const end = selection.end;

    if (!fullChrome) {
      router.push(`/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&date=${encodeURIComponent(start.toISOString())}`);
      return;
    }
    setSelectedItem(null);
    positionCard(selection.anchor ?? null);
    setDraftEvent({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      title: "",
      location: "",
      notes: "",
      responsibilityId: responsibilities[0]?.id ?? "school",
      type: "app_event",
      recurrence: ""
    });
  }
  selectRef.current = handleSelect;
  closeDraftRef.current = () => {
    setDraftEvent(null);
    setDraftExpanded(false);
    setEditingEventId(null);
    setEditingIsSeries(false);
    setEditingOccurrenceStart(null);
    setSelectedItem(null);
    setDeleteMenuOpen(false);
  };

  // Escape closes the draft card / expanded editor, like Google Calendar
  useEffect(() => {
    if (!draftEvent) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeDraftRef.current();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [draftEvent]);

  // The placed selection block lives outside React (imperative DOM); remove it
  // whenever the draft card closes for any reason (cancel, save, new drag).
  useEffect(() => {
    cardOpenRef.current = Boolean(draftEvent);
    if (!draftEvent) clearPlacedOverlayRef.current();
  }, [draftEvent]);

  // Keep the placeholder block in sync when the draft's date/time is edited
  // from the card (mini calendar or time dropdowns).
  const draftStartsAt = draftEvent?.startsAt;
  const draftEndsAt = draftEvent?.endsAt;
  useEffect(() => {
    if (!draftStartsAt || !draftEndsAt) return;
    const s = new Date(draftStartsAt);
    const e = new Date(draftEndsAt);
    const dateKey = `${s.getFullYear()}-${`${s.getMonth() + 1}`.padStart(2, "0")}-${`${s.getDate()}`.padStart(2, "0")}`;
    const aMin = s.getHours() * 60 + s.getMinutes();
    const rawEnd = e.getHours() * 60 + e.getMinutes();
    const bMin = Math.max(aMin + 15, rawEnd === 0 ? 24 * 60 : rawEnd);
    clearPlacedOverlayRef.current();
    placeBlockRef.current(dateKey, aMin, bMin);
  }, [draftStartsAt, draftEndsAt]);

  // Any click outside the open card/panel dismisses it — sidebar, top bar,
  // mini calendar, nav links (navigation still goes through).
  useEffect(() => {
    if (!draftEvent && !selectedItem) return;
    function onOutsidePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-popup-card]")) return; // inside the card
      if (target.closest(".fc-event")) return; // event clicks manage the panel themselves
      if (target.closest(".fc-timegrid-body")) return; // grid clicks are handled by drag-create
      closeDraftRef.current();
    }
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown, true);
  }, [draftEvent, selectedItem]);

  // Google Calendar-style drag-to-create in the time grid: the selection box
  // is ours (not FullCalendar's), stays locked to the day column where the
  // drag began, and keeps tracking the cursor's vertical position even when
  // the mouse wanders into neighboring days.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const TOTAL_MINUTES = 25 * 60; // slotMinTime 00:00 → slotMaxTime 25:00
    const SNAP = 15;

    let colEl: HTMLElement | null = null;
    let dayDate: Date | null = null;
    let overlay: HTMLDivElement | null = null;
    let titleLine: HTMLDivElement | null = null;
    let label: HTMLDivElement | null = null;
    let placed: HTMLDivElement | null = null; // block left on the grid while the draft card is open
    let startMinutes = 0;
    let endMinutes = 0;
    let dragging = false;
    let dismissedCard = false; // gesture began while a draft card was open

    clearPlacedOverlayRef.current = () => {
      placed?.remove();
      placed = null;
    };

    recolorPlacedRef.current = (hex) => {
      if (placed) placed.style.background = hex;
    };

    function fmtMin(mins: number) {
      const d = new Date(2000, 0, 1, Math.floor(mins / 60) % 24, mins % 60);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function createBlock(col: HTMLElement, aMin: number, bMin: number, withTitle: boolean) {
      const frame = col.querySelector<HTMLElement>(".fc-timegrid-col-frame") ?? col;
      const el = document.createElement("div");
      el.style.cssText =
        `position:absolute;left:2px;right:3px;z-index:5;border-radius:6px;background:${draftColorRef.current};pointer-events:none;padding:3px 7px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.35);`;
      const t = document.createElement("div");
      t.style.cssText = "font-size:12px;font-weight:500;color:#fff;white-space:nowrap;";
      const l = document.createElement("div");
      l.style.cssText = "font-size:11px;color:rgba(255,255,255,0.9);white-space:nowrap;";
      if (withTitle) t.textContent = "(No title)";
      l.textContent = `${fmtMin(aMin)} – ${fmtMin(bMin)}`;
      el.style.top = `${(aMin / TOTAL_MINUTES) * 100}%`;
      el.style.height = `${(Math.max(bMin - aMin, SNAP) / TOTAL_MINUTES) * 100}%`;
      el.appendChild(t);
      el.appendChild(l);
      frame.appendChild(el);
      return { el, t, l };
    }

    // Lets the query-param draft (home page → calendar handoff) show the same
    // placeholder block as a native drag.
    placeBlockRef.current = (dateKey, aMin, bMin) => {
      const col = shell!.querySelector<HTMLElement>(`.fc-timegrid-col[data-date='${dateKey}']`);
      if (!col) return;
      placed?.remove();
      placed = createBlock(col, aMin, bMin, true).el;
    };

    function rawMinutes(e: { clientY: number }) {
      const rect = colEl!.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      return Math.max(0, Math.min(TOTAL_MINUTES, ratio * TOTAL_MINUTES));
    }

    function render() {
      if (!overlay) return;
      const a = Math.min(startMinutes, endMinutes);
      const b = Math.max(startMinutes, endMinutes);
      overlay.style.top = `${(a / TOTAL_MINUTES) * 100}%`;
      overlay.style.height = `${(Math.max(b - a, SNAP) / TOTAL_MINUTES) * 100}%`;
      if (label) label.textContent = `${fmtMin(a)} – ${fmtMin(Math.max(b, a + SNAP))}`;
    }

    function onMove(e: PointerEvent) {
      if (!dragging) return;
      endMinutes = Math.round(rawMinutes(e) / SNAP) * SNAP;
      render();
    }

    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (!dragging) return;
      dragging = false;

      const a = Math.min(startMinutes, endMinutes);
      let b = Math.max(startMinutes, endMinutes);
      const plainClick = b - a < SNAP;

      // A plain click while a card was open only dismisses it (Google behavior);
      // an actual drag goes on to open the next card.
      if (plainClick && dismissedCard) {
        overlay?.remove();
        overlay = null;
        return;
      }

      if (plainClick) b = Math.min(a + 60, TOTAL_MINUTES); // plain click → 1 hour
      const start = new Date(dayDate!);
      start.setMinutes(a);
      const end = new Date(dayDate!);
      end.setMinutes(b);

      // Keep the block on the grid while the draft card is open, like
      // Google Calendar's "(No title)" placeholder.
      if (overlay) {
        endMinutes = b;
        startMinutes = a;
        render();
        if (titleLine) titleLine.textContent = "(No title)";
        placed = overlay;
        overlay = null;
      }

      const colRect = colEl!.getBoundingClientRect();
      const anchorTop = colRect.top + (a / TOTAL_MINUTES) * colRect.height;
      selectRef.current({
        start,
        end,
        allDay: false,
        anchor: { colLeft: colRect.left, colRight: colRect.right, top: anchorTop },
      });
    }

    function onDown(e: PointerEvent) {
      if (e.button !== 0 || e.pointerType !== "mouse") return; // touch keeps FullCalendar's long-press
      const target = e.target as HTMLElement;
      if (target.closest(".fc-event")) return; // clicks on events pass through
      if (!target.closest(".fc-timegrid-body")) return; // month view / header: not ours
      // Empty-slot clicks land on the slot-lane layer, not the day columns,
      // so locate the day column by the pointer's x position.
      const col = Array.from(shell!.querySelectorAll<HTMLElement>(".fc-timegrid-col[data-date]")).find((c) => {
        const r = c.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX < r.right;
      });
      const dateAttr = col?.getAttribute("data-date");
      if (!col || !dateAttr) return;

      // Take over from FullCalendar's own selection. preventDefault on
      // pointerdown also suppresses the compatibility mouse events, so
      // FullCalendar never sees this gesture regardless of which it uses.
      e.preventDefault();
      e.stopPropagation();

      // A new gesture dismisses the previous draft card and its placed block
      dismissedCard = cardOpenRef.current;
      placed?.remove();
      placed = null;
      closeDraftRef.current();

      colEl = col;
      const [y, m, d] = dateAttr.split("-").map(Number);
      dayDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      startMinutes = Math.floor(rawMinutes(e) / SNAP) * SNAP;
      endMinutes = startMinutes;
      dragging = true;

      const block = createBlock(col, startMinutes, endMinutes, false);
      overlay = block.el;
      titleLine = block.t;
      label = block.l;
      render();

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    }

    shell.addEventListener("pointerdown", onDown, true); // capture: runs before FullCalendar
    return () => {
      shell.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      overlay?.remove();
      placed?.remove();
    };
  }, []);

  function handleEventClick(event: EventClickArg) {
    const item = visibleItems.find((calendarItem) => calendarItem.id === event.event.id);
    if (!item) return;
    if (!fullChrome) {
      router.push(`/calendar?event=${encodeURIComponent(item.id)}&date=${encodeURIComponent(item.startsAt)}`);
      return;
    }
    // Anchor the panel beside the clicked event block, like Google Calendar
    const root = rootRef.current;
    const rect = event.el.getBoundingClientRect();
    if (root) {
      const rootRect = root.getBoundingClientRect();
      const WIDTH = 400;
      const GAP = 12;
      let left = rect.left - rootRect.left - WIDTH - GAP;
      if (left < 8) left = rect.right - rootRect.left + GAP;
      left = Math.max(8, Math.min(left, rootRect.width - WIDTH - 8));
      const top = Math.max(56, Math.min(rect.top - rootRect.top - 8, rootRect.height - 380));
      setSelectedPanelPos({ left, top });
    } else {
      setSelectedPanelPos(null);
    }
    setDraftEvent(null);
    setSelectedItem(item);
    setDeleteMenuOpen(false);
  }

  function localDateKeyOf(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  }

  // A recurring instance was dragged or resized: capture the new times, snap
  // the visual back (state re-derives instances), and ask for the scope.
  function promptSeriesChange(event: EventDropArg | EventResizeDoneArg) {
    const instance = visibleItems.find((item) => item.id === event.event.id);
    const newStart = event.event.start?.toISOString();
    const droppedEnd = event.event.end?.toISOString();
    event.revert();
    if (!instance?.seriesId || !newStart) return;
    const duration = new Date(instance.endsAt).getTime() - new Date(instance.startsAt).getTime();
    const newEnd = droppedEnd ?? new Date(new Date(newStart).getTime() + duration).toISOString();
    setSelectedItem(null);
    setSeriesScopePrompt({ kind: "move", seriesId: instance.seriesId, occurrenceStart: instance.startsAt, newStart, newEnd });
  }

  function applySeriesScope(mode: "this" | "all") {
    const prompt = seriesScopePrompt;
    setSeriesScopePrompt(null);
    if (!prompt) return;
    if (prompt.kind === "save") {
      commitDraftSave(mode);
      return;
    }
    const master = calendarItems.find((item) => item.id === prompt.seriesId);
    if (!master) return;
    if (mode === "this") {
      // Detach this occurrence: except it from the series and create a
      // standalone copy at the new time
      deleteCalendarOccurrence(master.id, localDateKeyOf(prompt.occurrenceStart));
      addCalendarItem({
        title: master.title,
        type: master.type,
        responsibilityId: master.responsibilityId,
        startsAt: prompt.newStart,
        endsAt: prompt.newEnd,
        location: master.location,
        notes: master.notes,
        source: "app"
      });
    } else {
      // Shift the whole series by the same delta, with the new duration
      const delta = new Date(prompt.newStart).getTime() - new Date(prompt.occurrenceStart).getTime();
      const duration = new Date(prompt.newEnd).getTime() - new Date(prompt.newStart).getTime();
      const masterStart = new Date(master.startsAt).getTime() + delta;
      updateCalendarItem(master.id, {
        startsAt: new Date(masterStart).toISOString(),
        endsAt: new Date(masterStart + duration).toISOString()
      });
    }
  }

  function handleEventDrop(event: EventDropArg) {
    if (event.event.id.includes("::")) {
      promptSeriesChange(event);
      return;
    }
    if (event.event.start) {
      moveCalendarItem(event.event.id, event.event.start.toISOString(), event.event.end?.toISOString());
    }
  }

  function handleEventResize(event: EventResizeDoneArg) {
    if (event.event.id.includes("::")) {
      promptSeriesChange(event);
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

  // Open the create card for the next full hour, like Google's + / Create
  function openCreateDraft() {
    setSelectedItem(null);
    setDeleteMenuOpen(false);
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const dateKey = localDateKeyOf(start.toISOString());
    const startMin = start.getHours() * 60;
    const col = shellRef.current?.querySelector<HTMLElement>(`.fc-timegrid-col[data-date='${dateKey}']`);
    if (col) {
      const rect = col.getBoundingClientRect();
      positionCard({ colLeft: rect.left, colRight: rect.right, top: rect.top + (startMin / (25 * 60)) * rect.height });
      placeBlockRef.current(dateKey, startMin, startMin + 60);
    } else {
      positionCard(null);
    }
    setDraftEvent({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      title: "",
      location: "",
      notes: "",
      responsibilityId: responsibilities[0]?.id ?? "school",
      type: "app_event",
      recurrence: ""
    });
  }

  function deleteSelectedEvent(mode: "this" | "following" | "all" = "this") {
    if (!selectedItem) return;
    if (selectedItem.seriesId) {
      const master = calendarItems.find((item) => item.id === selectedItem.seriesId);
      if (mode === "all") {
        deleteCalendarItem(selectedItem.seriesId);
      } else if (mode === "following" && master) {
        // Truncate the series so this occurrence and everything after it is
        // gone: end the recurrence the day before this occurrence. If this is
        // the first occurrence, nothing is left, so delete the master.
        const occDate = new Date(selectedItem.startsAt);
        const dayBefore = new Date(occDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        if (dayBefore < new Date(master.startsAt)) {
          deleteCalendarItem(master.id);
        } else {
          const rule = parseRecurrence(master.recurrence);
          if (rule) {
            const truncated = { ...rule, until: localDateKeyOf(dayBefore.toISOString()) };
            delete truncated.count; // an explicit end date supersedes a count
            updateCalendarItem(master.id, { recurrence: JSON.stringify(truncated) });
          }
        }
      } else {
        deleteCalendarOccurrence(selectedItem.seriesId, localDateKeyOf(selectedItem.startsAt));
      }
    } else {
      deleteCalendarItem(selectedItem.id);
    }
    setSelectedItem(null);
    setDeleteMenuOpen(false);
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
    const rangeStart = new Date(dateInfo.start);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(dateInfo.end);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    setViewRange((prev) =>
      prev.start.getTime() === rangeStart.getTime() && prev.end.getTime() === rangeEnd.getTime()
        ? prev
        : { start: rangeStart, end: rangeEnd }
    );
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
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827", fontWeight: 800, fontSize: 12, lineHeight: 1 }}>
            {title}
          </span>
        </div>
      );
    }

    return (
      <div style={{ padding: "7px 8px", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ color: "#111827", fontWeight: 800, fontSize: 13, lineHeight: 1.12, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          {title}
        </span>
        <span style={{ color: "#1f1f1f", fontSize: 11, fontWeight: 600, opacity: 0.82, lineHeight: 1.2, whiteSpace: "normal", overflowWrap: "anywhere" }}>
          {timeRange}
        </span>
        {location && (
          <span style={{ color: "#1f1f1f", fontSize: 10, fontWeight: 600, opacity: 0.72, lineHeight: 1.18, whiteSpace: "normal", overflowWrap: "anywhere" }}>
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
    if (arg.date.getHours() === 0) return "";
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

  function selectedTone(item: CalendarItem) {
    const responsibility = responsibilities.find((entry) => entry.id === item.responsibilityId);
    return responsibility ? getTone(responsibility.color) : getTone("blue");
  }

  function saveDraftEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftEvent || !draftEvent.title.trim()) return;
    // Saving an edit that came from a recurring instance asks for the scope,
    // unless the recurrence itself changed (that only makes sense series-wide)
    const master = editingEventId ? calendarItems.find((item) => item.id === editingEventId) : undefined;
    const recurrenceChanged = Boolean(master) && (draftEvent.recurrence || "") !== (master?.recurrence ?? "");
    if (editingEventId && editingIsSeries && editingOccurrenceStart && !recurrenceChanged) {
      setSeriesScopePrompt({ kind: "save" });
      return;
    }
    commitDraftSave("all");
  }

  function commitDraftSave(mode: "this" | "all") {
    if (!draftEvent) return;
    if (editingEventId) {
      const master = calendarItems.find((item) => item.id === editingEventId);
      if (mode === "this" && master && editingOccurrenceStart) {
        // Detach this occurrence with the edited fields as a standalone event
        deleteCalendarOccurrence(master.id, localDateKeyOf(editingOccurrenceStart));
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
      } else {
        let startsAt = draftEvent.startsAt;
        let endsAt = draftEvent.endsAt;
        if (editingIsSeries && master) {
          // Editing a series keeps the master's anchor date; only the
          // time of day (and duration) from the editor applies
          const editedStart = new Date(draftEvent.startsAt);
          const editedEnd = new Date(draftEvent.endsAt);
          const masterStart = new Date(master.startsAt);
          masterStart.setHours(editedStart.getHours(), editedStart.getMinutes(), 0, 0);
          startsAt = masterStart.toISOString();
          endsAt = new Date(masterStart.getTime() + (editedEnd.getTime() - editedStart.getTime())).toISOString();
        }
        updateCalendarItem(editingEventId, {
          title: draftEvent.title.trim(),
          type: draftEvent.type,
          responsibilityId: draftEvent.responsibilityId,
          startsAt,
          endsAt,
          location: draftEvent.location.trim() || undefined,
          notes: draftEvent.notes.trim() || undefined,
          recurrence: draftEvent.recurrence || undefined,
        });
      }
    } else {
      addCalendarItem({
        title: draftEvent.title.trim(),
        type: draftEvent.type,
        responsibilityId: draftEvent.responsibilityId,
        startsAt: draftEvent.startsAt,
        endsAt: draftEvent.endsAt,
        location: draftEvent.location.trim() || undefined,
        notes: draftEvent.notes.trim() || undefined,
        recurrence: draftEvent.recurrence || undefined,
        source: "app"
      });
    }
    setDraftEvent(null);
    setDraftExpanded(false);
    setEditingEventId(null);
    setEditingIsSeries(false);
    setEditingOccurrenceStart(null);
    calendarRef.current?.getApi().unselect();
  }

  function openEditInExpanded(item: CalendarItem) {
    const master = item.seriesId ? calendarItems.find((entry) => entry.id === item.seriesId) : item;
    setDraftEvent({
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      title: item.title,
      location: item.location ?? "",
      notes: item.notes ?? "",
      responsibilityId: item.responsibilityId,
      type: item.type,
      recurrence: master?.recurrence ?? "",
    });
    setEditingEventId(master?.id ?? item.id);
    setEditingIsSeries(Boolean(item.seriesId || master?.recurrence));
    setEditingOccurrenceStart(item.seriesId ? item.startsAt : null);
    setSelectedItem(null);
    setDeleteMenuOpen(false);
    setDraftCardPos(null);
    setDraftExpanded(true);
  }

  return (
    <div ref={rootRef} className={cn("calendar-board gcal-board gcal-board-compact relative flex h-full min-h-0 flex-col", fullChrome && "gcal-board-full")}>
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
          {isMobile ? (
            // A single compact toggle instead of the segmented control
            <button
              type="button"
              onClick={() => changeView(effectiveView === "month" ? "day" : "month")}
              className="gcal-icon-button"
              aria-label={effectiveView === "month" ? "Switch to day view" : "Switch to month view"}
            >
              {effectiveView === "month" ? <CalendarDays className="size-5" /> : <LayoutGrid className="size-5" />}
            </button>
          ) : (
            <div className="gcal-view-tabs" style={{ gridTemplateColumns: `repeat(${availableViews.length}, minmax(74px, 1fr))` }} aria-label="Calendar view">
              {availableViews.map((view) => (
                <button key={view} onClick={() => changeView(view)} className={cn(effectiveView === view && "active")}>
                  {view}
                </button>
              ))}
            </div>
          )}
          {fullChrome && (
            <button onClick={openCreateDraft} className="gcal-create-button">
              Create event
            </button>
          )}
        </div>
      </div>

      <div className="gcal-main">
        <div className="gcal-calendar-shell" ref={shellRef}>
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
            slotMinTime="00:00:00"
            slotMaxTime="25:00:00"
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

          {/* Mobile create FAB — the header + is hidden on phones for space */}
          {fullChrome && isMobile && (
            <button
              type="button"
              onClick={openCreateDraft}
              aria-label="Create event"
              className="absolute bottom-24 right-4 z-20 grid size-14 place-items-center rounded-2xl bg-[#4285f4] text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          )}
        </div>
      </div>

      {draftEvent && !draftExpanded && (
        <div
          data-popup-card
          className="absolute z-30 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#3c4043] bg-[#282a2d] shadow-lift"
          style={draftCardPos ? { left: draftCardPos.left, top: draftCardPos.top } : { left: 12, top: 56 }}
        >
          <form onSubmit={saveDraftEvent}>
            <button
              type="button"
              onClick={() => closeDraftRef.current()}
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[#9aa0a6] transition hover:bg-[#3c4043] hover:text-[#e8eaed]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <div className="px-5 pt-5 pb-3">
              <input
                autoFocus
                value={draftEvent.title}
                onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })}
                placeholder="Add title"
                className="h-10 w-[calc(100%-2.5rem)] border-b border-[#5f6368] bg-transparent text-lg text-[#e8eaed] outline-none placeholder:text-[#5f6368] focus:border-[#4285f4]"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
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
            <div className="space-y-0.5 px-2 pb-3">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                <Clock className="size-5 shrink-0 text-[#9aa0a6]" />
                <DateTimeRow
                  startsAt={draftEvent.startsAt}
                  endsAt={draftEvent.endsAt}
                  onChange={(startsAt, endsAt) => setDraftEvent({ ...draftEvent, startsAt, endsAt })}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-1">
                <RefreshCw className="size-5 shrink-0 text-[#9aa0a6]" />
                <RecurrencePicker
                  value={draftEvent.recurrence}
                  startsAt={draftEvent.startsAt}
                  onChange={(recurrence) => setDraftEvent({ ...draftEvent, recurrence })}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#303134] focus-within:bg-[#303134]">
                <MapPin className="size-5 shrink-0 text-[#9aa0a6]" />
                <input
                  value={draftEvent.location}
                  onChange={(e) => setDraftEvent({ ...draftEvent, location: e.target.value })}
                  placeholder="Add location"
                  className="h-9 w-full bg-transparent text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa0a6]"
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-[#303134]">
                <Tags className="size-5 shrink-0 text-[#9aa0a6]" />
                <LabelSelect
                  value={draftEvent.responsibilityId}
                  options={activeResponsibilities}
                  onChange={(responsibilityId) => setDraftEvent({ ...draftEvent, responsibilityId })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#3c4043] px-5 py-3">
              <button
                type="button"
                onClick={() => setDraftExpanded(true)}
                className="rounded-full px-4 py-2 text-sm text-[#9aa0a6] transition hover:bg-[#3c4043] hover:text-[#e8eaed]"
              >
                More options
              </button>
              <button
                disabled={!draftEvent.title.trim()}
                className="rounded-full bg-[#4285f4] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#5094f5] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {draftEvent && draftExpanded && (
        <div data-popup-card className="absolute inset-0 z-40 flex flex-col bg-[#1f1f1f]">
          <form onSubmit={saveDraftEvent} className="flex min-h-0 flex-1 flex-col">
            {/* Header: X on the left, Save on the right, like Google Calendar */}
            <div className="flex h-16 shrink-0 items-center gap-4 border-b border-[#3c4043] px-4 sm:px-6">
              <button
                type="button"
                onClick={() => closeDraftRef.current()}
                className="grid size-10 place-items-center rounded-full text-[#bdc1c6] transition hover:bg-[#303134]"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
              <input
                autoFocus
                value={draftEvent.title}
                onChange={(e) => setDraftEvent({ ...draftEvent, title: e.target.value })}
                placeholder="Add title"
                className="h-11 min-w-0 flex-1 border-b border-[#5f6368] bg-transparent text-2xl text-[#e8eaed] outline-none placeholder:text-[#5f6368] focus:border-[#4285f4]"
              />
              <button
                disabled={!draftEvent.title.trim()}
                className="rounded-full bg-[#4285f4] px-8 py-2.5 text-sm font-medium text-white transition hover:bg-[#5094f5] disabled:opacity-40"
              >
                Save
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl space-y-1 px-4 py-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2">
                  <Clock className="size-5 shrink-0 text-[#9aa0a6]" />
                  <DateTimeRow
                    startsAt={draftEvent.startsAt}
                    endsAt={draftEvent.endsAt}
                    onChange={(startsAt, endsAt) => setDraftEvent({ ...draftEvent, startsAt, endsAt })}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg px-3 py-1">
                  <RefreshCw className="size-5 shrink-0 text-[#9aa0a6]" />
                  <RecurrencePicker
                    value={draftEvent.recurrence}
                    startsAt={draftEvent.startsAt}
                    onChange={(recurrence) => setDraftEvent({ ...draftEvent, recurrence })}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <span className="size-5 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {creatableTypes.map((item) => (
                      <button
                        type="button"
                        key={item.type}
                        onClick={() => setDraftEvent({ ...draftEvent, type: item.type })}
                        className={cn(
                          "rounded-full px-4 py-1.5 text-sm transition",
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

                <div className="my-3 h-px bg-[#3c4043]" />

                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <MapPin className="size-5 shrink-0 text-[#9aa0a6]" />
                  <input
                    value={draftEvent.location}
                    onChange={(e) => setDraftEvent({ ...draftEvent, location: e.target.value })}
                    placeholder="Add location"
                    className="h-11 w-full rounded-md bg-[#303134] px-3 text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa0a6] focus:ring-1 focus:ring-[#8ab4f8]"
                  />
                </div>
                <div className="flex items-start gap-3 rounded-lg px-3 py-2">
                  <AlignLeft className="mt-3 size-5 shrink-0 text-[#9aa0a6]" />
                  <textarea
                    value={draftEvent.notes}
                    onChange={(e) => setDraftEvent({ ...draftEvent, notes: e.target.value })}
                    placeholder="Add description"
                    rows={6}
                    className="w-full resize-none rounded-md bg-[#303134] p-3 text-sm leading-6 text-[#e8eaed] outline-none placeholder:text-[#9aa0a6] focus:ring-1 focus:ring-[#8ab4f8]"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <Tags className="size-5 shrink-0 text-[#9aa0a6]" />
                  <LabelSelect
                    value={draftEvent.responsibilityId}
                    options={activeResponsibilities}
                    onChange={(responsibilityId) => setDraftEvent({ ...draftEvent, responsibilityId })}
                    className="h-10 w-56 rounded-md bg-[#303134] px-3"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {selectedItem && (
        <div
          data-popup-card
          className="absolute z-30 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#3c4043] bg-[#202124] shadow-[0_24px_72px_rgba(0,0,0,0.55)]"
          style={selectedPanelPos ? { left: selectedPanelPos.left, top: selectedPanelPos.top } : { left: 24, top: 64 }}
        >
          <div className="flex h-10 items-center justify-end gap-0.5 px-2.5 pt-1.5 text-[#bdc1c6]">
            <button type="button" onClick={() => openEditInExpanded(selectedItem)} className="grid size-8 place-items-center rounded-full transition hover:bg-[#303134]" title="Edit">
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                // Single events delete immediately; recurring events open the
                // Google-style This / This and following / All dialog
                if (selectedItem.seriesId) {
                  setDeleteScope("this");
                  setDeleteMenuOpen(true);
                } else {
                  deleteSelectedEvent();
                }
              }}
              className="grid size-8 place-items-center rounded-full transition hover:bg-[#303134]"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
            <button type="button" onClick={() => { setSelectedItem(null); setDeleteMenuOpen(false); }} className="grid size-8 place-items-center rounded-full transition hover:bg-[#303134]" title="Close">
              <X className="size-4" />
            </button>
          </div>


          <div className="px-4 pb-4">
            <div className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-2">
              <span className="mt-1 size-3.5 rounded" style={{ backgroundColor: selectedTone(selectedItem).hex }} />
              <div>
                <h3 className="text-lg font-semibold leading-snug text-[#e8eaed]">{selectedItem.title || "Untitled"}</h3>
                <p className="mt-0.5 text-sm text-[#bdc1c6]">{formatDraftTime(selectedItem)}</p>
                {selectedItem.recurrence && (
                  <p className="mt-0.5 text-xs text-[#9aa0a6]">{describeRecurrence(selectedItem.recurrence, new Date(selectedItem.startsAt))}</p>
                )}
              </div>

              {selectedItem.location && (
                <>
                  <MapPin className="mt-0.5 size-4 justify-self-center text-[#9aa0a6]" />
                  <p className="text-sm leading-5 text-[#e8eaed]">{selectedItem.location}</p>
                </>
              )}

              <Tags className="mt-0.5 size-4 justify-self-center text-[#9aa0a6]" />
              <p className="flex items-center gap-2 text-sm leading-5 text-[#e8eaed]">
                {(() => {
                  const resp = responsibilities.find((item) => item.id === selectedItem.responsibilityId);
                  return (
                    <>
                      {resp && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTone(resp.color).hex }} />}
                      {resp?.name ?? "No label"}
                    </>
                  );
                })()}
              </p>

              {selectedItem.notes && (
                <>
                  <FileText className="mt-0.5 size-4 justify-self-center text-[#9aa0a6]" />
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-5 text-[#e8eaed]">{selectedItem.notes}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {seriesScopePrompt && (
        <div
          data-popup-card
          className="absolute inset-0 z-50 grid place-items-center bg-black/50"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSeriesScopePrompt(null);
          }}
        >
          <div className="w-[320px] rounded-2xl border border-[#3c4043] bg-[#202124] p-5 shadow-[0_24px_72px_rgba(0,0,0,0.6)]">
            <h3 className="text-base font-medium text-[#e8eaed]">
              {seriesScopePrompt.kind === "move" ? "Move recurring event" : "Save recurring event"}
            </h3>
            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => applySeriesScope("this")}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
              >
                This event
              </button>
              <button
                type="button"
                onClick={() => applySeriesScope("all")}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#e8eaed] transition hover:bg-[#303134]"
              >
                All events in the series
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSeriesScopePrompt(null)}
                className="rounded-full px-4 py-1.5 text-sm text-[#8ab4f8] transition hover:bg-[#303134]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMenuOpen && selectedItem?.seriesId && (
        <div
          data-popup-card
          className="absolute inset-0 z-50 grid place-items-center bg-black/50"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setDeleteMenuOpen(false);
          }}
        >
          <div className="w-[360px] rounded-2xl border border-[#3c4043] bg-[#2a2a2c] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.6)]">
            <h3 className="text-xl text-[#e8eaed]">Delete recurring event</h3>
            <div className="mt-5 space-y-1">
              {([
                ["this", "This event"],
                ["following", "This and following events"],
                ["all", "All events"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5">
                  <input
                    type="radio"
                    name="delete-scope"
                    checked={deleteScope === value}
                    onChange={() => setDeleteScope(value)}
                    className="size-5 accent-[#8ab4f8]"
                  />
                  <span className="text-[15px] text-[#e8eaed]">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteMenuOpen(false)}
                className="rounded-full px-5 py-2 text-sm font-medium text-[#8ab4f8] transition hover:bg-[#3c4043]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteSelectedEvent(deleteScope)}
                className="rounded-full bg-[#8ab4f8] px-6 py-2 text-sm font-medium text-[#202124] transition hover:brightness-110"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
