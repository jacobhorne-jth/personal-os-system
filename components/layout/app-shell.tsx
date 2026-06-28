"use client";

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
  PlusCircle,
  Repeat2,
  Settings,
  Tags
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/layout/global-search";

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
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname.startsWith("/login");
  const isHomeSurface = pathname.startsWith("/home");
  const isCalendarSurface = pathname.startsWith("/calendar");

  if (isPublicRoute) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="min-h-dvh">
      {!isCalendarSurface && <aside className="fixed left-0 top-0 hidden h-screen w-[248px] border-r border-line bg-paper lg:flex lg:flex-col lg:py-4">
        <Link href="/home" className="mx-4 mb-5 flex h-11 items-center gap-3 rounded-lg bg-blue px-3 text-white">
          <Command className="size-5 shrink-0" />
          <span className="text-sm font-semibold">Jacob OS</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted transition duration-200 hover:bg-line hover:text-ink",
                  active && "bg-line text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {active && <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-blue" />}
              </Link>
            );
          })}
        </nav>
        <Link href="/capture" className="mx-4 mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-blue text-sm font-medium text-white transition hover:brightness-110">
          <PlusCircle className="size-4" />
          Quick add
        </Link>
      </aside>}

      <main
        className={cn(
          isHomeSurface
            ? "ml-0 h-screen max-w-none overflow-hidden bg-[#1f1f1f] px-4 pb-0 pt-4 sm:px-6 lg:ml-[248px] lg:pl-6 lg:pr-8"
            : isCalendarSurface
              ? "mx-auto min-h-dvh w-full max-w-none p-0"
              : "mx-auto min-h-dvh w-full max-w-[1700px] px-4 pb-24 pt-4 sm:px-6 lg:pb-4 lg:pl-[272px] lg:pr-8"
        )}
      >
        {!pathname.startsWith("/home") && !isCalendarSurface && !pathname.startsWith("/todos") && (
          <div className="sticky top-0 z-20 mb-4 hidden items-center justify-between gap-3 border-b border-line bg-paper/95 py-3 backdrop-blur lg:flex">
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <Link href="/capture" className="rounded-full px-3 py-2 text-sm text-muted transition hover:bg-line hover:text-ink">
                Capture
              </Link>
              <Link href="/capture" className="rounded-full bg-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
                Quick add
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>

      {!isCalendarSurface && <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_48px_rgba(0,0,0,0.32)] backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 items-end">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted transition",
                  active && "text-ink"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl",
                    active && "bg-blue text-white shadow-lift"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>}
    </div>
  );
}
