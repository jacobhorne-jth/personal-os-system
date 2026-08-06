import { create } from "zustand";
import { localDateKey } from "@/lib/dates";
import type { CalendarItemType } from "@/lib/types/domain";

type CalendarView = "day" | "week" | "month";

type UiState = {
  calendarView: CalendarView;
  calendarGotoDate: string | null;
  selectedDate: string;
  visibleOverlays: CalendarItemType[];
  hiddenResponsibilities: string[];
  setCalendarView: (view: CalendarView) => void;
  setCalendarGotoDate: (date: string | null) => void;
  setSelectedDate: (date: string) => void;
  toggleOverlay: (overlay: CalendarItemType) => void;
  toggleResponsibility: (id: string) => void;
};

const defaultOverlays: CalendarItemType[] = [
  "external_event",
  "app_event",
  "task_due",
  "deadline",
  "time_block",
  "time_log",
  "reminder"
];

export const useUiStore = create<UiState>((set) => ({
  calendarView: "week",
  calendarGotoDate: null,
  selectedDate: localDateKey(),
  visibleOverlays: defaultOverlays,
  hiddenResponsibilities: [],
  setCalendarView: (calendarView) => set({ calendarView }),
  setCalendarGotoDate: (calendarGotoDate) => set({ calendarGotoDate }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  toggleOverlay: (overlay) =>
    set((state) => ({
      visibleOverlays: state.visibleOverlays.includes(overlay)
        ? state.visibleOverlays.filter((item) => item !== overlay)
        : [...state.visibleOverlays, overlay]
    })),
  toggleResponsibility: (id) =>
    set((state) => ({
      hiddenResponsibilities: state.hiddenResponsibilities.includes(id)
        ? state.hiddenResponsibilities.filter((r) => r !== id)
        : [...state.hiddenResponsibilities, id]
    }))
}));
