"use client";

import { Calendar, LogOut, Mail, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTheme } from "@/components/layout/theme-toggle";
import { Button, ButtonLink, Card, Page, PageHeader, Segmented, inputClass } from "@/components/ui/primitives";
import { useAppStore } from "@/lib/stores/app-store";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-ink">{title}</h2>
      <Card className="divide-y divide-line">{children}</Card>
    </section>
  );
}

function SettingRow({
  title,
  description,
  control,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm text-ink">{title}</p>
          {description && <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>}
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

function SyncResult({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={cn("mt-3 rounded-lg px-3 py-2 text-xs", ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
      {children}
    </p>
  );
}

const code = "rounded bg-hover px-1 py-0.5 font-mono text-[11px] text-ink";

// ─── SettingsWorkspace ────────────────────────────────────────────────────────

export function SettingsWorkspace() {
  const gymWeightUnit = useAppStore((s) => s.gymWeightUnit);
  const setGymWeightUnit = useAppStore((s) => s.setGymWeightUnit);
  const foodTargets = useAppStore((s) => s.foodTargets);
  const setFoodTargets = useAppStore((s) => s.setFoodTargets);
  const responsibilities = useAppStore((s) => s.responsibilities);
  const activeLabelCount = responsibilities.filter((item) => !item.archivedAt).length;
  const lastGoogleSync = useAppStore((s) => s.lastGoogleSync);
  const syncGoogleCalendar = useAppStore((s) => s.syncGoogleCalendar);
  const lastEmailSync = useAppStore((s) => s.lastEmailSync);
  const syncGmail = useAppStore((s) => s.syncGmail);
  const { theme, toggleTheme } = useTheme();

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
    <Page width="narrow">
      <PageHeader title="Settings" />

      <SettingsSection title="Appearance">
        <SettingRow
          title="Theme"
          description="Follows your device until you pick one."
          control={
            <Segmented
              size="sm"
              label="Theme"
              value={theme}
              onChange={(next) => { if (next !== theme) toggleTheme(); }}
              options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Tracking">
        <SettingRow
          title="Weight unit"
          description="Used in all workout logging."
          control={
            <Segmented
              size="sm"
              label="Weight unit"
              value={gymWeightUnit}
              onChange={setGymWeightUnit}
              options={[{ value: "lbs", label: "lbs" }, { value: "kg", label: "kg" }]}
            />
          }
        />
        <SettingRow
          title="Daily protein goal"
          description="Shown on Food and in the weekly review."
          control={
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={50}
                max={400}
                value={foodTargets.protein}
                onChange={(e) => setFoodTargets({ protein: Math.max(50, parseInt(e.target.value) || 160) })}
                aria-label="Daily protein goal"
                className={cn(inputClass, "h-8 w-20 text-right tabular-nums")}
              />
              <span className="w-6 text-xs text-muted">g</span>
            </span>
          }
        />
        <SettingRow
          title="Daily calorie goal"
          description="Shown on Food."
          control={
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1000}
                max={6000}
                step={50}
                value={foodTargets.calories}
                onChange={(e) => setFoodTargets({ calories: Math.max(1000, parseInt(e.target.value) || 2500) })}
                aria-label="Daily calorie goal"
                className={cn(inputClass, "h-8 w-20 text-right tabular-nums")}
              />
              <span className="w-6 text-xs text-muted">cal</span>
            </span>
          }
        />
        <SettingRow
          title="Labels"
          description={`${activeLabelCount} labels color everything in the app.`}
          control={<ButtonLink href="/responsibilities" size="sm">Manage labels</ButtonLink>}
        />
      </SettingsSection>

      <SettingsSection title="Connections">
        <SettingRow
          title={<span className="flex items-center gap-2"><Calendar className="size-4 text-muted" />Google Calendar</span>}
          description={
            <>
              Read-only import of the last 30 and next 90 days. Configure <span className={code}>GOOGLE_CALENDAR_SOURCES_JSON</span> or{" "}
              <span className={code}>GOOGLE_REFRESH_TOKEN_*</span>.
              {lastGoogleSync && ` Last synced ${new Date(lastGoogleSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}
            </>
          }
          control={
            <Button size="sm" onClick={handleGoogleSync} disabled={syncing}>
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          }
        >
          {syncResult && (
            <SyncResult ok={syncResult.errors.length === 0}>
              {syncResult.errors.length === 0
                ? `Synced ${syncResult.synced} events.`
                : `Synced ${syncResult.synced} events · ${syncResult.errors.length} error(s): ${syncResult.errors[0]}`}
            </SyncResult>
          )}
        </SettingRow>
        <SettingRow
          title={<span className="flex items-center gap-2"><Mail className="size-4 text-muted" />Gmail</span>}
          description={
            <>
              Turns likely actions in recent email into Inbox suggestions. Needs <span className={code}>GMAIL_SOURCES_JSON</span> or{" "}
              <span className={code}>GMAIL_REFRESH_TOKEN_*</span> plus <span className={code}>OPENAI_API_KEY</span>.
              {lastEmailSync && ` Last checked ${new Date(lastEmailSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}
            </>
          }
          control={
            <Button size="sm" onClick={handleEmailSync} disabled={emailSyncing}>
              <RefreshCw className={cn("size-3.5", emailSyncing && "animate-spin")} />
              {emailSyncing ? "Checking…" : "Check email"}
            </Button>
          }
        >
          {emailSyncResult && (
            <SyncResult ok={emailSyncResult.errors.length === 0}>
              {emailSyncResult.errors.length === 0
                ? `Processed ${emailSyncResult.processed} emails · ${emailSyncResult.proposed} review item(s).`
                : `Processed ${emailSyncResult.processed} emails · ${emailSyncResult.errors.length} error(s): ${emailSyncResult.errors[0]}`}
            </SyncResult>
          )}
          {emailSyncResult && emailSyncResult.proposed > 0 && (
            <ButtonLink href="/inbox" size="sm" className="mt-3">Review suggestions</ButtonLink>
          )}
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingRow title="Tasks, notes, events" control={<span className="text-xs text-muted">Supabase</span>} />
        <SettingRow title="Habits, gym, goals, food, ideas" control={<span className="text-xs text-muted">Supabase + local cache</span>} />
        <SettingRow
          title="Sign out"
          description="You'll need a magic link to sign back in on this device."
          control={
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (hasSupabaseEnv()) {
                  await createBrowserSupabaseClient().auth.signOut();
                }
                window.location.href = "/login";
              }}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          }
        />
      </SettingsSection>
    </Page>
  );
}
