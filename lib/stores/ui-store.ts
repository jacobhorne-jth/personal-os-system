import { create } from "zustand";
import type { CalendarItemType } from "@/lib/types/domain";

type CalendarView = "day" | "week" | "month";

type UiState = {
  calendarView: CalendarView;
  visibleOverlays: CalendarItemType[];
  hiddenResponsibilities: string[];
  setCalendarView: (view: CalendarView) => void;
  toggleOverlay: (overlay: CalendarItemType) => void;
  toggleResponsibility: (id: string) => void;
};

const defaultOverlays: CalendarItemType[] = [
  "app_event",
  "task_due",
  "deadline",
  "time_block",
  "time_log",
  "reminder"
];

export const useUiStore = create<UiState>((set) => ({
  calendarView: "week",
  visibleOverlays: defaultOverlays,
  hiddenResponsibilities: [],
  setCalendarView: (calendarView) => set({ calendarView }),
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
