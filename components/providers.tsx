"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";
import { createBrowserSupabaseClient, hasSupabaseEnv } from "@/lib/supabase/browser";

const GOOGLE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function DataLoader() {
  const loadFromSupabase = useAppStore((s) => s.loadFromSupabase);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Middleware redirects unauthenticated visitors to /login,
      // so no user here just means we're on a public page.
      if (!user) return;
      loadFromSupabase(user.id).then(() => {
        const { lastGoogleSync, syncGoogleCalendar } = useAppStore.getState();
        const stale = !lastGoogleSync || Date.now() - new Date(lastGoogleSync).getTime() > GOOGLE_SYNC_INTERVAL_MS;
        if (stale) {
          syncGoogleCalendar().catch(() => {
            // Google sync is best-effort on load; the Settings page surfaces errors
          });
        }
      });
    });
  }, [loadFromSupabase]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DataLoader />
      {children}
    </QueryClientProvider>
  );
}
