"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Command,
  Dumbbell,
  FileText,
  Flag,
  Home,
  Inbox,
  Lightbulb,
  ListChecks,
  PlusCircle,
  Repeat2,
  Settings,
  Tags,
  ClipboardCheck,
  Clock3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TimerControl } from "@/components/time/timer-control";
import { useAppStore } from "@/lib/stores/app-store";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/responsibilities", label: "Responsibilities", icon: Tags },
  { href: "/goals", label: "Goals", icon: Flag },
  { href: "/habits", label: "Habits", icon: Repeat2 },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/food", label: "Food", icon: Apple },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/weekly-review", label: "Weekly Review", icon: ClipboardCheck },
  { href: "/settings", label: "Settings", icon: Settings }
];

const mobileNavItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/responsibilities", label: "Projects", icon: Tags },
];


function compactElapsed(startedAt?: string) {
  if (!startedAt) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function TimerDock() {
  const timer = useAppStore((state) => state.timer);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!timer.running) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer.running]);

  const elapsed = compactElapsed(timer.startedAt);
  const title = timer.title?.trim() || "Timer";

  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-40 lg:bottom-auto lg:right-6 lg:top-4">
      {open && (
        <div className="mb-2 w-[min(calc(100vw-1.5rem),420px)] rounded-xl border border-line bg-panel p-3 shadow-lift lg:mt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-muted">{title}</p>
            <button
              onClick={() => setOpen(false)}
              title="Close timer"
              className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-line hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <TimerControl plain compact />
        </div>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        title="Open timer"
        className={cn(
          "ml-auto flex h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-line bg-paper/95 px-3 text-sm text-ink shadow-lift backdrop-blur transition hover:border-muted",
          timer.running && "border-blue/40"
        )}
      >
        <span className={cn("grid size-7 place-items-center rounded-full bg-line text-muted", timer.running && "bg-blue text-white")}>
          <Clock3 className="size-4" />
        </span>
        <span className="min-w-14 text-left font-medium tabular-nums">{timer.startedAt ? elapsed : "Timer"}</span>
        <span className="hidden max-w-32 truncate text-xs text-muted sm:block">{title}</span>
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarLockedClosed, setSidebarLockedClosed] = useState(false);
  const isPublicRoute = pathname.startsWith("/login");

  const isHomeSurface = pathname.startsWith("/home");
  const isCalendarSurface = pathname.startsWith("/calendar");

  if (isPublicRoute) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="min-h-dvh">
      <aside
        onMouseEnter={() => {
          if (!sidebarLockedClosed) setSidebarOpen(true);
        }}
        onMouseLeave={() => {
          setSidebarOpen(false);
          setSidebarLockedClosed(false);
        }}
        onFocus={() => {
          if (!sidebarLockedClosed) setSidebarOpen(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setSidebarOpen(false);
        }}
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-line bg-paper transition-[width] duration-200 ease-out lg:flex lg:flex-col lg:py-4",
          sidebarOpen ? "w-[248px]" : "w-[56px]"
        )}
      >
        <Link
          href="/home"
          onClick={() => {
            setSidebarOpen(false);
            setSidebarLockedClosed(true);
          }}
          className={cn(
            "mx-2 mb-5 flex h-12 items-center overflow-hidden rounded-xl bg-blue text-white shadow-lift",
            sidebarOpen ? "gap-3 px-3" : "justify-center px-0"
          )}
        >
          <Command className="size-5 shrink-0" />
          <span className={cn("overflow-hidden whitespace-nowrap text-sm font-semibold transition-[opacity,width] duration-150", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>Jacob OS</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => {
                  setSidebarOpen(false);
                  setSidebarLockedClosed(true);
                }}
                className={cn(
                  "relative flex h-11 items-center overflow-hidden rounded-xl text-sm text-muted transition duration-200 hover:bg-panel hover:text-ink",
                  sidebarOpen ? "gap-3 px-3" : "justify-center px-0",
                  active && "bg-panel text-ink shadow-glow"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn("overflow-hidden whitespace-nowrap transition-[opacity,width] duration-150", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>{item.label}</span>
                {active && sidebarOpen && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-blue" />}
              </Link>
            );
          })}
        </nav>
        <div className={cn("mx-2 mt-4 flex", sidebarOpen ? "justify-start px-1" : "justify-center")}>
          <ThemeToggle />
        </div>
        <Link
          href="/capture"
          onClick={() => {
            setSidebarOpen(false);
            setSidebarLockedClosed(true);
          }}
          className={cn(
            "mx-2 mt-4 flex h-11 items-center overflow-hidden rounded-xl bg-blue text-sm font-medium text-white shadow-lift transition hover:brightness-110",
            sidebarOpen ? "justify-center gap-2 px-3" : "justify-center px-0"
          )}
        >
          <PlusCircle className="size-4" />
          <span className={cn("overflow-hidden whitespace-nowrap transition-[opacity,width] duration-150", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>Capture</span>
        </Link>
      </aside>

      <main
        className={cn(
          isHomeSurface
            ? "ml-0 h-screen max-w-none overflow-hidden bg-paper lg:ml-[56px]"
            : isCalendarSurface
              ? "h-screen max-w-none overflow-hidden bg-paper lg:ml-[56px]"
            : "mx-auto min-h-dvh w-full max-w-[1700px] px-4 pb-24 pt-4 sm:px-6 lg:pb-6 lg:pl-[96px] lg:pr-8 lg:pt-5"
        )}
      >
        {!pathname.startsWith("/home") && !isCalendarSurface && !pathname.startsWith("/todos") && (
          <div className="sticky top-0 z-20 mb-4 hidden items-center justify-between gap-3 border-b border-line bg-paper/95 py-3 backdrop-blur lg:flex">
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <Link href="/capture" className="rounded-full bg-blue px-5 py-2.5 text-sm font-medium text-white shadow-lift transition hover:brightness-110">
                Capture
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>

      <TimerDock />
      <ThemeToggle className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 z-30 lg:hidden" />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_48px_rgba(15,23,42,0.18)] backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-4 items-end">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted transition",
                  active && "text-ink"
                )}
              >
                <span className={cn("grid size-9 place-items-center rounded-2xl", active && "bg-blue text-white shadow-lift")}>
                  <Icon className="size-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
