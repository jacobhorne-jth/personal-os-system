"use client";

import Link from "next/link";
import { BarChart3, Calendar, Dumbbell, Flame, LogOut, RefreshCw, Settings, Tags } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase/browser";
import { responsibilityTone } from "@/lib/theme";
import { cn } from "@/lib/utils";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getThisWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function getWeekBounds(): { start: Date; end: Date } {
  const dates = getThisWeekDates();
  const start = new Date(dates[0] + "T00:00:00");
  const end = new Date(dates[6] + "T23:59:59");
  return { start, end };
}

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted opacity-60">{sub}</p>}
    </div>
  );
}

// ─── ProgressWorkspace ────────────────────────────────────────────────────────

export function ProgressWorkspace() {
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const gymSessions = useAppStore((s) => s.gymSessions);
  const foodEntries = useAppStore((s) => s.foodEntries);
  const calendarItems = useAppStore((s) => s.calendarItems);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const goals = useAppStore((s) => s.goals);

  const weekDates = getThisWeekDates();
  const { start: weekStart, end: weekEnd } = getWeekBounds();
  const today = new Date().toISOString().slice(0, 10);

  // Tasks
  const openTasks = tasks.filter((t) => t.status !== "done");

  // Habits this week
  const habitRate = (() => {
    if (habits.length === 0) return null;
    const dailyHabits = habits.filter((h) => h.type === "daily" || h.type === "avoid");
    if (dailyHabits.length === 0) return null;
    const pastDates = weekDates.filter((d) => d <= today);
    let totalPossible = 0;
    let totalHit = 0;
    for (const habit of dailyHabits) {
      for (const date of pastDates) {
        totalPossible++;
        const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
        const value = log?.value ?? 0;
        const hit = habit.type === "avoid" ? value === 0 : value >= habit.target;
        if (hit) totalHit++;
      }
    }
    return totalPossible > 0 ? Math.round((totalHit / totalPossible) * 100) : null;
  })();

  // Gym sessions this week
  const gymSessionsThisWeek = gymSessions.filter((s) => {
    return weekDates.includes(s.date);
  }).length;

  // Food protein avg this week
  const proteinAvg = (() => {
    const dayTotals = weekDates
      .filter((d) => d <= today)
      .map((d) => {
        const dayEntries = foodEntries.filter((e) => e.date === d);
        return dayEntries.reduce((sum, e) => sum + e.protein, 0);
      })
      .filter((t) => t > 0);
    if (dayTotals.length === 0) return null;
    return Math.round(dayTotals.reduce((s, t) => s + t, 0) / dayTotals.length);
  })();

  // Time logged this week
  const hoursLogged = calendarItems
    .filter((ci) => {
      if (ci.type !== "time_log") return false;
      const s = new Date(ci.startsAt);
      return s >= weekStart && s <= weekEnd;
    })
    .reduce((sum, ci) => {
      const ms = new Date(ci.endsAt).getTime() - new Date(ci.startsAt).getTime();
      return sum + ms / 3_600_000;
    }, 0);

  // Active goals
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-4 rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Progress</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">This week</h1>
          <p className="mt-2 text-sm text-muted">
            {weekDates[0]} → {weekDates[6]}
          </p>
        </div>
        <span className="ml-auto grid size-11 place-items-center rounded-lg bg-line text-blue">
          <BarChart3 className="size-5" />
        </span>
      </header>

      {/* Key metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={openTasks.length} label="open tasks" />
        <StatCard
          value={habitRate !== null ? `${habitRate}%` : "—"}
          label="habit rate"
          sub={habits.length > 0 ? `${habits.length} tracked habits` : "No habits set up"}
        />
        <StatCard
          value={gymSessionsThisWeek}
          label="gym sessions"
          sub="this week"
        />
        <StatCard
          value={proteinAvg !== null ? `${proteinAvg}g` : "—"}
          label="protein avg"
          sub={proteinAvg !== null ? "per logged day" : "No food logged"}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Tasks by responsibility */}
          <div className="rounded-xl border border-line bg-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-line/40 px-4 py-3">
              <Tags className="size-4 text-muted" />
              <p className="text-sm font-medium text-ink">Open tasks by responsibility</p>
            </div>
            <div className="divide-y divide-line">
              {responsibilities.map((r) => {
                const count = openTasks.filter((t) => t.responsibilityId === r.id).length;
                const tone = responsibilityTone[r.color];
                return (
                  <Link
                    key={r.id}
                    href={`/r/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-line"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                    <span className="flex-1 text-sm text-ink">{r.name}</span>
                    <div className="flex w-[140px] items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, count * 10)}%`,
                            backgroundColor: tone.hex,
                          }}
                        />
                      </div>
                      <span className="w-5 text-right text-xs text-muted">{count}</span>
                    </div>
                  </Link>
                );
              })}
              {openTasks.filter((t) => !t.responsibilityId).length > 0 && (
                <Link href="/inbox" className="flex items-center gap-3 px-4 py-3 transition hover:bg-line">
                  <span className="size-2.5 shrink-0 rounded-full bg-[#5f6368]" />
                  <span className="flex-1 text-sm text-muted">Unassigned</span>
                  <span className="text-xs text-muted">{openTasks.filter((t) => !t.responsibilityId).length}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Habits this week */}
          {habits.length > 0 && (
            <div className="rounded-xl border border-line bg-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line bg-line/40 px-4 py-3">
                <Flame className="size-4 text-orange-400" />
                <p className="text-sm font-medium text-ink">Habits this week</p>
              </div>
              <div className="divide-y divide-line">
                {habits.map((habit) => {
                  const responsibility = responsibilities.find((r) => r.id === habit.responsibilityId);
                  const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
                  const hitCount = weekDates.filter((date) => {
                    const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
                    const value = log?.value ?? 0;
                    if (habit.type === "avoid") return value === 0 && date <= today;
                    return value >= habit.target && date <= today;
                  }).length;
                  const possibleDays = weekDates.filter((d) => d <= today).length;

                  return (
                    <div key={habit.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                      <span className="flex-1 text-sm text-ink">{habit.title}</span>
                      <div className="flex items-center gap-2">
                        <div className="grid grid-cols-7 gap-1">
                          {weekDates.map((date) => {
                            const log = habitLogs.find((l) => l.habitId === habit.id && l.date === date);
                            const value = log?.value ?? 0;
                            const isFuture = date > today;
                            const hit = habit.type === "avoid" ? value === 0 : value >= habit.target;
                            return (
                              <span
                                key={date}
                                className={cn(
                                  "size-4 rounded-sm",
                                  isFuture ? "bg-line opacity-30" : hit ? "bg-mint" : "bg-red-500/30"
                                )}
                              />
                            );
                          })}
                        </div>
                        <span className="w-10 text-right text-xs text-muted">{hitCount}/{possibleDays}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Time logged */}
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="text-xs font-medium text-muted">Time logged this week</p>
            <p className="mt-2 text-4xl font-semibold text-ink">{hoursLogged.toFixed(1)}h</p>
            <div className="mt-3 space-y-2">
              {responsibilities.map((r) => {
                const hours = calendarItems
                  .filter((ci) => {
                    if (ci.type !== "time_log" || ci.responsibilityId !== r.id) return false;
                    const s = new Date(ci.startsAt);
                    return s >= weekStart && s <= weekEnd;
                  })
                  .reduce((sum, ci) => {
                    const ms = new Date(ci.endsAt).getTime() - new Date(ci.startsAt).getTime();
                    return sum + ms / 3_600_000;
                  }, 0);
                if (hours === 0) return null;
                const tone = responsibilityTone[r.color];
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tone.hex }} />
                    <span className="flex-1 text-muted">{r.name}</span>
                    <span className="font-medium text-ink">{hours.toFixed(1)}h</span>
                  </div>
                );
              }).filter(Boolean)}
              {hoursLogged === 0 && (
                <p className="text-xs text-muted opacity-60">No time logged yet this week.</p>
              )}
            </div>
          </div>

          {/* Active goals snapshot */}
          {activeGoals.length > 0 && (
            <div className="rounded-xl border border-line bg-panel overflow-hidden">
              <div className="border-b border-line bg-line/40 px-4 py-3">
                <p className="text-xs font-medium text-muted">Active goals</p>
              </div>
              <div className="divide-y divide-line">
                {activeGoals.slice(0, 4).map((goal) => {
                  const responsibility = responsibilities.find((r) => r.id === goal.responsibilityId);
                  const tone = responsibility ? responsibilityTone[responsibility.color] : responsibilityTone.graphite;
                  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
                  return (
                    <div key={goal.id} className="px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-ink">{goal.title}</p>
                        <span className="shrink-0 text-xs font-medium text-ink">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: tone.hex }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2">
                <Link href="/goals" className="text-xs text-blue hover:underline">View all goals →</Link>
              </div>
            </div>
          )}

          {/* Gym summary */}
          {gymSessions.length > 0 && (
            <div className="rounded-xl border border-line bg-panel p-4">
              <div className="mb-3 flex items-center gap-2">
                <Dumbbell className="size-4 text-muted" />
                <p className="text-xs font-medium text-muted">Gym this week</p>
              </div>
              <p className="text-4xl font-semibold text-ink">{gymSessionsThisWeek}</p>
              <p className="mt-1 text-xs text-muted">sessions logged</p>
              <Link href="/gym" className="mt-3 block text-xs text-blue hover:underline">Go to gym →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SettingsWorkspace ────────────────────────────────────────────────────────

export function SettingsWorkspace() {
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);
  const setGymWeightUnit = useAppStore((s) => s.setGymWeightUnit);
  const foodTargets = useAppStore((s) => s.foodTargets);
  const setFoodTargets = useAppStore((s) => s.setFoodTargets);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const lastGoogleSync = useAppStore((s) => s.lastGoogleSync);
  const syncGoogleCalendar = useAppStore((s) => s.syncGoogleCalendar);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);

  async function handleGoogleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncGoogleCalendar();
      setSyncResult(result);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-4 rounded-xl border border-line bg-panel p-5 shadow-glow">
        <div>
          <p className="text-sm text-muted">Settings</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Preferences</h1>
        </div>
        <span className="ml-auto grid size-11 place-items-center rounded-lg bg-line text-blue">
          <Settings className="size-5" />
        </span>
      </header>

      {/* Gym */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3">
          <p className="text-sm font-medium text-ink">Gym</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Weight unit</p>
              <p className="text-xs text-muted">Used in all workout logging</p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-line text-sm font-medium">
              {(["lbs", "kg"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setGymWeightUnit(u)}
                  className={cn(
                    "px-4 py-1.5 transition",
                    gymWeightUnit === u ? "bg-blue text-white" : "bg-paper text-muted hover:text-ink"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Food */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3">
          <p className="text-sm font-medium text-ink">Food targets</p>
        </div>
        <div className="divide-y divide-line">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-ink">Daily protein goal</p>
              <p className="text-xs text-muted">Shown on the food page and progress</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={50}
                max={400}
                value={foodTargets.protein}
                onChange={(e) => setFoodTargets({ protein: Math.max(50, parseInt(e.target.value) || 160) })}
                className="w-20 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-right text-sm text-ink outline-none focus:border-blue"
              />
              <span className="text-xs text-muted">g</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-ink">Daily calorie goal</p>
              <p className="text-xs text-muted">Shown as the ring on the food page</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1000}
                max={6000}
                step={50}
                value={foodTargets.calories}
                onChange={(e) => setFoodTargets({ calories: Math.max(1000, parseInt(e.target.value) || 2500) })}
                className="w-24 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-right text-sm text-ink outline-none focus:border-blue"
              />
              <span className="text-xs text-muted">cal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsibilities */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3">
          <p className="text-sm font-medium text-ink">Responsibilities</p>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-muted">{responsibilities.length} responsibilities configured</p>
          <Link
            href="/responsibilities"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-line"
          >
            <Tags className="size-4" />
            Manage responsibilities
          </Link>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3 flex items-center gap-2">
          <Calendar className="size-4 text-muted" />
          <p className="text-sm font-medium text-ink">Google Calendar</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted">
            Pulls events from your personal and school Google accounts into the calendar (read-only, last 30 days + next 90).
            Requires <span className="font-mono text-ink">GOOGLE_REFRESH_TOKEN_PERSONAL</span> and/or{" "}
            <span className="font-mono text-ink">GOOGLE_REFRESH_TOKEN_SCHOOL</span> in{" "}
            <span className="font-mono text-ink">.env.local</span>.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoogleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-line disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            {lastGoogleSync && (
              <span className="text-xs text-muted">
                Last synced {new Date(lastGoogleSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          {syncResult && (
            <div className={cn("rounded-lg border px-3 py-2 text-xs", syncResult.errors.length > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400")}>
              {syncResult.errors.length === 0
                ? `✓ Synced ${syncResult.synced} events`
                : `Synced ${syncResult.synced} events · ${syncResult.errors.length} error(s): ${syncResult.errors[0]}`}
            </div>
          )}
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3">
          <p className="text-sm font-medium text-ink">Data</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Tasks, notes, events, lists</span>
            <span className="text-ink font-medium">Supabase</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Habits, gym, goals, food, ideas</span>
            <span className="text-ink font-medium">Supabase + local cache</span>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-line bg-panel overflow-hidden">
        <div className="border-b border-line bg-line/40 px-5 py-3">
          <p className="text-sm font-medium text-ink">Account</p>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={async () => {
              if (hasSupabaseEnv()) {
                await createBrowserSupabaseClient().auth.signOut();
              }
              window.location.href = "/login";
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:border-red-500/40 hover:text-red-400"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
