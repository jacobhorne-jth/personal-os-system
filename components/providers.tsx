"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/stores/app-store";

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_USER_ID ?? "";

const GOOGLE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function DataLoader() {
  const loadFromSupabase = useAppStore((s) => s.loadFromSupabase);

  useEffect(() => {
    if (!OWNER_ID) return;
    loadFromSupabase(OWNER_ID).then(() => {
      const { lastGoogleSync, syncGoogleCalendar } = useAppStore.getState();
      const stale = !lastGoogleSync || Date.now() - new Date(lastGoogleSync).getTime() > GOOGLE_SYNC_INTERVAL_MS;
      if (stale) {
        syncGoogleCalendar().catch(() => {
          // Google sync is best-effort on load; the Settings page surfaces errors
        });
      }
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
