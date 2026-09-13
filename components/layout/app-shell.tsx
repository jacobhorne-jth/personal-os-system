"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, CalendarDays, CheckCircle2, LayoutGrid, PanelLeft, Pause, Play, Plus, Search, Square, Timer, X } from "lucide-react";
import { CaptureDialog } from "@/components/capture/capture-dialog";
import { CommandPalette } from "@/components/layout/global-search";
import { ALL_NAV_ITEMS, NAV_GROUPS, SETTINGS_ITEM, isNavActive, type NavItem } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TimerControl } from "@/components/time/timer-control";
import { Overlay } from "@/components/ui/overlay";
import { activeReviewItems } from "@/lib/dashboard/summary";
import { detectedTimeZone, localDateKey } from "@/lib/dates";
import { useAppStore } from "@/lib/stores/app-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "jacob-os-sidebar-collapsed";

function compactElapsed(startedAt?: string) {
  if (!startedAt) return "0:00";
  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

function useTimerTick() {
  const running = useAppStore((state) => state.timer.running);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);
}

function DeviceDateSync() {
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);

  useEffect(() => {
    let currentToday = localDateKey();
    let currentTimeZone = detectedTimeZone();

    function syncDeviceDate() {
      const nextToday = localDateKey();
      const nextTimeZone = detectedTimeZone();
      if (nextToday === currentToday && nextTimeZone === currentTimeZone) return;

      const wasShowingToday = useUiStore.getState().selectedDate === currentToday;
      currentToday = nextToday;
      currentTimeZone = nextTimeZone;
      if (wasShowingToday) {
        setSelectedDate(nextToday);
      }
    }

    syncDeviceDate();
    const interval = window.setInterval(syncDeviceDate, 60_000);
    window.addEventListener("focus", syncDeviceDate);
    document.addEventListener("visibilitychange", syncDeviceDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncDeviceDate);
      document.removeEventListener("visibilitychange", syncDeviceDate);
    };
  }, [setSelectedDate]);

  return null;
}

function useNavCounts() {
  const tasks = useAppStore((state) => state.tasks);
  const aiReviewItems = useAppStore((state) => state.aiReviewItems);
  return useMemo(() => {
    const today = localDateKey();
    const dueNow = tasks.filter((task) => task.status !== "done" && task.dueAt && task.dueAt.slice(0, 10) <= today).length;
    return {
      "/tasks": dueNow,
      "/inbox": activeReviewItems(aiReviewItems).length,
    } as Record<string, number>;
  }, [aiReviewItems, tasks]);
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function SidebarLink({ item, active, collapsed, count }: { item: NavItem; active: boolean; collapsed: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-lg text-[13px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-ink" : "text-muted group-hover:text-ink")} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!!count && !collapsed && <span className="text-xs tabular-nums text-subtle">{count}</span>}
      {!!count && collapsed && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
    </Link>
  );
}

function SidebarTimer({ collapsed }: { collapsed: boolean }) {
  const timer = useAppStore((state) => state.timer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useTimerTick();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const active = Boolean(timer.startedAt);

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          className={cn(
            "absolute z-50 w-[340px] rounded-xl border border-line bg-panel p-4 shadow-pop animate-pop-in",
            collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2"
          )}
        >
          <TimerControl plain compact />
        </div>
      )}
      <div
        className={cn(
          "flex h-8 items-center rounded-lg text-[13px] transition-colors",
          active ? "bg-accent/10 text-ink" : "text-muted hover:bg-hover/70 hover:text-ink"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          title={collapsed ? "Timer" : undefined}
          aria-label={open ? "Close timer" : "Open timer"}
          className={cn("flex h-full min-w-0 flex-1 items-center gap-2.5", collapsed ? "justify-center" : "px-2.5")}
        >
          {timer.running ? (
            <span className="relative grid size-4 place-items-center">
              <span className="absolute size-2 animate-ping rounded-full bg-accent/60" />
              <span className="size-2 rounded-full bg-accent" />
            </span>
          ) : (
            <Timer className="size-4 shrink-0" />
          )}
          {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{active ? timer.title || "Focus session" : "Timer"}</span>}
          {!collapsed && active && <span className="tabular-nums text-ink">{compactElapsed(timer.startedAt)}</span>}
        </button>
        {!collapsed && timer.running && (
          <button
            type="button"
            onClick={pauseTimer}
            aria-label="Pause timer"
            className="mr-1 grid size-6 place-items-center rounded-md text-muted hover:bg-panel hover:text-ink"
          >
            <Pause className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const counts = useNavCounts();
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const setCaptureOpen = useUiStore((state) => state.setCaptureOpen);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-paper transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[60px]" : "w-[236px]"
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-4 pr-2.5")}>
        {!collapsed && (
          <Link href="/home" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-bold text-paper">J</span>
            <span className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">Jacob OS</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      <div className={cn("space-y-1 pb-3", collapsed ? "px-2.5" : "px-3")}>
        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          title={collapsed ? "New task (C)" : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg bg-ink text-[13px] font-medium text-paper transition-opacity hover:opacity-90",
            collapsed ? "justify-center" : "px-2.5"
          )}
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">New task</span>}
          {!collapsed && <kbd className="text-[11px] font-medium opacity-60">C</kbd>}
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title={collapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg text-[13px] text-muted transition-colors hover:bg-hover/70 hover:text-ink",
            collapsed ? "justify-center" : "px-2.5"
          )}
        >
          <Search className="size-4 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Search</span>}
          {!collapsed && <kbd className="text-[11px] font-medium text-subtle">⌘K</kbd>}
        </button>
      </div>

      <nav className={cn("flex-1 overflow-y-auto pb-4 no-scrollbar", collapsed ? "px-2.5" : "px-3")}>
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? index} className={cn(index > 0 && "mt-5")}>
            {group.label &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-5 bg-line" />
              ) : (
                <p className="mb-1 px-2.5 text-[11px] font-medium text-subtle">{group.label}</p>
              ))}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} active={isNavActive(pathname, item)} collapsed={collapsed} count={counts[item.href]} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 space-y-0.5 border-t border-line py-3", collapsed ? "px-2.5" : "px-3")}>
        <SidebarTimer collapsed={collapsed} />
        <SidebarLink item={SETTINGS_ITEM} active={isNavActive(pathname, SETTINGS_ITEM)} collapsed={collapsed} />
        <ThemeToggle withLabel={!collapsed} className={cn("w-full", collapsed && "size-8 w-8 mx-auto")} />
      </div>
    </aside>
  );
}

// ─── Phone navigation ─────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { href: "/home", label: "Today", icon: CalendarCheck2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckCircle2, match: ["/task/"] },
] satisfies NavItem[];

const MORE_ITEMS = ALL_NAV_ITEMS.filter((item) => !TAB_ITEMS.some((tab) => tab.href === item.href));

function MobileTimerPill({ onOpen }: { onOpen: () => void }) {
  const timer = useAppStore((state) => state.timer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const startTimer = useAppStore((state) => state.startTimer);
  const stopTimer = useAppStore((state) => state.stopTimer);
  useTimerTick();
  if (!timer.startedAt) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:hidden">
      <div className="flex h-10 items-center gap-1 rounded-full border border-line bg-panel pl-3 pr-1 shadow-pop">
        <button
          type="button"
          onClick={onOpen}
          title="Open timer controls"
          aria-label="Open timer controls"
          className="flex items-center gap-2 pr-1 text-[13px]"
        >
          <span className={cn("size-2 rounded-full", timer.running ? "bg-accent" : "bg-subtle")} />
          <span className="max-w-32 truncate text-muted">{timer.title || "Focus session"}</span>
          <span className="font-medium tabular-nums text-ink">{compactElapsed(timer.startedAt)}</span>
        </button>
        <button
          type="button"
          onClick={() => (timer.running ? pauseTimer() : startTimer({ title: timer.title || "Focus session", responsibilityId: timer.responsibilityId }))}
          aria-label={timer.running ? "Pause timer" : "Resume timer"}
          className="grid size-8 place-items-center rounded-full text-ink hover:bg-hover"
        >
          {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button type="button" onClick={stopTimer} aria-label="Stop timer" className="grid size-8 place-items-center rounded-full text-muted hover:bg-hover">
          <Square className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const counts = useNavCounts();
  const setCaptureOpen = useUiStore((state) => state.setCaptureOpen);
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isNavActive(pathname, item));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <MobileTimerPill onOpen={() => setMoreOpen(true)} />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid h-[3.5rem] grid-cols-5 items-center">
          {TAB_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={isNavActive(pathname, item)} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              aria-label="New task"
              className="grid size-11 place-items-center rounded-full bg-ink text-paper shadow-pop transition-transform active:scale-95"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <TabLink item={TAB_ITEMS[2]} active={isNavActive(pathname, TAB_ITEMS[2])} count={counts["/tasks"]} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            title="Open more menu"
            aria-label="Open more menu"
            className={cn("relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium", moreActive ? "text-ink" : "text-subtle")}
          >
            <LayoutGrid className="size-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />
            More
            {counts["/inbox"] > 0 && <span className="absolute right-[calc(50%-16px)] top-2 size-2 rounded-full bg-accent" />}
          </button>
        </div>
      </nav>

      <Overlay open={moreOpen} onClose={() => setMoreOpen(false)} placement="bottom" label="More">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <p className="text-base font-semibold text-ink">Jacob OS</p>
          <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-hover text-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setPaletteOpen(true);
            }}
            className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-hover px-3 text-sm text-muted"
          >
            <Search className="size-4" />
            Search everything
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-2">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item);
            const count = counts[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors",
                  active ? "border-ink/15 bg-hover text-ink" : "border-line text-muted"
                )}
              >
                <Icon className="size-5" />
                {item.label}
                {!!count && (
                  <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">{count}</span>
                )}
              </Link>
            );
          })}
        </div>
        <div className="mx-4 my-3 rounded-xl border border-line p-4">
          <TimerControl plain compact />
        </div>
        <div className="flex items-center justify-between px-4 pb-4">
          <ThemeToggle withLabel />
        </div>
      </Overlay>
    </>
  );
}

function TabLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active ? "text-ink" : "text-subtle")}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
      {!!count && (
        <span className="absolute left-[calc(50%+6px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-now px-1 text-[10px] font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isPublicRoute = pathname.startsWith("/login");
  // Home and Calendar own their scroll areas and fill the viewport
  const isFullBleed = pathname.startsWith("/home") || pathname.startsWith("/calendar");

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // storage unavailable — keep the default
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (isPublicRoute) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="min-h-dvh">
      <DeviceDateSync />
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main
        className={cn(
          "transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[60px]" : "lg:pl-[236px]",
          isFullBleed
            ? "h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] overflow-hidden lg:h-dvh"
            : "min-h-dvh"
        )}
      >
        {children}
      </main>
      <MobileNav />
      <CommandPalette />
      <CaptureDialog />
    </div>
  );
}
