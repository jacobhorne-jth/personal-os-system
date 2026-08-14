"use client";

import Link from "next/link";
import { Calendar, LogOut, Mail, RefreshCw, Settings, Tags } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// ─── SettingsWorkspace ────────────────────────────────────────────────────────

export function SettingsWorkspace() {
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);
  const setGymWeightUnit = useAppStore((s) => s.setGymWeightUnit);
  const foodTargets = useAppStore((s) => s.foodTargets);
  const setFoodTargets = useAppStore((s) => s.setFoodTargets);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const lastGoogleSync = useAppStore((s) => s.lastGoogleSync);
  const syncGoogleCalendar = useAppStore((s) => s.syncGoogleCalendar);
  const lastEmailSync = useAppStore((s) => s.lastEmailSync);
  const syncGmail = useAppStore((s) => s.syncGmail);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [emailSyncing, setEmailSyncing] = useState(false);
  const [emailSyncResult, setEmailSyncResult] = useState<{ proposed: number; processed: number; errors: string[] } | null>(null);

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

  async function handleEmailSync() {
    setEmailSyncing(true);
    setEmailSyncResult(null);
    try {
      const result = await syncGmail();
      setEmailSyncResult(result);
    } finally {
      setEmailSyncing(false);
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
              <p className="text-xs text-muted">Shown on the food page and weekly review</p>
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
            Pulls events from configured Google calendars into the calendar (read-only, last 30 days + next 90).
            Supports <span className="font-mono text-ink">GOOGLE_CALENDAR_SOURCES_JSON</span> or{" "}
            <span className="font-mono text-ink">GOOGLE_REFRESH_TOKEN_PERSONAL/SCHOOL/WORK</span> in{" "}
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

      {/* Gmail */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex items-center gap-2 border-b border-line bg-line/40 px-5 py-3">
          <Mail className="size-4 text-muted" />
          <p className="text-sm font-medium text-ink">Gmail</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs text-muted">
            Reads recent inbox emails, skips obvious noise, and sends likely actions to Review as proposed tasks or events.
            Requires <span className="font-mono text-ink">GMAIL_SOURCES_JSON</span> or{" "}
            <span className="font-mono text-ink">GMAIL_REFRESH_TOKEN_PERSONAL/SCHOOL/WORK</span> plus{" "}
            <span className="font-mono text-ink">OPENAI_API_KEY</span>.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEmailSync}
              disabled={emailSyncing}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-line disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", emailSyncing && "animate-spin")} />
              {emailSyncing ? "Checking…" : "Check email"}
            </button>
            {lastEmailSync && (
              <span className="text-xs text-muted">
                Last checked {new Date(lastEmailSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          {emailSyncResult && (
            <div className={cn("rounded-lg border px-3 py-2 text-xs", emailSyncResult.errors.length > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400")}>
              {emailSyncResult.errors.length === 0
                ? `Processed ${emailSyncResult.processed} emails · ${emailSyncResult.proposed} review item(s)`
                : `Processed ${emailSyncResult.processed} emails · ${emailSyncResult.errors.length} error(s): ${emailSyncResult.errors[0]}`}
            </div>
          )}
          {emailSyncResult && emailSyncResult.proposed > 0 && (
            <Link href="/inbox" className="inline-flex rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:bg-line">
              Review proposed actions
            </Link>
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
            <span className="text-muted">Tasks, notes, events</span>
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
